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

    // Create product photoshoot prompt
    const productTypeLabel = product_type === "dress" ? "lehnga" : product_type;
    
    const prompt = `Transform this into a professional product photoshoot: A faceless mannequin wearing the ${productTypeLabel} standing straight. Pure white background, studio lighting. The ${productTypeLabel} must be exactly the same - same colors, embroidery, patterns, and details. Only replace the person with a mannequin, keep everything else identical.`;

    console.log("Generating mannequin image with OpenAI gpt-image-1");
    console.log("Prompt:", prompt);
    console.log("Image URL:", imageUrl);

    // Download the image from URL
    console.log("Downloading image from URL...");
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }
    const imageBlob = await imageResponse.blob();
    console.log("Image downloaded, size:", imageBlob.size);

    // Create form data for OpenAI edits endpoint
    const formData = new FormData();
    formData.append("model", "gpt-image-1");
    formData.append("image", imageBlob, "input.png");
    formData.append("prompt", prompt);
    formData.append("n", "1");
    formData.append("size", "1024x1024");

    // Call OpenAI Image Edit API
    const response = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
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
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("OpenAI response received");

    // Extract the generated image (base64 format)
    const generatedImageBase64 = data.data?.[0]?.b64_json;
    
    if (!generatedImageBase64) {
      // Check if URL format was returned instead
      const generatedImageUrl = data.data?.[0]?.url;
      if (generatedImageUrl) {
        // Download the image from OpenAI's URL
        console.log("Downloading generated image from OpenAI URL...");
        const genImageResponse = await fetch(generatedImageUrl);
        const genImageBlob = await genImageResponse.blob();
        const genImageBuffer = await genImageBlob.arrayBuffer();
        const imageBytes = new Uint8Array(genImageBuffer);
        
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const supabase = createClient(supabaseUrl, supabaseKey);

        const fileName = `ai-covers/${crypto.randomUUID()}.png`;
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
      }
      
      console.error("No image in response:", JSON.stringify(data));
      throw new Error("No image generated in response");
    }

    // Convert base64 to bytes
    const imageBytes = Uint8Array.from(atob(generatedImageBase64), c => c.charCodeAt(0));

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
