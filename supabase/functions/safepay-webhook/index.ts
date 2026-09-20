// SafePay webhook receiver. Verifies the X-SFPY-SIGNATURE HMAC (SHA-512 hex
// over the raw body, keyed with the webhook shared secret), then completes the
// matching credit purchase idempotently.

import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'

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

async function completePurchase(tracker: string, reference: string) {
  const svc = serviceClient()
  const { data: purchase, error } = await svc
    .from('credit_purchases')
    .select('id, status')
    .eq('safepay_tracker', tracker)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !purchase) {
    console.error('no purchase for tracker', tracker, error)
    return { ok: false, status: 200, body: { received: true, matched: false } }
  }
  if (purchase.status === 'approved') {
    return { ok: true, status: 200, body: { received: true, already_approved: true } }
  }
  const { data: result, error: rpcError } = await svc.rpc('complete_credit_purchase', {
    _purchase_id: purchase.id,
    _tracker: tracker,
    _provider_reference: reference,
  })
  if (rpcError) {
    console.error('complete_credit_purchase failed', rpcError)
    return { ok: false, status: 500, body: { error: 'completion_failed' } }
  }
  console.log('purchase completed via webhook', purchase.id, JSON.stringify(result))
  return { ok: true, status: 200, body: { received: true, completed: true } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  try {
    const secret = Deno.env.get('SAFEPAY_WEBHOOK_SECRET')
    if (!secret) {
      console.error('SAFEPAY_WEBHOOK_SECRET is not configured')
      return json({ error: 'Webhook not configured' }, 503)
    }

    const rawBody = await req.text()
    const signature = req.headers.get('x-sfpy-signature') || ''
    if (!signature) {
      return json({ error: 'Missing signature' }, 401)
    }

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-512' },
      false,
      ['sign'],
    )
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody))
    const expected = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .toLowerCase()
    const received = signature.toLowerCase()
    let diff = expected.length ^ received.length
    for (let i = 0; i < Math.max(expected.length, received.length); i++) {
      diff |= (expected.charCodeAt(i) || 0) ^ (received.charCodeAt(i) || 0)
    }
    if (diff !== 0) {
      return json({ error: 'Invalid signature' }, 401)
    }

    let event: any
    try {
      event = JSON.parse(rawBody)
    } catch {
      return json({ error: 'Invalid JSON' }, 400)
    }

    const type = typeof event?.type === 'string' ? event.type : ''
    console.log('safepay webhook event', type)

    if (type === 'payment.succeeded') {
      // Find the tracker token anywhere in the payload.
      const tracker = rawBody.match(/track_[0-9a-fA-F-]{10,}/)?.[0]
      if (!tracker) {
        console.error('payment.succeeded without tracker token')
        return json({ received: true, matched: false })
      }
      const reference =
        event?.data?.action?.token ||
        event?.data?.tracker?.action?.token ||
        event?.data?.request?.token ||
        type
      const outcome = await completePurchase(tracker, reference)
      return json(outcome.body, outcome.status)
    }

    // payment.failed and other events: acknowledge, nothing to do (the buyer
    // can retry on the hosted checkout page).
    return json({ received: true, ignored: type || 'unknown' })
  } catch (e) {
    console.error('safepay-webhook error', e)
    return json({ error: 'Unexpected error' }, 500)
  }
})
