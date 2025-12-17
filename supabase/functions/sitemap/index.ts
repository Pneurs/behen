import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/xml",
};

// Categories available on the platform
const CATEGORIES = [
  "bridal",
  "barat",
  "walima",
  "formal",
  "party_wear",
  "footwear",
  "accessories",
  "jewelry",
  "bags",
];

// Major cities in Pakistan
const CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
];

Deno.serve(async (req) => {
  console.log("Sitemap generator called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get base URL from request or use default
    const url = new URL(req.url);
    const baseUrl = url.searchParams.get("base_url") || "https://behen.pk";

    console.log(`Generating sitemap for base URL: ${baseUrl}`);

    // Fetch all published products for individual product pages
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, updated_at")
      .eq("status", "published")
      .order("updated_at", { ascending: false });

    if (productsError) {
      console.error("Error fetching products:", productsError);
    }

    // Fetch custom SEO content pages
    const { data: seoPages, error: seoError } = await supabase
      .from("page_seo_content")
      .select("city, area, category, updated_at");

    if (seoError) {
      console.error("Error fetching SEO pages:", seoError);
    }

    const today = new Date().toISOString().split("T")[0];

    // Build sitemap XML
    let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/browse</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/earn-money</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy-policy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms-and-conditions</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/return-policy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
`;

    // Add city/category combination pages
    console.log(`Adding ${CITIES.length * CATEGORIES.length} city/category combinations`);
    
    for (const city of CITIES) {
      // City-only page
      sitemap += `  <url>
    <loc>${baseUrl}/browse?city=${encodeURIComponent(city)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
      
      // City + Category pages
      for (const category of CATEGORIES) {
        sitemap += `  <url>
    <loc>${baseUrl}/browse?city=${encodeURIComponent(city)}&amp;category=${category}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;
      }
    }

    // Add category-only pages
    for (const category of CATEGORIES) {
      sitemap += `  <url>
    <loc>${baseUrl}/browse?category=${category}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
`;
    }

    // Add custom SEO pages with areas
    if (seoPages && seoPages.length > 0) {
      console.log(`Adding ${seoPages.length} custom SEO pages`);
      
      for (const page of seoPages) {
        if (page.area) {
          const params = new URLSearchParams();
          if (page.city) params.set("city", page.city);
          if (page.area) params.set("area", page.area);
          if (page.category) params.set("category", page.category);
          
          const lastmod = page.updated_at ? new Date(page.updated_at).toISOString().split("T")[0] : today;
          
          sitemap += `  <url>
    <loc>${baseUrl}/browse?${params.toString().replace(/&/g, "&amp;")}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
`;
        }
      }
    }

    // Add individual product pages
    if (products && products.length > 0) {
      console.log(`Adding ${products.length} product pages`);
      
      for (const product of products) {
        const lastmod = product.updated_at 
          ? new Date(product.updated_at).toISOString().split("T")[0] 
          : today;
        
        sitemap += `  <url>
    <loc>${baseUrl}/product/${product.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
`;
      }
    }

    sitemap += `</urlset>`;

    console.log("Sitemap generated successfully");

    return new Response(sitemap, {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://behen.pk/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        headers: corsHeaders,
        status: 200,
      }
    );
  }
});