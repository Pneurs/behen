import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

interface AIModelSetting {
  provider: "lovable" | "openai";
  model: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageUrl, product_type } = await req.json();

    if (!imageUrl || typeof imageUrl !== "string") {
      return json(400, {
        error: "Please upload at least one clear image of your dress",
        code: "INVALID_IMAGE",
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch current AI model setting from app_settings
    const { data: settingData } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ai_image_model")
      .single();

    // Default to Lovable AI for cost efficiency
    const modelSetting: AIModelSetting = settingData?.value || {
      provider: "lovable",
      model: "google/gemini-2.5-flash-image-preview",
    };

    console.log("[generate-cover-image] Using provider:", modelSetting.provider, "model:", modelSetting.model);

    const productTypeLabel = product_type === "dress" ? "lehnga/dress" : (product_type || "dress");

    // Use portrait output for dresses to reduce bottom-cropping risk
    const outputSize =
      typeof product_type === "string" && /dress|lehng|gown|maxi/i.test(product_type)
        ? "1024x1536"
        : "1024x1024";

    // Enhanced prompt focused on EXACT dress preservation and full body coverage
    const prompt = [
      `IMPORTANT: Create a professional product photo of this EXACT ${productTypeLabel} on a faceless white mannequin.`,
      `CRITICAL REQUIREMENT 1: PRESERVE THE DRESS DESIGN EXACTLY AS IS - same neckline, same sleeves, same length, same embroidery patterns, same fabric texture, same colors. DO NOT modify, add, remove, or change ANY design element.`,
      `CRITICAL REQUIREMENT 2: Show the COMPLETE dress from top to bottom with FULL BODY COVERAGE - the mannequin must be wearing the dress EXACTLY as shown including all coverage. If the original shows a full-length dress covering the belly/torso, the mannequin must show the same coverage. DO NOT expose any mannequin body parts that are covered by the dress in the original image.`,
      `CRITICAL REQUIREMENT 3: Zoom OUT significantly - show the ENTIRE outfit from neckline to hem with generous padding at top and bottom. The full dress length including hem/bottom must be clearly visible - NEVER crop or cut off any part.`,
      `CRITICAL REQUIREMENT 4: If the original dress has dupatta/shawl/stole, include it in the same style and draping.`,
      `Mannequin: Full-body standing pose, faceless, neutral lighting, centered in frame.`,
      `Background: Clean plain white or very light gray.`,
      `Output: A professional e-commerce style product photo that shows the EXACT same dress design and coverage as the input image.`,
    ].join(" ");

    let generatedImageBase64: string | undefined;

    if (modelSetting.provider === "lovable") {
      // ===== LOVABLE AI (Default - Cost Efficient) =====
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

      console.log("[generate-cover-image] Using Lovable AI Gateway");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: modelSetting.model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ],
          modalities: ["image", "text"]
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[generate-cover-image] Lovable AI error:", response.status, errorText);

        if (response.status === 429) {
          return json(429, { error: "Rate limit exceeded. Please try again in a moment.", code: "RATE_LIMIT" });
        }
        if (response.status === 402) {
          return json(402, { error: "AI credits exhausted. Please try again later.", code: "NO_CREDITS" });
        }

        throw new Error(`Lovable AI error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!generatedImageUrl) {
        console.error("[generate-cover-image] No image in Lovable AI response:", JSON.stringify(data));
        throw new Error("No image generated in response");
      }

      // Extract base64 from data URL
      if (generatedImageUrl.startsWith("data:image")) {
        const base64Match = generatedImageUrl.match(/base64,(.+)/);
        if (base64Match) {
          generatedImageBase64 = base64Match[1];
        }
      } else {
        // If it's a URL, download and convert to base64
        const imgResponse = await fetch(generatedImageUrl);
        const imgBuffer = await imgResponse.arrayBuffer();
        generatedImageBase64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
      }

    } else {
      // ===== OPENAI (Higher quality option) =====
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured");

      console.log("[generate-cover-image] Using OpenAI gpt-image-1");
      console.log("[generate-cover-image] size:", outputSize);

      // Download input image for OpenAI
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }
      const imageBlob = await imageResponse.blob();
      console.log("[generate-cover-image] Input image size:", imageBlob.size);

      // OpenAI image edit (gpt-image-1) - COST OPTIMIZED
      const formData = new FormData();
      formData.append("model", "gpt-image-1");
      formData.append("image", imageBlob, "input.png");
      formData.append("prompt", prompt);
      formData.append("n", "1");
      formData.append("size", outputSize);
      formData.append("quality", "medium");

      const response = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[generate-cover-image] OpenAI error:", response.status, errorText);

        if (response.status === 429) {
          return json(429, { error: "Rate limit exceeded. Please try again in a moment.", code: "RATE_LIMIT" });
        }
        if (response.status === 402) {
          return json(402, { error: "Payment required. Please check your OpenAI credits.", code: "NO_CREDITS" });
        }
        if (response.status === 403) {
          return json(403, {
            error: "OpenAI rejected the request (403). Please verify your OpenAI organization.",
            code: "FORBIDDEN",
            raw: errorText,
          });
        }

        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      generatedImageBase64 = data?.data?.[0]?.b64_json;
    }

    if (!generatedImageBase64) {
      console.error("[generate-cover-image] No base64 image generated");
      throw new Error("No image generated in response");
    }

    const imageBytes = Uint8Array.from(atob(generatedImageBase64), (c) => c.charCodeAt(0));
    console.log("[generate-cover-image] Generated bytes:", imageBytes.length);

    // Upload to storage
    const fileName = `ai-covers/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: false });

    if (uploadError) {
      console.error("[generate-cover-image] Storage upload error:", uploadError);
      throw uploadError;
    }

    const { data: publicData } = supabase.storage.from("product-images").getPublicUrl(fileName);
    console.log("[generate-cover-image] Uploaded:", publicData.publicUrl);

    return json(200, { 
      imageUrl: publicData.publicUrl, 
      success: true,
      provider: modelSetting.provider 
    });
  } catch (error) {
    console.error("Error in generate-cover-image function:", error);
    return json(500, {
      error: error instanceof Error ? error.message : "Failed to generate AI image",
      details: error instanceof Error ? error.stack : undefined,
    });
  }
});
