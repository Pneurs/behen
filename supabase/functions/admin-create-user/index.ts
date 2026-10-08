import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const ALLOWED_ROLES = ["admin", "manager", "social_media_manager"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "super_admin");
    if (!roles?.length) return json({ error: "Only super admins can create users" }, 403);

    const { email, password, name, role, phone } = await req.json();
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return json({ error: "Enter a valid email" }, 400);
    if (!password || String(password).length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
    if (role && !ALLOWED_ROLES.includes(role)) return json({ error: "Invalid role" }, 400);

    const { data: created, error } = await admin.auth.admin.createUser({
      email: cleanEmail,
      password: String(password),
      email_confirm: true,
      user_metadata: { name: name || cleanEmail.split("@")[0], role: "bari", phone: phone || null },
    });
    if (error) return json({ error: error.message }, 400);

    const uid = created.user!.id;
    await admin.from("profiles").update({ email_verified: true }).eq("user_id", uid);
    if (role) await admin.from("user_roles").insert({ user_id: uid, role });

    return json({ success: true, user_id: uid });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
