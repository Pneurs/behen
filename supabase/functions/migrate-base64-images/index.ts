// One-off / idempotent: moves base64 photos stored in product rows into storage.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function decode(dataUrl: string) {
  const m = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const ext = m[1].split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  return { bytes, type: m[1], ext };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  const upload = async (productId: string, val: string) => {
    if (!val?.startsWith("data:")) return val;
    const d = decode(val);
    if (!d) return val;
    const path = `migrated/${productId}/${crypto.randomUUID()}.${d.ext}`;
    const { error } = await sb.storage.from("product-images").upload(path, d.bytes, { contentType: d.type });
    if (error) throw error;
    return sb.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  };

  const { data: ids, error } = await sb
    .from("products")
    .select("id")
    .or("ai_cover_image.like.data:*,public_images.not.is.null")
    .limit(1000);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: cors });

  let migrated = 0;
  const failures: string[] = [];
  for (const { id } of ids || []) {
    try {
      const { data: p } = await sb.from("products").select("ai_cover_image, public_images, real_images").eq("id", id).single();
      if (!p) continue;
      const needs = (v?: string | null) => !!v && v.startsWith("data:");
      const hasB64 = needs(p.ai_cover_image) || (p.public_images || []).some(needs) || (p.real_images || []).some(needs);
      if (!hasB64) continue;
      const cache = new Map<string, string>();
      const conv = async (v: string) => {
        if (!needs(v)) return v;
        if (!cache.has(v)) cache.set(v, await upload(id, v));
        return cache.get(v)!;
      };
      const update = {
        ai_cover_image: p.ai_cover_image ? await conv(p.ai_cover_image) : p.ai_cover_image,
        public_images: p.public_images ? await Promise.all(p.public_images.map(conv)) : p.public_images,
        real_images: p.real_images ? await Promise.all(p.real_images.map(conv)) : p.real_images,
      };
      const { error: uErr } = await sb.from("products").update(update).eq("id", id);
      if (uErr) throw uErr;
      migrated++;
    } catch (e) {
      failures.push(`${id}: ${(e as Error).message}`);
    }
  }
  return new Response(JSON.stringify({ checked: ids?.length || 0, migrated, failures }), {
    headers: { ...cors, "Content-Type": "application/json" },
  });
});
