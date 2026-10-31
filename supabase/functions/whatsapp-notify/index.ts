import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

// Sends a WhatsApp alert (via UltraMsg) to the other person in a chat when a new message arrives.
// Throttled: only alerts if the sender had not messaged in this chat during the last 30 minutes.

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
    const instance = Deno.env.get("ULTRAMSG_INSTANCE_ID");
    const token = Deno.env.get("ULTRAMSG_TOKEN");
    if (!instance || !token) return json({ sent: false, reason: "WhatsApp gateway not configured" });

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

    // Throttle: look at the sender's two latest messages here
    const { data: recent } = await admin
      .from("chat_messages")
      .select("created_at")
      .eq("conversation_id", conv.id)
      .eq("sender_id", sender.id)
      .order("created_at", { ascending: false })
      .limit(2);
    if (recent && recent.length === 2) {
      const gap = new Date(recent[0].created_at).getTime() - new Date(recent[1].created_at).getTime();
      if (gap < QUIET_MS) return json({ sent: false, reason: "throttled" });
    }

    const recipientId = sender.id === conv.owner_id ? conv.renter_id : conv.owner_id;
    const { data: prof } = await admin.from("profiles").select("name, phone").eq("user_id", recipientId).maybeSingle();
    if (!prof?.phone) return json({ sent: false, reason: "no phone" });

    const { data: prod } = await admin.from("products").select("title, product_code").eq("id", conv.product_id).maybeSingle();
    const isSeller = recipientId === conv.owner_id;
    const dress = `${prod?.title || "your dress"}${prod?.product_code ? ` (${prod.product_code})` : ""}`;
    const body =
      `Assalam o Alaikum ${prof.name || "Behen"}! 💖\n\n` +
      (isSeller
        ? `A buyer has sent you a message about *${dress}* on Behen.pk.`
        : `The seller has replied about *${dress}* on Behen.pk.`) +
      `\n\n👉 Tap to read and reply: https://behen.pk/chat?id=${conv.id}`;

    const res = await fetch(`https://api.ultramsg.com/${instance}/messages/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token, to: toIntl(prof.phone), body }),
    });
    const text = await res.text();
    if (!res.ok || text.includes('"error"')) {
      console.error(`UltraMsg failed [${res.status}]: ${text}`);
      return json({ sent: false, status: res.status, details: text });
    }
    return json({ sent: true });
  } catch (e) {
    console.error("whatsapp-notify error", e);
    return json({ error: String(e) }, 500);
  }
});
