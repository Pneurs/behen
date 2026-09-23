import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "booking_confirmation" | "payment_verification" | "return_reminder" | "new_message" | "payment_uploaded" | "new_order" | "welcome" | "new_review" | "security_deposit" | "referral_bonus" | "offer_rejected" | "credits_added";
  recipientEmail?: string;
  recipientName?: string;
  data?: any;
  referrer_id?: string;
  new_user_id?: string;
}

const sendEmail = async (to: string, subject: string, html: string) => {
  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "Behen.pk <onboarding@resend.dev>",
      to: [to],
      subject: subject,
      html: html,
    }),
  });

  if (!emailResponse.ok) {
    const errorText = await emailResponse.text();
    console.error("Resend API error:", errorText);
    throw new Error(`Resend API error: ${errorText}`);
  }

  return await emailResponse.json();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: NotificationRequest = await req.json();
    const { type } = requestData;

    console.log(`Processing ${type} notification`);

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      throw new Error("Email service not configured");
    }

    // Handle referral bonus notifications separately
    if (type === "referral_bonus") {
      const { referrer_id, new_user_id } = requestData;
      
      if (!referrer_id || !new_user_id) {
        throw new Error("Missing referrer_id or new_user_id");
      }

      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

      // Get referrer profile
      const { data: referrerProfile } = await supabase
        .from("profiles")
        .select("name, user_id")
        .eq("user_id", referrer_id)
        .single();

      // Get new user profile
      const { data: newUserProfile } = await supabase
        .from("profiles")
        .select("name, user_id")
        .eq("user_id", new_user_id)
        .single();

      // Get emails from auth.users
      const { data: referrerAuth } = await supabase.auth.admin.getUserById(referrer_id);
      const { data: newUserAuth } = await supabase.auth.admin.getUserById(new_user_id);

      const referrerEmail = referrerAuth?.user?.email;
      const newUserEmail = newUserAuth?.user?.email;
      const referrerName = referrerProfile?.name || "Bari Behen";
      const newUserName = newUserProfile?.name || "Bari Behen";

      // Send email to referrer
      if (referrerEmail) {
        const referrerHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FF69B4 0%, #9b59b6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
              <h1 style="color: #fff; margin: 0;">🎉 You Earned PKR 150!</h1>
            </div>
            <p>Hi ${referrerName},</p>
            <p>Great news! Your referral <strong>${newUserName}</strong> just uploaded their first product on Behen.pk!</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <p style="margin: 0; font-size: 24px; color: #22c55e; font-weight: bold;">+PKR 150</p>
              <p style="margin: 10px 0 0 0; color: #666;">Added to your pending balance</p>
            </div>
            <p>Keep referring more behens to earn more money! Share your referral code with friends and family.</p>
            <p><a href="https://behen.pk/bari-behen-dashboard" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Your Earnings</a></p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        await sendEmail(referrerEmail, "🎉 You Earned PKR 150 from Referral! - Behen.pk", referrerHtml);
        console.log("Referrer email sent to:", referrerEmail);
      }

      // Send email to new user
      if (newUserEmail) {
        const newUserHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #FF69B4 0%, #9b59b6 100%); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
              <h1 style="color: #fff; margin: 0;">🎉 Congratulations!</h1>
              <p style="color: #fff; margin: 10px 0 0 0; font-size: 20px;">You Earned PKR 400!</p>
            </div>
            <p>Hi ${newUserName},</p>
            <p>Amazing! You've earned:</p>
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>First Product Bonus:</span>
                <strong>PKR 250</strong>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                <span>Referral Signup Bonus:</span>
                <strong>PKR 150</strong>
              </div>
              <hr style="border: none; border-top: 1px solid #ddd; margin: 10px 0;">
              <div style="display: flex; justify-content: space-between; font-size: 18px;">
                <span><strong>Total:</strong></span>
                <strong style="color: #22c55e;">PKR 400</strong>
              </div>
            </div>
            <p>🎁 <strong>Earn More!</strong> Refer your friends to Behen.pk and earn PKR 150 for each friend who uploads their first product!</p>
            <p><a href="https://behen.pk/earn-money" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Learn How to Earn More</a></p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        await sendEmail(newUserEmail, "🎉 You Earned PKR 400! - Behen.pk", newUserHtml);
        console.log("New user email sent to:", newUserEmail);
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Handle other notification types
    let { recipientEmail, recipientName, data } = requestData;
    
    // For notifications that need to fetch email from user ID
    if (!recipientEmail && data?.recipientId) {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const { data: authData } = await supabase.auth.admin.getUserById(data.recipientId);
      recipientEmail = authData?.user?.email;
      console.log(`Fetched email for user ${data.recipientId}: ${recipientEmail}`);
    }
    
    if (!recipientEmail && data?.buyerId) {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      const { data: authData } = await supabase.auth.admin.getUserById(data.buyerId);
      recipientEmail = authData?.user?.email;
      console.log(`Fetched email for buyer ${data.buyerId}: ${recipientEmail}`);
    }
    
    if (!recipientEmail) {
      console.log("No recipient email found, skipping notification");
      return new Response(JSON.stringify({ success: false, error: "No recipient email" }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending ${type} notification to ${recipientEmail}`);

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
            <p>Great news! You have received a new ${data.orderType || 'Rental'} order for <strong>${data.productTitle}</strong>.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Customer:</strong> ${data.renterName}</p>
              <p style="margin: 5px 0;"><strong>Total:</strong> PKR ${data.totalPrice}</p>
              <p style="margin: 5px 0;"><strong>Status:</strong> ⏳ Waiting for payment confirmation</p>
            </div>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;">⏰ Payment verification typically takes up to <strong>8 hours</strong>.</p>
              <p style="margin: 10px 0 0 0;">You'll be notified once payment is confirmed.</p>
            </div>
            <p><a href="https://behen.pk/chats" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Chats</a></p>
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

      case "new_review":
        subject = "You have a new review on your product! - Behen.pk";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FF69B4;">New Review Received! ⭐</h1>
            <p>Hi ${recipientName},</p>
            <p>You have received a new review on your product <strong>${data.productTitle}</strong>.</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Rating:</strong> ${'⭐'.repeat(data.rating)}</p>
              ${data.reviewText ? `<p style="margin: 10px 0;"><strong>Review:</strong> "${data.reviewText}"</p>` : ''}
            </div>
            <p>Please respond to this review politely to maintain good customer relations.</p>
            <p><a href="${data.productLink || 'https://behen.pk'}" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View & Respond</a></p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        break;

      case "security_deposit":
        subject = data.action === "sent" ? "Security Deposit Sent! - Behen.pk" : "Security Deposit Update - Behen.pk";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: ${data.action === "sent" ? '#22c55e' : '#f59e0b'};">${data.action === "sent" ? "Security Deposit Sent! 💰" : "Security Deposit Update"}</h1>
            <p>Hi ${recipientName},</p>
            <p>${data.message}</p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>Product:</strong> ${data.productTitle}</p>
              <p style="margin: 5px 0;"><strong>Amount:</strong> PKR ${data.amount}</p>
              ${data.notes ? `<p style="margin: 10px 0;"><strong>Notes:</strong> ${data.notes}</p>` : ''}
            </div>
            <p><a href="https://behen.pk/my-bookings" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Details</a></p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        break;

      case "offer_rejected":
        subject = "Offer Update - Behen.pk";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #f59e0b;">Your Offer Was Not Accepted</h1>
            <p>Hi ${recipientName || 'Choti Behen'},</p>
            <p>The seller has not accepted your offer for <strong>${data?.productTitle || 'the product'}</strong>.</p>
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0;">Don't worry! You can:</p>
              <ul style="margin: 10px 0 0 0;">
                <li>Send a new offer with adjusted terms</li>
                <li>Continue chatting to negotiate</li>
                <li>Browse other similar products</li>
              </ul>
            </div>
            <p><a href="${data?.chatLink || 'https://behen.pk/all-chats'}" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Continue Chat</a></p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        break;

      case "credits_added":
        subject = "Your credits are ready 🎉 - Behen.pk";
        html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #FF69B4;">Payment Verified — Credits Added!</h1>
            <p>Hi ${recipientName || 'Behen'},</p>
            <p>We've verified your payment and added <strong>${data?.credits || ''} credits</strong> to your account.</p>
            <div style="background: #fdf2f8; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF69B4;">
              <p style="margin: 5px 0;"><strong>Credits added:</strong> ${data?.credits || ''}</p>
              ${data?.amount ? `<p style="margin: 5px 0;"><strong>Amount paid:</strong> PKR ${data.amount}</p>` : ''}
              ${data?.reference ? `<p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${data.reference}</p>` : ''}
              ${data?.balance !== undefined ? `<p style="margin: 5px 0;"><strong>New balance:</strong> ${data.balance} credits</p>` : ''}
            </div>
            <p>You can now use your credits to view seller contact details.</p>
            <p><a href="https://behen.pk/credits" style="background: #FF69B4; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View My Credits</a></p>
            <p>Best regards,<br>Behen.pk Team</p>
          </div>
        `;
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    const emailData = await sendEmail(recipientEmail, subject, html);
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
