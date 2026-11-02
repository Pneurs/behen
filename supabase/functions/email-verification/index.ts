// Server-side email verification for sign-up.
// Accounts are created unconfirmed here (no passwords are ever stored in our tables),
// and confirmed only when the emailed link is opened.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const REFERRAL_BONUS = 150;

const newToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

const cleanEmail = (v: unknown) => String(v ?? "").trim().toLowerCase();

// Only allow redirects back to our own site
const safeRedirect = (v: unknown) => {
  try {
    const u = new URL(String(v ?? ""));
    const okHost =
      u.hostname === "behen.pk" || u.hostname === "www.behen.pk" ||
      u.hostname.endsWith(".lovable.app") || u.hostname.endsWith(".lovableproject.com") ||
      u.hostname === "localhost";
    if (okHost && (u.protocol === "https:" || u.hostname === "localhost")) return `${u.origin}/auth`;
  } catch { /* ignore */ }
  return "https://behen.pk/auth";
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const sendEmail = async (email: string, token: string, redirectUrl: string) => {
    const { error } = await admin.functions.invoke("send-otp-email", {
      body: { email, token, redirectUrl, type: "signup" },
    });
    if (error) throw new Error("email_send_failed");
  };

  const storeToken = async (email: string, userId: string, userData: Record<string, unknown>) => {
    const token = newToken();
    await admin.from("email_verification_tokens").delete().eq("email", email);
    const { error } = await admin.from("email_verification_tokens").insert({
      email,
      token,
      user_id: userId,
      password_hash: "",
      user_data: userData,
      expires_at: new Date(Date.now() + TOKEN_TTL_MS).toISOString(),
    });
    if (error) throw error;
    return token;
  };

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }
  const action = String(body.action || "");

  try {
    // ---------- 1. Sign up: create an unconfirmed account and email a link ----------
    if (action === "signup") {
      const email = cleanEmail(body.email);
      const password = String(body.password ?? "");
      const name = String(body.name ?? "").trim().slice(0, 100);
      const phone = String(body.phone ?? "").trim().slice(0, 20);
      const role = body.role === "bari" ? "bari" : "choti";
      const referralCode = String(body.referralCode ?? "").trim().toLowerCase().slice(0, 100);

      if (!EMAIL_RE.test(email) || email.length > 254) return json({ error: "Please enter a valid email address" }, 400);
      if (password.length < 6 || password.length > 72) return json({ error: "Password must be 6 to 72 characters" }, 400);
      if (!name) return json({ error: "Please enter your name" }, 400);
      if (phone && !/^\+?[0-9\s-]{7,20}$/.test(phone)) return json({ error: "Please enter a valid phone number" }, 400);

      let referredBy: string | null = null;
      if (role === "bari" && referralCode) {
        if (!referralCode.startsWith("bari-behen-")) return json({ error: "invalid_referral" }, 400);
        const { data: ref } = await admin.from("user_earnings").select("user_id").eq("referral_code", referralCode).maybeSingle();
        if (!ref) return json({ error: "invalid_referral" }, 400);
        referredBy = ref.user_id;
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: false,
        user_metadata: { name, phone: phone || null, role, referred_by: referredBy },
      });

      if (createErr) {
        const msg = (createErr.message || "").toLowerCase();
        if ((createErr as { code?: string }).code === "email_exists" || msg.includes("already")) {
          const { data: existingRole } = await admin.rpc("get_user_role_by_email", { user_email: email });
          return json({ status: "exists", role: existingRole ?? null });
        }
        if ((createErr as { code?: string }).code === "weak_password" || msg.includes("password")) {
          return json({ error: "This password is too weak or has appeared in a data leak. Please choose a different one." }, 400);
        }
        console.error("createUser error", createErr);
        return json({ error: "Could not create your account. Please try again." }, 400);
      }

      const token = await storeToken(email, created.user!.id, { referred_by: referredBy });
      await sendEmail(email, token, safeRedirect(body.redirectUrl));
      return json({ status: "sent" });
    }

    // ---------- 2. Resend the verification link ----------
    if (action === "resend") {
      const email = cleanEmail(body.email);
      if (!EMAIL_RE.test(email)) return json({ status: "sent" });

      // A signed-in (older) account whose email isn't verified yet
      const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
      let userId: string | null = null;
      let userData: Record<string, unknown> = {};
      if (bearer) {
        const { data } = await admin.auth.getUser(bearer);
        if (data?.user?.email?.toLowerCase() === email) userId = data.user.id;
      }
      if (!userId) {
        const { data: row } = await admin
          .from("email_verification_tokens")
          .select("user_id, user_data")
          .eq("email", email)
          .maybeSingle();
        if (row?.user_id) {
          userId = row.user_id;
          userData = (row.user_data as Record<string, unknown>) || {};
        }
      }
      // Always answer the same way so this can't be used to discover accounts
      if (!userId) return json({ status: "sent" });

      const token = await storeToken(email, userId, userData);
      await sendEmail(email, token, safeRedirect(body.redirectUrl));
      return json({ status: "sent" });
    }

    // ---------- 3. Verify the link and sign the person in ----------
    if (action === "verify") {
      const email = cleanEmail(body.email);
      const token = String(body.token ?? "");
      if (!EMAIL_RE.test(email) || !/^[0-9a-z]{10,128}$/i.test(token)) return json({ error: "invalid_link" }, 400);

      const { data: row } = await admin
        .from("email_verification_tokens")
        .select("id, user_id, user_data, expires_at")
        .eq("email", email)
        .eq("token", token)
        .maybeSingle();

      if (!row || !row.user_id || new Date(row.expires_at).getTime() < Date.now()) {
        return json({ error: "invalid_link" }, 400);
      }

      const userId = row.user_id as string;
      const { error: confirmErr } = await admin.auth.admin.updateUserById(userId, { email_confirm: true });
      if (confirmErr) {
        console.error("confirm error", confirmErr);
        return json({ error: "invalid_link" }, 400);
      }
      await admin.from("profiles").update({ email_verified: true }).eq("user_id", userId);
      await admin.from("email_verification_tokens").delete().eq("email", email);

      // Referral bonus (server-side so nobody can fake it)
      const referredBy = (row.user_data as { referred_by?: string | null } | null)?.referred_by;
      if (referredBy && UUID_RE.test(referredBy) && referredBy !== userId) {
        try {
          const { data: already } = await admin
            .from("referral_signups").select("id").eq("referred_user_id", userId).maybeSingle();
          const { data: referrer } = await admin
            .from("user_earnings").select("referral_code, pending_balance").eq("user_id", referredBy).maybeSingle();
          if (!already && referrer) {
            await admin.from("user_earnings")
              .update({ pending_balance: Number(referrer.pending_balance || 0) + REFERRAL_BONUS })
              .eq("user_id", referredBy);
            await admin.from("earning_transactions").insert({
              user_id: referredBy, amount: REFERRAL_BONUS, type: "referral_bonus", status: "pending",
              reference_id: userId, notes: "Referral bonus - new user signup",
            });

            const { data: mine } = await admin
              .from("user_earnings").select("pending_balance").eq("user_id", userId).maybeSingle();
            if (mine) {
              await admin.from("user_earnings")
                .update({ pending_balance: Number(mine.pending_balance || 0) + REFERRAL_BONUS, referred_by: referredBy })
                .eq("user_id", userId);
            } else {
              await admin.from("user_earnings").insert({
                user_id: userId, pending_balance: REFERRAL_BONUS, referred_by: referredBy, balance: 0,
              });
            }
            await admin.from("earning_transactions").insert({
              user_id: userId, amount: REFERRAL_BONUS, type: "referral_bonus", status: "pending",
              notes: "Referral signup bonus",
            });
            await admin.from("referral_signups").insert({
              referrer_user_id: referredBy, referred_user_id: userId,
              referral_code: referrer.referral_code || "", bonus_amount: REFERRAL_BONUS, bonus_credited: true,
            });
          }
        } catch (e) {
          console.error("referral bonus error", e);
        }
      }

      // One-time sign-in code so the person lands signed in
      const { data: link } = await admin.auth.admin.generateLink({ type: "magiclink", email });
      return json({
        status: "verified",
        token_hash: link?.properties?.hashed_token ?? null,
        referral_bonus: !!referredBy,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("email-verification error", e);
    return json({ error: "Something went wrong. Please try again." }, 500);
  }
});
