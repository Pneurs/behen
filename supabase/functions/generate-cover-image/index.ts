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

    // Get Lovable API key
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
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

    // Simple and direct prompt for mannequin generation
    const productTypeLabel = product_type === "dress" ? "lehnga" : product_type;
    
    const prompt = `A faceless mannequin wearing your ${productTypeLabel}. This one but ${productTypeLabel} should be exactly the same.`;

    console.log("Generating mannequin image with Lovable AI");
    console.log("Prompt:", prompt);

    // Call Lovable AI for high-fidelity image generation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ["image", "text"]
      }),
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
      console.error("Lovable AI API error:", response.status, errorText);
      throw new Error(`Lovable AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log("Lovable AI response received");

    // Extract the generated image from base64
    const generatedImageBase64 = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!generatedImageBase64) {
      throw new Error("No image generated in response");
    }

    // Convert base64 to bytes
    const base64Data = generatedImageBase64.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

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
