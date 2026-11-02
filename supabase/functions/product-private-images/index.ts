// Gives signed-in members short-lived links to the extra (private) photos of a published listing.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const bearer = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!bearer) return json({ error: "Unauthorized" }, 401);
  const { data: auth } = await admin.auth.getUser(bearer);
  const uid = auth?.user?.id;
  if (!uid) return json({ error: "Unauthorized" }, 401);

  let productId = "";
  try {
    productId = String((await req.json())?.product_id ?? "");
  } catch { /* ignore */ }
  if (!UUID_RE.test(productId)) return json({ error: "Invalid product" }, 400);

  const { data: product } = await admin
    .from("products")
    .select("owner_id, status, private_image_paths")
    .eq("id", productId)
    .maybeSingle();
  if (!product) return json({ urls: [] });

  const isOwner = product.owner_id === uid;
  if (product.status !== "published" && !isOwner) return json({ urls: [] });

  // Only photos stored in the seller's own images folder
  const paths = ((product.private_image_paths as string[] | null) || [])
    .filter((p) => typeof p === "string" && p.startsWith(`${product.owner_id}/images/`))
    .slice(0, 10);
  if (!paths.length) return json({ urls: [] });

  const { data: signed, error } = await admin.storage.from("product-private-media").createSignedUrls(paths, 600);
  if (error) {
    console.error("sign error", error);
    return json({ urls: [] });
  }
  return json({ urls: (signed || []).flatMap((s) => (s.signedUrl ? [s.signedUrl] : [])) });
});
