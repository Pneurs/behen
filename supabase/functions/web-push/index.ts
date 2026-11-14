import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";
import webpush from "npm:web-push@3.6.7";

// Browser push notifications for chat messages.
// action "subscribe": save this browser for the signed-in user (moves it off any previous user).
// action "notify": alert the other chat participant about a new message.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("subscribe"),
    subscription: z.object({
      endpoint: z.string().url().max(1000),
      keys: z.object({ p256dh: z.string().min(1).max(500), auth: z.string().min(1).max(500) }),
    }),
  }),
  z.object({ action: z.literal("notify"), conversation_id: z.string().uuid() }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid input" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: userData } = await admin.auth.getUser(token);
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    if (parsed.data.action === "subscribe") {
      const s = parsed.data.subscription;
      const { error } = await admin.from("web_push_subscriptions").upsert(
        { user_id: user.id, endpoint: s.endpoint, p256dh: s.keys.p256dh, auth: s.keys.auth },
        { onConflict: "endpoint" },
      );
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    const pub = Deno.env.get("VAPID_PUBLIC_KEY");
    const priv = Deno.env.get("VAPID_PRIVATE_KEY");
    if (pub && priv) webpush.setVapidDetails("mailto:no-reply@behen.pk", pub, priv);

    const { data: conv } = await admin
      .from("chat_conversations")
      .select("id, owner_id, renter_id, product_id")
      .eq("id", parsed.data.conversation_id)
      .maybeSingle();
    if (!conv || (conv.owner_id !== user.id && conv.renter_id !== user.id)) return json({ error: "Forbidden" }, 403);

    const recipientId = user.id === conv.owner_id ? conv.renter_id : conv.owner_id;
    const isSeller = recipientId === conv.owner_id;
    const { data: prod } = await admin.from("products").select("title, product_code").eq("id", conv.product_id).maybeSingle();
    const dress = `${prod?.title || "your dress"}${prod?.product_code ? ` (${prod.product_code})` : ""}`;

    const payload = JSON.stringify({
      title: isSeller ? "New buyer message 💖" : "Seller replied 💖",
      body: isSeller ? `A buyer messaged you about ${dress}. Tap to reply.` : `The seller replied about ${dress}. Tap to read.`,
      url: `/chat?id=${conv.id}`,
      tag: `chat-${conv.id}`,
    });

    const title = isSeller ? "New buyer message 💖" : "Seller replied 💖";
    const body = isSeller ? `A buyer messaged you about ${dress}. Tap to reply.` : `The seller replied about ${dress}. Tap to read.`;

    // Android app push (Firebase)
    let appSent = 0;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const fcmKey = Deno.env.get("FIREBASE_MESSAGING_API_KEY");
    if (lovableKey && fcmKey) {
      const { data: devices } = await admin.from("app_devices").select("id, token").eq("user_id", recipientId);
      for (const d of devices || []) {
        const res = await fetch("https://connector-gateway.lovable.dev/firebase_messaging/v1/projects/_/messages:send", {
          method: "POST",
          headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": fcmKey, "Content-Type": "application/json" },
          body: JSON.stringify({ message: { token: d.token, notification: { title, body }, data: { link: `/chat?id=${conv.id}` },
            android: { priority: "high", notification: { icon: "ic_stat_notification", tag: `chat-${conv.id}`, sound: "default" } } } }),
        });
        if (res.status === 404 || res.status === 400) await admin.from("app_devices").delete().eq("id", d.id);
        else if (!res.ok) console.error(`FCM [${res.status}]: ${await res.text()}`);
        else appSent++;
      }
    }
    if (!pub || !priv) return json({ sent: 0, appSent });

    const { data: subs } = await admin
      .from("web_push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", recipientId);

    let sent = 0;
    for (const s of subs || []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 86400 });
        sent++;
      } catch (e: any) {
        // Browser unsubscribed or expired — remove it
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await admin.from("web_push_subscriptions").delete().eq("id", s.id);
        } else {
          console.error("push send failed", e?.statusCode, e?.body || String(e));
        }
      }
    }
    return json({ sent, appSent });
  } catch (e) {
    console.error("web-push error", e);
    return json({ error: String(e) }, 500);
  }
});
