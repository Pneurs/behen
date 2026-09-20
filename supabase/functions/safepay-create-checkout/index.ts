// Creates a SafePay hosted-checkout session for buying credits.
// Authenticated edge function: requires the caller's JWT.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { z } from 'npm:zod'

const BodySchema = z.object({
  credits: z.number().int().positive(),
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

function serviceClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
}

function baseUrls(env: string) {
  if (env === 'production') {
    return {
      api: 'https://api.getsafepay.com',
      checkout: 'https://checkout.getsafepay.com',
    }
  }
  return {
    api: 'https://sandbox.api.getsafepay.com',
    checkout: 'https://sandbox.checkout.getsafepay.com',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const secretKey = Deno.env.get('SAFEPAY_SECRET_KEY')
    const merchantApiKey = Deno.env.get('SAFEPAY_MERCHANT_API_KEY')
    const environment = Deno.env.get('SAFEPAY_ENVIRONMENT') || 'sandbox'

    if (!secretKey || !merchantApiKey) {
      return json({ error: 'Payment gateway is not configured yet. Please try the manual payment option.' }, 503)
    }

    // Authenticate the caller.
    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace(/^Bearer\s+/i, '')
    if (!token) {
      return json({ error: 'Not authenticated' }, 401)
    }
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )
    const { data: userData, error: userError } = await supabase.auth.getUser(token)
    if (userError || !userData?.user) {
      return json({ error: 'Session expired. Please sign in again.' }, 401)
    }
    const user = userData.user

    // Validate input.
    const raw = await req.json().catch(() => null)
    const parsed = BodySchema.safeParse(raw)
    if (!parsed.success) {
      return json({ error: 'Invalid request' }, 400)
    }

    // Never trust client prices — re-read the package from app_settings.
    const svc = serviceClient()
    const { data: setting } = await svc
      .from('app_settings')
      .select('value')
      .eq('key', 'credit_packages')
      .single()
    const packages = Array.isArray(setting?.value) ? setting.value : []
    const pkg = packages.find((p: { credits: number }) => Number(p.credits) === parsed.data.credits)
    if (!pkg) {
      return json({ error: 'That package is no longer available. Please refresh and try again.' }, 400)
    }
    const amountPaisa = Math.round(Number(pkg.price) * 100)

    // Record the pending purchase first.
    const { data: purchase, error: insertError } = await svc
      .from('credit_purchases')
      .insert({
        user_id: user.id,
        credits: Number(pkg.credits),
        amount_pkr: Number(pkg.price),
        status: 'pending',
        provider: 'safepay',
      })
      .select('id')
      .single()
    if (insertError || !purchase) {
      console.error('insert purchase failed', insertError)
      return json({ error: 'Could not start the payment. Please try again.' }, 500)
    }

    const { api, checkout } = baseUrls(environment)
    const authHeaders = {
      'Content-Type': 'application/json',
      'X-SFPY-MERCHANT-SECRET': secretKey,
    }

    // 1) Create the payment session (tracker).
    const sessionRes = await fetch(`${api}/order/payments/v3/`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        merchant_api_key: merchantApiKey,
        intent: 'CYBERSOURCE',
        mode: 'payment',
        currency: 'PKR',
        amount: amountPaisa,
        metadata: {
          purchase_id: purchase.id,
          user_id: user.id,
          credits: Number(pkg.credits),
        },
      }),
    })
    const sessionJson = await sessionRes.json().catch(() => null)
    const tracker = sessionJson?.data?.tracker?.token
    if (!sessionRes.ok || !tracker) {
      console.error('safepay session failed', sessionRes.status, JSON.stringify(sessionJson))
      await svc.from('credit_purchases').update({ status: 'failed', admin_notes: 'SafePay session creation failed' }).eq('id', purchase.id)
      return json({ error: 'Payment gateway error. Please try again.' }, 502)
    }

    await svc.from('credit_purchases').update({ safepay_tracker: tracker }).eq('id', purchase.id)

    // 2) Create the short-lived authentication token.
    const passportRes = await fetch(`${api}/client/passport/v1/token`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({}),
    })
    const passportJson = await passportRes.json().catch(() => null)
    const beacon = typeof passportJson?.data === 'string' ? passportJson.data : null
    if (!passportRes.ok || !beacon) {
      console.error('safepay passport failed', passportRes.status, JSON.stringify(passportJson))
      await svc.from('credit_purchases').update({ status: 'failed', admin_notes: 'SafePay token creation failed' }).eq('id', purchase.id)
      return json({ error: 'Payment gateway error. Please try again.' }, 502)
    }

    // 3) Build the hosted checkout URL.
    const origin = req.headers.get('origin') || 'https://behen.pk'
    const redirectUrl = `${origin}/credits?tracker=${encodeURIComponent(tracker)}`
    const cancelUrl = `${origin}/credits?payment=cancelled`
    const params = new URLSearchParams({
      beacon,
      env: environment,
      source: 'hosted',
      redirect_url: redirectUrl,
      cancel_url: cancelUrl,
    })
    const checkoutUrl = `${checkout}/pay/${tracker}?${params.toString()}`

    return json({ checkout_url: checkoutUrl, tracker, purchase_id: purchase.id })
  } catch (e) {
    console.error('safepay-create-checkout error', e)
    return json({ error: 'Unexpected error. Please try again.' }, 500)
  }
})
