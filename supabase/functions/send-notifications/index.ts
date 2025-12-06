import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "booking_confirmation" | "payment_verification" | "return_reminder" | "new_message" | "payment_uploaded" | "new_order" | "welcome";
  recipientEmail: string;
  recipientName: string;
  data: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, recipientEmail, recipientName, data }: NotificationRequest = await req.json();

    console.log(`Sending ${type} notification to ${recipientEmail}`);

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    let subject = "";
    let html = "";

    switch (type) {
      case "welcome":
        subject = "Welcome to Behen.pk! 🎉";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FF69B4;">Welcome to Behen.pk!</h1>
            <p>Hi ${recipientName},</p>
            <p>Thank you for joining Behen.pk - Pakistan's premier dress rental marketplace!</p>
            <p>You can now:</p>
            <ul>
              <li>Browse hundreds of beautiful dresses</li>
              <li>List your own dresses for rent</li>
              <li>Connect with other fashion-loving behens</li>
            </ul>
            <p><a href="https://behen.pk" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Start Exploring</a></p>
            <p>Best regards,<br>The Behen.pk Team</p>
          </div>
        `;
        break;

      case "booking_confirmation":
        subject = "Booking Confirmed - Behen.pk";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FF69B4;">Booking Confirmed! 🎉</h1>
            <p>Hi ${recipientName},</p>
            <p>Your booking for <strong>${data.productTitle}</strong> has been confirmed.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Dates:</strong> ${data.startDate} to ${data.endDate}</p>
              <p style="margin: 5px 0;"><strong>Rent:</strong> PKR ${data.totalPrice}</p>
              <p style="margin: 5px 0;"><strong>Security Deposit:</strong> PKR ${data.securityDeposit}</p>
              <p style="margin: 5px 0; font-size: 18px;"><strong>Total:</strong> PKR ${Number(data.totalPrice) + Number(data.securityDeposit)}</p>
            </div>
            <p>Please upload payment proof to proceed with your booking.</p>
            <p><a href="https://behen.pk/my-bookings" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Booking</a></p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        break;

      case "payment_uploaded":
        subject = "Payment Proof Received - Behen.pk";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FF69B4;">Payment Proof Received</h1>
            <p>Hi ${recipientName},</p>
            <p>Payment proof has been uploaded for <strong>${data.productTitle}</strong>.</p>
            <p>Order ID: #${data.orderId?.slice(0, 8)}</p>
            <p>Amount: PKR ${data.amount}</p>
            <p>Our admin team will verify the payment shortly. You will receive a notification once verified.</p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        break;

      case "payment_verification":
        subject = data.verified ? "Payment Verified ✓ - Behen.pk" : "Payment Verification Required - Behen.pk";
        html = data.verified 
          ? `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #22c55e;">Payment Verified! ✓</h1>
              <p>Hi ${recipientName},</p>
              <p>Great news! Your payment for <strong>${data.productTitle}</strong> has been verified.</p>
              <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
                <p style="margin: 0;">✅ Contact details are now unlocked</p>
                <p style="margin: 10px 0 0 0;">✅ You can now coordinate pickup with the owner</p>
              </div>
              <p><a href="https://behen.pk/my-bookings" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Order Details</a></p>
              <p>Best regards,<br>Behen.pk Team</p>
            </div>
          `
          : `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #ef4444;">Payment Verification Failed</h1>
              <p>Hi ${recipientName},</p>
              <p>Unfortunately, your payment proof for <strong>${data.productTitle}</strong> could not be verified.</p>
              <p>Please upload a clear screenshot of your payment receipt to continue.</p>
              <p><a href="https://behen.pk/my-bookings" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Upload New Proof</a></p>
              <p>Best regards,<br>Behen.pk Team</p>
            </div>
          `;
        break;

      case "new_order":
        subject = "New Order Received! - Behen.pk";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FF69B4;">New Order Received! 🎊</h1>
            <p>Hi ${recipientName},</p>
            <p>Great news! You have received a new order for <strong>${data.productTitle}</strong>.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Renter:</strong> ${data.renterName}</p>
              <p style="margin: 5px 0;"><strong>Dates:</strong> ${data.startDate} to ${data.endDate}</p>
              <p style="margin: 5px 0;"><strong>Rent:</strong> PKR ${data.totalPrice}</p>
            </div>
            <p>The renter will upload payment proof. Once verified, you'll be notified to prepare the item.</p>
            <p><a href="https://behen.pk/bari-behen-dashboard" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Dashboard</a></p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        break;

      case "return_reminder":
        subject = "Return Reminder - Behen.pk";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: ${data.daysRemaining > 0 ? '#f59e0b' : '#ef4444'};">Return Reminder</h1>
            <p>Hi ${recipientName},</p>
            <p>This is a reminder about your rental of <strong>${data.productTitle}</strong>.</p>
            <div style="background: ${data.daysRemaining > 0 ? '#fef3c7' : '#fee2e2'}; padding: 15px; border-radius: 8px; margin: 20px 0;">
              ${data.daysRemaining > 0 
                ? `<p style="margin: 0;">⏰ You have <strong>${data.daysRemaining} day(s)</strong> remaining to return the item.</p>` 
                : `<p style="margin: 0; color: #ef4444;"><strong>⚠️ Your rental period has ended!</strong></p>
                   <p style="margin: 10px 0 0 0;">Please return the item immediately to avoid penalties.</p>`
              }
            </div>
            <p>Late return penalty: <strong>PKR ${data.penaltyAmount}</strong> per day</p>
            <p><a href="https://behen.pk/my-bookings" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Booking</a></p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        break;

      case "new_message":
        subject = "New Message - Behen.pk";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FF69B4;">You have a new message! 💬</h1>
            <p>Hi ${recipientName},</p>
            <p><strong>${data.senderName}</strong> sent you a message${data.productTitle ? ` about <strong>${data.productTitle}</strong>` : ''}:</p>
            <blockquote style="background: #f5f5f5; padding: 15px; border-left: 4px solid #FF69B4; margin: 20px 0; border-radius: 0 8px 8px 0;">
              ${data.message}
            </blockquote>
            <p><a href="${data.chatLink || 'https://behen.pk/all-chats'}" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Conversation</a></p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Behen.pk <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: subject,
        html: html,
      }),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Resend API error: ${errorText}`);
    }

    const emailData = await emailResponse.json();
    console.log("Email sent successfully:", emailData);

    return new Response(JSON.stringify({ success: true, data: emailData }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
