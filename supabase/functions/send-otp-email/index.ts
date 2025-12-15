import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  token: string;
  redirectUrl: string;
  type?: "signup" | "recovery";
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, token, redirectUrl, type = "signup" }: VerificationEmailRequest = await req.json();

    if (!email || !token) {
      console.error("Missing email or token in request");
      return new Response(
        JSON.stringify({ error: "Email and token are required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log(`Sending verification email to ${email} for ${type}`);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Build verification URL
    const verificationUrl = `${redirectUrl}?token=${token}&email=${encodeURIComponent(email)}&type=${type}`;
    
    const subject = type === "recovery" 
      ? "Reset your password - Behen.pk" 
      : "Welcome to Behen.pk - Verify your email";
    
    const buttonText = type === "recovery" ? "Reset Password" : "Verify Email";
    const description = type === "recovery" 
      ? "Click the button below to reset your password:"
      : "Click the button below to verify your email and start using Behen.pk:";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Behen.pk <no-reply@behen.pk>",
        to: [email],
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; padding: 20px 0; background: linear-gradient(135deg, #FF69B4, #FFB6C1); border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">Behen.pk</h1>
              <p style="color: white; margin: 5px 0 0; font-size: 14px;">بہنیں تو سب شیئر کرتی ہیں</p>
            </div>
            <div style="padding: 30px; background: #fff; border: 1px solid #eee; border-top: none;">
              <p style="font-size: 16px; color: #333; margin-bottom: 20px;">${description}</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #FF69B4, #FFB6C1); color: white; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">${buttonText}</a>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 20px;">If the button doesn't work, copy and paste this link in your browser:</p>
              <p style="font-size: 12px; color: #999; word-break: break-all;">${verificationUrl}</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="font-size: 12px; color: #999; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", data);
      throw new Error(data.message || "Failed to send email");
    }

    console.log("Verification email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending verification email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
