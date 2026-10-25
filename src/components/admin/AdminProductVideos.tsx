import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, ExternalLink, Loader2, Send, Sparkles, Video } from "lucide-react";
import { brandVideo, buildBadgeText } from "@/lib/brandVideo";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface VideoProduct {
  id: string;
  title: string;
  product_code: string | null;
  status: string;
  created_at: string;
  video_url: string | null;
  uploaded_video_path: string | null;
  public_images: string[] | null;
  ai_cover_image: string | null;
  city: string | null;
  listing_type: string | null;
  rental_price_4days: number | null;
  sale_price: number | null;
  inventory_status: string | null;
  listing_active: boolean | null;
}

export default function AdminProductVideos() {
  const [search, setSearch] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [statusId, setStatusId] = useState<string | null>(null);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [branded, setBranded] = useState<Record<string, { url: string; path: string }>>({});
  const [brandingId, setBrandingId] = useState<string | null>(null);
  const [brandStatus, setBrandStatus] = useState("");
  const queryClient = useQueryClient();

  const setSold = async (p: VideoProduct, sold: boolean) => {
    setStatusId(p.id);
    const { data, error } = await supabase.rpc("set_product_sold_status", { _product_id: p.id, _sold: sold });
    setStatusId(null);
    if (error || !(data as { success?: boolean } | null)?.success) {
      toast.error("Could not change the status");
      return;
    }
    toast.success(sold ? "Marked as sold out" : "Listing is live again");
    queryClient.invalidateQueries({ queryKey: ["admin-product-videos"] });
  };

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-product-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, product_code, title, status, created_at, video_url, uploaded_video_path, public_images, ai_cover_image, city, listing_type, rental_price_4days, sale_price, inventory_status, listing_active")
        .or("video_url.not.is.null,uploaded_video_path.not.is.null")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []) as VideoProduct[];
    },
  });

  useEffect(() => {
    const load = async () => {
      const withUploads = products.filter((p) => p.uploaded_video_path && !signedUrls[p.id]);
      if (withUploads.length === 0) return;
      const entries = await Promise.all(
        withUploads.map(async (p) => {
          const { data } = await supabase.storage
            .from("product-private-media")
            .createSignedUrl(p.uploaded_video_path as string, 3600);
          return [p.id, data?.signedUrl || ""] as const;
        })
      );
      setSignedUrls((prev) => {
        const next = { ...prev };
        entries.forEach(([id, url]) => {
          if (url) next[id] = url;
        });
        return next;
      });
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const nq = q.replace(/[^a-z0-9]/g, "");
    const code = (p.product_code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    return p.title.toLowerCase().includes(q) || (!!nq && code.includes(nq));
  });

  const isSold = (p: VideoProduct) => p.inventory_status === "unavailable" || p.listing_active === false;

  const productLink = (id: string) => `${window.location.origin}/product/${id}`;

  const HASHTAGS = "#behen.pk #Pakistan #Bridaldresses #Partywear";

  const money = (n: number) => `PKR ${Number(n).toLocaleString("en-PK")}`;

  const buildCaption = (p: VideoProduct) => {
    const type = (p.listing_type || "").toLowerCase();
    const hasRent = (type.includes("rent") || type === "both") && !!p.rental_price_4days;
    const hasSale = (type.includes("sale") || type.includes("sell") || type === "both") && !!p.sale_price;

    const priceParts: string[] = [];
    if (hasRent) priceParts.push(`Rent: ${money(p.rental_price_4days as number)} (4 days)`);
    if (hasSale) priceParts.push(hasRent ? `Sale: ${money(p.sale_price as number)}` : `Price: ${money(p.sale_price as number)}`);

    const lines = [p.title];
    if (priceParts.length) lines.push(`💰 ${priceParts.join(" | ")}`);
    if (p.city) lines.push(`📍 ${p.city}`);

    const cta = hasRent && hasSale ? "Rent or buy here" : hasRent ? "Rent here" : "Buy here";

    return `${lines.join("\n")}\n\nAvailable now on Behen.pk 💗\n${cta}: ${productLink(p.id)}\n\n${HASHTAGS}`;
  };

  const { data: socialRows = [] } = useQuery({
    queryKey: ["admin-social-posts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("social_posts")
        .select("product_id, channel_service, status, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      return data || [];
    },
  });
  const posted: Record<string, { channel_service: string; status: string }[]> = {};
  socialRows.forEach((r) => {
    const list = (posted[r.product_id] ||= []);
    if (!list.some((x) => x.channel_service === r.channel_service)) list.push(r);
  });

  // Adds the Behen.pk signature audio and the "code • city • behen.pk" badge, then saves the copy.
  const makeBranded = async (p: VideoProduct) => {
    if (branded[p.id]) return branded[p.id];
    const source = signedUrls[p.id];
    if (!source) {
      toast.error("Video is still loading, please try again in a moment.");
      return null;
    }
    setBrandingId(p.id);
    setBrandStatus("Starting");
    try {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Please sign in again");
      const blob = await brandVideo(source, buildBadgeText(p.product_code, p.city), (pct, stage) =>
        setBrandStatus(pct > 0 ? `${stage} ${pct}%` : stage),
      );
      setBrandStatus("Saving");
      const path = `${uid}/social/${p.id}.mp4`;
      const { error } = await supabase.storage
        .from("product-private-media")
        .upload(path, blob, { upsert: true, contentType: "video/mp4" });
      if (error) throw error;
      const entry = { url: URL.createObjectURL(blob), path };
      setBranded((prev) => ({ ...prev, [p.id]: entry }));
      toast.success("Branded video ready — check it before posting.");
      return entry;
    } catch (e) {
      toast.error(`Could not make the branded video: ${(e as Error).message}`);
      return null;
    } finally {
      setBrandingId(null);
      setBrandStatus("");
    }
  };

  const approveAndPost = async (p: VideoProduct) => {
    if (!confirm(`Send "${p.title}" to your Buffer queue for Instagram and TikTok?`)) return;
    const b = await makeBranded(p);
    if (!b) return;
    setPostingId(p.id);
    const { data, error } = await supabase.functions.invoke("buffer-publish", {
      body: { action: "post", product_id: p.id, caption: buildCaption(p), branded_path: b.path },
    });
    setPostingId(null);
    queryClient.invalidateQueries({ queryKey: ["admin-social-posts"] });
    if (error) {
      let msg = error.message;
      try { msg = JSON.parse(await (error as { context: Response }).context.text()).error || msg; } catch { /* ignore */ }
      toast.error(`Could not post: ${msg}`);
      return;
    }
    const results = (data?.results || []) as { channel: string; ok: boolean; error?: string }[];
    if (!results.length) return toast.error("No channels found in your Buffer account.");
    results.forEach((r) => (r.ok ? toast.success(`Queued on ${r.channel}`) : toast.error(`${r.channel}: ${r.error}`)));
  };

  const copyCaption = async (p: VideoProduct) => {
    try {
      await navigator.clipboard.writeText(buildCaption(p));
      toast.success("Caption copied — paste it on Instagram, TikTok or Facebook.");
    } catch {
      toast.error("Could not copy. Select the caption text and copy it manually.");
    }
  };

  const slugify = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "behen-video";

  const downloadVideo = async (p: VideoProduct) => {
    const url = signedUrls[p.id];
    if (!url) {
      toast.error("Video is still loading, please try again in a moment.");
      return;
    }
    setDownloadingId(p.id);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const blob = await res.blob();
      const ext = (p.uploaded_video_path?.split(".").pop() || "mp4").split("?")[0];
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `${slugify(p.title)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      toast.success("Video downloaded.");
    } catch {
      toast.error("Download failed. Try opening the video and saving it.");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5 text-primary" />
          Product Videos
        </CardTitle>
        <CardDescription>
          Every listing that has a video, with a link to the product page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Search by product title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />

        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No product videos yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filtered.map((p) => (
              <div key={p.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.product_code ? `${p.product_code} · ` : ""}
                      {format(new Date(p.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <Badge variant={isSold(p) ? "secondary" : "default"}>
                    {isSold(p) ? "Sold out" : "Live"}
                  </Badge>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isSold(p) ? "default" : "outline"}
                  className="w-full"
                  disabled={statusId === p.id}
                  onClick={() => setSold(p, !isSold(p))}
                >
                  {statusId === p.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isSold(p) ? "Make live again" : "Mark as sold out"}
                </Button>

                {p.uploaded_video_path ? (
                  signedUrls[p.id] ? (
                    <div className="space-y-2">
                      <video
                        src={signedUrls[p.id]}
                        controls
                        className="w-full rounded-md bg-black max-h-64"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={downloadingId === p.id}
                        onClick={() => downloadVideo(p)}
                      >
                        {downloadingId === p.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4 mr-2" />
                        )}
                        Download video
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading video...
                    </div>
                  )
                ) : null}

                {p.video_url && (
                  <a
                    href={p.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-primary underline break-all flex items-start gap-1"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0 mt-0.5" />
                    {p.video_url}
                  </a>
                )}

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Product link</p>
                  <div className="flex gap-2">
                    <Input readOnly value={productLink(p.id)} className="text-xs" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(productLink(p.id));
                        toast.success("Product link copied.");
                      }}
                    >
                      Copy
                    </Button>
                    <Button type="button" size="sm" asChild>
                      <a href={`/product/${p.id}`} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Caption for Instagram / TikTok / Facebook
                  </p>
                  <Textarea readOnly value={buildCaption(p)} rows={5} className="text-xs" />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="w-full"
                    onClick={() => copyCaption(p)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy caption
                  </Button>
                </div>

                <div className="space-y-2 border-t pt-3">
                  {(posted[p.id] || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(posted[p.id] || []).map((s, i) => (
                        <Badge key={i} variant={s.status === "queued" ? "default" : "destructive"} className="capitalize">
                          {s.channel_service}: {s.status === "queued" ? "in Buffer queue" : "failed"}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {branded[p.id] ? (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Branded video (your audio + code) — this is what gets posted</p>
                      <video src={branded[p.id].url} controls className="w-full rounded-md bg-muted max-h-72" />
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={brandingId !== null || !p.uploaded_video_path || !signedUrls[p.id]}
                      onClick={() => makeBranded(p)}
                    >
                      {brandingId === p.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      {brandingId === p.id ? brandStatus || "Working..." : "Preview branded video"}
                    </Button>
                  )}
                  {brandingId === p.id && (
                    <p className="text-xs text-muted-foreground">Keep this tab open — this can take 1–3 minutes.</p>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    className="w-full"
                    disabled={postingId === p.id || brandingId !== null || !p.uploaded_video_path}
                    onClick={() => approveAndPost(p)}
                  >
                    {postingId === p.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                    {(posted[p.id] || []).some((s) => s.status === "queued") ? "Post again to Buffer" : "Approve & post to Instagram / TikTok"}
                  </Button>
                  {!p.uploaded_video_path && (
                    <p className="text-xs text-muted-foreground">Only uploaded video files can be auto-posted.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
