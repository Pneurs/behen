import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3";

const BUFFER_URL = "https://api.buffer.com";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function gql(query: string, variables: Record<string, unknown> = {}) {
  const token = Deno.env.get("BUFFER_ACCESS_TOKEN");
  if (!token) throw new Error("Buffer key is not set");
  const res = await fetch(BUFFER_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Buffer [${res.status}]: ${text}`);
  const data = JSON.parse(text);
  if (data.errors?.length) throw new Error(`Buffer: ${data.errors.map((e: { message: string }) => e.message).join("; ")}`);
  return data.data;
}

async function getChannels() {
  const acc = await gql(`query { account { organizations { id } } }`);
  const orgs: { id: string }[] = acc?.account?.organizations || [];
  const all: { id: string; name: string; service: string }[] = [];
  for (const o of orgs) {
    const d = await gql(
      `query C($id: OrganizationId!) { channels(input: { organizationId: $id }) { id name service } }`,
      { id: o.id },
    );
    all.push(...(d?.channels || []));
  }
  return all;
}

const Body = z.object({
  action: z.enum(["channels", "post"]),
  product_id: z.string().uuid().optional(),
  caption: z.string().min(1).max(2200).optional(),
  channel_ids: z.array(z.string().min(1)).max(10).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authHeader = req.headers.get("Authorization") || "";
    const { data: userData } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const uid = userData?.user?.id;
    if (!uid) return json({ error: "Please sign in" }, 401);
    const { data: allowed } = await admin.rpc("is_payment_reviewer", { _uid: uid });
    if (!allowed) return json({ error: "Not allowed" }, 403);

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: parsed.error.flatten().fieldErrors }, 400);
    const { action, product_id, caption, channel_ids } = parsed.data;

    const channels = await getChannels();
    if (action === "channels") return json({ channels });

    if (!product_id || !caption) return json({ error: "product_id and caption required" }, 400);
    const { data: p } = await admin.from("products").select("id, uploaded_video_path, video_url").eq("id", product_id).maybeSingle();
    if (!p) return json({ error: "Product not found" }, 404);

    let videoUrl: string | null = null;
    if (p.uploaded_video_path) {
      const { data: s } = await admin.storage.from("product-private-media").createSignedUrl(p.uploaded_video_path, 60 * 60 * 24 * 7);
      videoUrl = s?.signedUrl || null;
    } else if (p.video_url && /\.(mp4|mov|webm)(\?|$)/i.test(p.video_url)) {
      videoUrl = p.video_url;
    }
    if (!videoUrl) return json({ error: "This dress has no uploaded video file Buffer can use (links like YouTube can't be posted)." }, 400);

    const targets = channels.filter((c) => (channel_ids?.length ? channel_ids.includes(c.id) : true));
    const results: { channel: string; ok: boolean; error?: string }[] = [];
    for (const c of targets) {
      try {
        const d = await gql(
          `mutation P($input: CreatePostInput!) { createPost(input: $input) {
            ... on PostActionSuccess { post { id } } ... on MutationError { message } } }`,
          { input: { text: caption, channelId: c.id, schedulingType: "automatic", mode: "addToQueue",
                     assets: [{ video: { url: videoUrl, metadata: { thumbnailOffset: 1000 } } }] } },
        );
        const r = d?.createPost;
        if (r?.post?.id) {
          await admin.from("social_posts").insert({ product_id, channel_service: c.service, channel_name: c.name, buffer_post_id: r.post.id, status: "queued", approved_by: uid });
          results.push({ channel: `${c.service} (${c.name})`, ok: true });
        } else {
          throw new Error(r?.message || "Unknown Buffer error");
        }
      } catch (e) {
        const msg = (e as Error).message;
        await admin.from("social_posts").insert({ product_id, channel_service: c.service, channel_name: c.name, status: "failed", error: msg, approved_by: uid });
        results.push({ channel: `${c.service} (${c.name})`, ok: false, error: msg });
      }
    }
    return json({ results });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
