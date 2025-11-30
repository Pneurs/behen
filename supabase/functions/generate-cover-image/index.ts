import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageUrl, title, description, category, product_type, fabric, color } = await req.json();

    // Get OpenAI API key
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    // Validate image quality before processing
    if (!imageUrl || imageUrl.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "Please upload at least one clear image of your dress",
          code: "INVALID_IMAGE"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create ultra-strict prompt for 100% accuracy mannequin reconstruction
    // Note: OpenAI image edits API has 1000 char limit
    const productTypeLabel = product_type === "dress" ? "dress" : product_type;
    
    let prompt = `Recreate ${productTypeLabel} on faceless mannequin. Match 100%: colors${color ? ' (' + color + ')' : ''}, embroidery, sequins, borders, pleats, texture${fabric ? ' (' + fabric + ')' : ''}, neckline, sleeves, hem, dupatta, silhouette. NO redesign, alteration, or simplification. Replace human only. White studio background, soft lighting, centered full-length front view, photorealistic. No props, jewelry, accessories. Exact reconstruction from reference images, zero creative interpretation.`;

    console.log("Generating mannequin image with OpenAI gpt-image-1");
    console.log("Prompt:", prompt);

    // Call OpenAI gpt-image-1 for high-fidelity image generation
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: await createFormData(imageUrl, prompt),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: "Rate limit exceeded. Please try again in a moment.",
            code: "RATE_LIMIT"
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: "Payment required. Please check your OpenAI credits.",
            code: "NO_CREDITS"
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("OpenAI response received");

    // Extract the generated image URL
    const generatedImageUrl = data.data?.[0]?.url;
    
    if (!generatedImageUrl) {
      throw new Error("No image generated in response");
    }

    // Download the image from OpenAI
    const imageResponse = await fetch(generatedImageUrl);
    const imageBlob = await imageResponse.blob();
    const imageBuffer = await imageBlob.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Generate unique filename
    const fileName = `ai-covers/${crypto.randomUUID()}.png`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    console.log("Mannequin image uploaded successfully:", publicUrl);

    return new Response(
      JSON.stringify({ 
        imageUrl: publicUrl,
        success: true 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Error in generate-cover-image function:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to generate mannequin image",
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to create FormData for OpenAI API
async function createFormData(imageUrl: string, prompt: string): Promise<FormData> {
  const formData = new FormData();
  
  // Download the image from the URL
  const imageResponse = await fetch(imageUrl);
  const imageBlob = await imageResponse.blob();
  
  formData.append("image", imageBlob, "dress.png");
  formData.append("prompt", prompt);
  formData.append("n", "1");
  formData.append("size", "512x512");
  
  return formData;
}
