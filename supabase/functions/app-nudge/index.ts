// Sends friendly reminders to app installs that haven't signed up or listed a dress.
// Max 3 reminders per device, at least 3 days apart, first one 24h after install.
import { createClient } from "npm:@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";
const MESSAGES = [
  { title: "Apni wardrobe se paise kamayein 💖", body: "Hazaron behenein dresses dhoond rahi hain. Apni bridal ya party dress free list karein!", link: "/list-dress" },
  { title: "Your dresses can earn for you ✨", body: "Thousands of Behenein are searching for outfits on Behen.pk. List yours free in 2 minutes.", link: "/list-dress" },
  { title: "Shaadi season aa gaya! 👗", body: "Jo dress almari mein pari hai, use rent ya sell karein. Listing bilkul free hai.", link: "/list-dress" },
];

Deno.serve(async () => {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const fcmKey = Deno.env.get("FIREBASE_MESSAGING_API_KEY");
  if (!lovableKey || !fcmKey) return Response.json({ error: "Firebase not connected" }, { status: 500 });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const day = 86400000;
  const { data: devices, error } = await db.from("app_devices")
    .select("id, token, user_id, nudge_count, last_nudge_at")
    .lt("nudge_count", 3)
    .lt("created_at", new Date(Date.now() - day).toISOString())
    .limit(500);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const due = (devices ?? []).filter((d) => !d.last_nudge_at || Date.parse(d.last_nudge_at) < Date.now() - 3 * day);
  const userIds = [...new Set(due.map((d) => d.user_id).filter(Boolean))];
  const sellers = new Set<string>();
  if (userIds.length) {
    const { data } = await db.from("products").select("owner_id").in("owner_id", userIds);
    (data ?? []).forEach((p: any) => sellers.add(p.owner_id));
  }

  let sent = 0;
  for (const d of due) {
    if (d.user_id && sellers.has(d.user_id)) continue; // already listing
    const m = MESSAGES[d.nudge_count % MESSAGES.length];
    const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": fcmKey, "Content-Type": "application/json" },
      body: JSON.stringify({ message: { token: d.token, notification: { title: m.title, body: m.body }, data: { link: m.link } } }),
    });
    if (res.status === 404 || res.status === 400) {
      await db.from("app_devices").delete().eq("id", d.id); // stale token
      continue;
    }
    if (!res.ok) { console.error(`FCM [${res.status}]: ${await res.text()}`); continue; }
    await db.from("app_devices").update({ nudge_count: d.nudge_count + 1, last_nudge_at: new Date().toISOString() }).eq("id", d.id);
    sent++;
  }
  return Response.json({ checked: due.length, sent });
});
