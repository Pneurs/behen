import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// Sends a WhatsApp alert (Meta Cloud API, template chat_new_inquiry) to the other person (seller or buyer) when a new message arrives.
// Throttled: first real message alerts instantly; after that only if the sender was quiet 30+ minutes. The auto "Interested in" intro is ignored.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({ conversation_id: z.string().uuid(), fee_paid: z.boolean().optional() });
const QUIET_MS = 30 * 60 * 1000;

const toIntl = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  if (d.startsWith("92")) return d;
  if (d.startsWith("0")) return "92" + d.slice(1);
  if (d.length === 10 && d.startsWith("3")) return "92" + d;
  return d;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("META_WHATSAPP_TOKEN");
    const phoneId = Deno.env.get("META_WHATSAPP_PHONE_ID");
    if (!token || !phoneId) {
      console.warn("[whatsapp-notify] skipped: gateway not configured");
      return json({ sent: false, reason: "WhatsApp gateway not configured" });
    }

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Invalid input" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization") || "";
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const sender = userData?.user;
    if (!sender) return json({ error: "Unauthorized" }, 401);

    const { data: conv } = await admin
      .from("chat_conversations")
      .select("id, owner_id, renter_id, product_id")
      .eq("id", parsed.data.conversation_id)
      .maybeSingle();
    if (!conv || (conv.owner_id !== sender.id && conv.renter_id !== sender.id)) return json({ error: "Forbidden" }, 403);

    // Throttle: look at the sender's latest messages here, ignoring the automatic "Interested in" intro
    const { data: recentRaw } = await admin
      .from("chat_messages")
      .select("created_at, message")
      .eq("conversation_id", conv.id)
      .eq("sender_id", sender.id)
      .order("created_at", { ascending: false })
      .limit(5);
    const recent = (recentRaw || []).filter((m: any) => !String(m.message || "").startsWith("👗 Interested in"));
    // A buyer fee payment always alerts the seller (she has 24 hours to pay) — but only if a real payment exists.
    let feeAlert = false;
    if (parsed.data.fee_paid && sender.id === conv.renter_id) {
      const { data: pay } = await admin.from("booking_fee_payments").select("id")
        .eq("conversation_id", conv.id).eq("payer_id", sender.id).in("status", ["pending", "approved"]).limit(1);
      feeAlert = !!pay?.length;
    }
    if (!feeAlert && recent.length >= 2) {
      const gap = new Date(recent[0].created_at).getTime() - new Date(recent[1].created_at).getTime();
      if (gap < QUIET_MS) {
        console.log(`[whatsapp-notify] conv ${conv.id}: throttled (gap ${Math.round(gap / 1000)}s)`);
        return json({ sent: false, reason: "throttled" });
      }
    }

    // Alerts go to whoever is on the other side — seller or buyer.
    const recipientId = sender.id === conv.owner_id ? conv.renter_id : conv.owner_id;
    const { data: prof } = await admin.from("profiles").select("name, phone").eq("user_id", recipientId).maybeSingle();
    if (!prof?.phone) {
      console.log(`[whatsapp-notify] conv ${conv.id}: recipient ${recipientId} has no phone on profile`);
      return json({ sent: false, reason: "no phone" });
    }
    const to = toIntl(prof.phone);
    const masked = `${to.slice(0, 4)}****${to.slice(-3)}`;
    console.log(`[whatsapp-notify] conv ${conv.id}: sending chat_new_inquiry to ${masked} (recipient ${recipientId})`);

    const { data: prod } = await admin.from("products").select("title, product_code").eq("id", conv.product_id).maybeSingle();
    const dress = `${prod?.title || "your dress"}${prod?.product_code ? ` (${prod.product_code})` : ""}`;

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: "chat_new_inquiry",
          language: { code: "en_US" },
          components: [
            { type: "body", parameters: [
              { type: "text", text: prof.name || "Behen" },
              { type: "text", text: dress },
            ] },
            { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: conv.id }] },
          ],
        },
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`[whatsapp-notify] Meta rejected message to ${masked} [${res.status}]: ${text}`);
      return json({ sent: false, status: res.status, details: text });
    }
    let wamid: string | undefined;
    let waStatus: string | undefined;
    try {
      const body = JSON.parse(text);
      wamid = body?.messages?.[0]?.id;
      waStatus = body?.messages?.[0]?.message_status;
    } catch { /* non-JSON */ }
    console.log(`[whatsapp-notify] Meta accepted message to ${masked}: wamid=${wamid ?? "?"} status=${waStatus ?? "accepted"} wa_id=${text.match(/"wa_id":"(\d+)"/)?.[1] ?? "?"}`);
    return json({ sent: true, wamid });
  } catch (e) {
    console.error("whatsapp-notify error", e);
    return json({ error: String(e) }, 500);
  }
});
