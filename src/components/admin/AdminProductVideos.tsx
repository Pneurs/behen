import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Download, ExternalLink, Loader2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface VideoProduct {
  id: string;
  title: string;
  status: string;
  created_at: string;
  video_url: string | null;
  uploaded_video_path: string | null;
  public_images: string[] | null;
  ai_cover_image: string | null;
}

export default function AdminProductVideos() {
  const [search, setSearch] = useState("");
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["admin-product-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, status, created_at, video_url, uploaded_video_path, public_images, ai_cover_image")
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

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  const productLink = (id: string) => `${window.location.origin}/product/${id}`;

  const HASHTAGS = "#behen.pk #Pakistan #Bridaldresses #Partywear";

  const buildCaption = (p: VideoProduct) =>
    `${p.title}\n\nAvailable now on Behen.pk 💗\nBuy or rent here: ${productLink(p.id)}\n\n${HASHTAGS}`;

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
                      {format(new Date(p.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <Badge variant={p.status === "published" ? "default" : "secondary"}>
                    {p.status}
                  </Badge>
                </div>

                {p.uploaded_video_path ? (
                  signedUrls[p.id] ? (
                    <video
                      src={signedUrls[p.id]}
                      controls
                      className="w-full rounded-md bg-black max-h-64"
                    />
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
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
