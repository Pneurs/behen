import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

// Behen.pk signature audio (first second already trimmed), stored in public branding storage.
export const SIGNATURE_AUDIO_URL = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/branding-assets/audio/behen-signature-audio.m4a`;

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm";
const OUT_W = 720;
const OUT_H = 1280;
const MAX_SECONDS = 60;

let ffmpegPromise: Promise<FFmpeg> | null = null;

async function getFFmpeg() {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ff = new FFmpeg();
      await ff.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ff;
    })().catch((e) => {
      ffmpegPromise = null;
      throw e;
    });
  }
  return ffmpegPromise;
}

export function buildBadgeText(productCode: string | null, city: string | null) {
  return [productCode, city, "behen.pk"].filter(Boolean).join("  •  ");
}

const token = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Draws the rounded pink pill (product code • city • behen.pk) as a transparent PNG. */
async function renderBadge(text: string): Promise<Uint8Array> {
  const fontSize = 30;
  const padX = 30;
  const height = 64;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  ctx.font = font;
  const width = Math.min(OUT_W - 40, Math.ceil(ctx.measureText(text).width) + padX * 2);
  canvas.width = width;
  canvas.height = height;
  ctx.font = font;
  ctx.fillStyle = `hsl(${token("--primary") || "330 81% 60%"} / 0.92)`;
  ctx.beginPath();
  ctx.roundRect(0, 0, width, height, height / 2);
  ctx.fill();
  ctx.fillStyle = `hsl(${token("--primary-foreground") || "0 0% 100%"})`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, width / 2, height / 2 + 1, width - padX * 2);
  const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * Returns a 9:16 MP4 with the product badge (bottom-center, above the app captions)
 * and the Behen.pk signature audio replacing the original sound. Runs fully in the browser.
 */
export async function brandVideo(
  videoUrl: string,
  badgeText: string,
  onProgress?: (pct: number, stage: string) => void,
): Promise<Blob> {
  onProgress?.(0, "Loading video tools");
  const ff = await getFFmpeg();
  const progressHandler = ({ progress }: { progress: number }) =>
    onProgress?.(Math.max(0, Math.min(100, Math.round(progress * 100))), "Adding audio and code");
  const ext = (videoUrl.split("?")[0].split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 4) || "mp4";
  ff.on("progress", progressHandler);
  try {
    onProgress?.(0, "Downloading video");
    await ff.writeFile(`in.${ext}`, await fetchFile(videoUrl));
    await ff.writeFile("audio.m4a", await fetchFile(SIGNATURE_AUDIO_URL));
    await ff.writeFile("badge.png", await renderBadge(badgeText));

    onProgress?.(0, "Adding audio and code");
    const code = await ff.exec([
      "-i", `in.${ext}`,
      "-stream_loop", "-1", "-i", "audio.m4a",
      "-i", "badge.png",
      "-filter_complex",
      `[0:v]scale=${OUT_W}:${OUT_H}:force_original_aspect_ratio=decrease,pad=${OUT_W}:${OUT_H}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=30[bg];[bg][2:v]overlay=(W-w)/2:H*0.78-h/2[out]`,
      "-map", "[out]", "-map", "1:a",
      "-t", String(MAX_SECONDS), "-shortest",
      "-c:v", "libx264", "-preset", "ultrafast", "-crf", "26", "-pix_fmt", "yuv420p",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart",
      "out.mp4",
    ]);
    if (code !== 0) throw new Error("Video processing failed");
    const data = await ff.readFile("out.mp4");
    const bytes = new Uint8Array(data instanceof Uint8Array ? data : new TextEncoder().encode(data));
    if (bytes.byteLength < 1000) throw new Error("Video processing produced an empty file");
    return new Blob([bytes], { type: "video/mp4" });
  } finally {
    ff.off("progress", progressHandler);
    for (const f of [`in.${ext}`, "audio.m4a", "badge.png", "out.mp4"]) {
      await ff.deleteFile(f).catch(() => undefined);
    }
  }
}
