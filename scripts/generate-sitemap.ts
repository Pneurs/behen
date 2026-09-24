// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
import { writeFileSync, readFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://behen.pk";
const CITIES = ["Lahore", "Karachi", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Sialkot", "Gujranwala"];
const CATEGORIES = ["bridal", "barat", "walima", "formal", "party-wear", "footwear", "accessories", "jewelry", "bags"];
const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

interface Entry { path: string; lastmod?: string; changefreq?: string; priority?: string }

function readEnv() {
  try {
    const txt = readFileSync(resolve(".env"), "utf8");
    const get = (k: string) => txt.match(new RegExp(`^${k}="?([^"\\n]+)"?`, "m"))?.[1];
    return { url: process.env.VITE_SUPABASE_URL || get("VITE_SUPABASE_URL"), key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || get("VITE_SUPABASE_PUBLISHABLE_KEY") };
  } catch {
    return { url: process.env.VITE_SUPABASE_URL, key: process.env.VITE_SUPABASE_PUBLISHABLE_KEY };
  }
}

async function productEntries(): Promise<Entry[]> {
  const { url, key } = readEnv();
  if (!url || !key) return [];
  try {
    const res = await fetch(`${url}/rest/v1/products?select=id,updated_at&status=eq.published&limit=5000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { id: string; updated_at?: string }[];
    return rows.map((r) => ({
      path: `/product/${r.id}`,
      lastmod: r.updated_at ? r.updated_at.split("T")[0] : undefined,
      changefreq: "weekly",
      priority: "0.6",
    }));
  } catch {
    return [];
  }
}

async function main() {
  const entries: Entry[] = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/browse", changefreq: "daily", priority: "0.9" },
    { path: "/rent", changefreq: "daily", priority: "0.9" },
    { path: "/buy", changefreq: "daily", priority: "0.9" },
    { path: "/earn-money", changefreq: "monthly", priority: "0.6" },
    { path: "/return-policy", changefreq: "yearly", priority: "0.3" },
    { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
    { path: "/terms", changefreq: "yearly", priority: "0.3" },
  ];
  for (const type of ["rent", "buy"]) {
    for (const cat of CATEGORIES) entries.push({ path: `/${type}/${cat}`, changefreq: "daily", priority: "0.8" });
    for (const city of CITIES) {
      entries.push({ path: `/${type}/${slug(city)}`, changefreq: "daily", priority: "0.8" });
      for (const cat of CATEGORIES) entries.push({ path: `/${type}/${slug(city)}/${cat}`, changefreq: "daily", priority: "0.7" });
    }
  }
  entries.push(...(await productEntries()));

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries.map((e) =>
      [`  <url>`, `    <loc>${BASE_URL}${e.path}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        `  </url>`].filter(Boolean).join("\n")),
    `</urlset>`,
  ].join("\n");
  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${entries.length} entries)`);
}

main();
