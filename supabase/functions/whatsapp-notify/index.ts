import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// Sends a WhatsApp alert (Meta Cloud API, template chat_new_inquiry) to the other person (seller or buyer) when a new message arrives.
// Throttled: first real message alerts instantly; after that only if the sender was quiet 30+ minutes. The auto "Interested in" intro is ignored.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const Body = z.object({ conversation_id: z.string().uuid() });
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
    if (!token || !phoneId) return json({ sent: false, reason: "WhatsApp gateway not configured" });

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
    if (recent.length >= 2) {
      const gap = new Date(recent[0].created_at).getTime() - new Date(recent[1].created_at).getTime();
      if (gap < QUIET_MS) return json({ sent: false, reason: "throttled" });
    }

    // Alerts go to whoever is on the other side — seller or buyer.
    const recipientId = sender.id === conv.owner_id ? conv.renter_id : conv.owner_id;
    const { data: prof } = await admin.from("profiles").select("name, phone").eq("user_id", recipientId).maybeSingle();
    if (!prof?.phone) return json({ sent: false, reason: "no phone" });

    const { data: prod } = await admin.from("products").select("title, product_code").eq("id", conv.product_id).maybeSingle();
    const dress = `${prod?.title || "your dress"}${prod?.product_code ? ` (${prod.product_code})` : ""}`;

    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: toIntl(prof.phone),
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
      console.error(`Meta WhatsApp failed [${res.status}]: ${text}`);
      return json({ sent: false, status: res.status, details: text });
    }
    return json({ sent: true });
  } catch (e) {
    console.error("whatsapp-notify error", e);
    return json({ error: String(e) }, 500);
  }
});
