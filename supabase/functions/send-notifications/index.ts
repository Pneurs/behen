import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  type: "booking_confirmation" | "payment_verification" | "return_reminder" | "new_message";
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

    let subject = "";
    let html = "";

    switch (type) {
      case "booking_confirmation":
        subject = "Booking Confirmation - Behen.pk";
        html = `
          <h1>Booking Confirmed!</h1>
          <p>Hi ${recipientName},</p>
          <p>Your booking for <strong>${data.productTitle}</strong> has been confirmed.</p>
          <p><strong>Booking Details:</strong></p>
          <ul>
            <li>Dates: ${data.startDate} to ${data.endDate}</li>
            <li>Total: Rs. ${data.totalPrice}</li>
            <li>Security Deposit: Rs. ${data.securityDeposit}</li>
          </ul>
          <p>Please upload payment proof to proceed with your booking.</p>
          <p>Best regards,<br>Behen.pk Team</p>
        `;
        break;

      case "payment_verification":
        subject = data.verified ? "Payment Verified - Behen.pk" : "Payment Verification Required - Behen.pk";
        html = data.verified 
          ? `
            <h1>Payment Verified!</h1>
            <p>Hi ${recipientName},</p>
            <p>Your payment for <strong>${data.productTitle}</strong> has been verified by our admin.</p>
            <p>Your booking is now confirmed. Enjoy your rental!</p>
            <p>Best regards,<br>Behen.pk Team</p>
          `
          : `
            <h1>Payment Verification Required</h1>
            <p>Hi ${recipientName},</p>
            <p>A payment has been submitted for <strong>${data.productTitle}</strong>.</p>
            <p>Please verify the payment in your admin dashboard.</p>
            <p>Best regards,<br>Behen.pk Team</p>
          `;
        break;

      case "return_reminder":
        subject = "Return Reminder - Behen.pk";
        html = `
          <h1>Return Reminder</h1>
          <p>Hi ${recipientName},</p>
          <p>This is a reminder that your rental period for <strong>${data.productTitle}</strong> ends on ${data.endDate}.</p>
          <p>${data.daysRemaining > 0 
            ? `You have ${data.daysRemaining} day(s) remaining.` 
            : `<strong style="color: red;">Your rental period has ended. Please return the item immediately to avoid penalties.</strong>`
          }</p>
          <p>Penalty for late returns: Rs. ${data.penaltyAmount} per day</p>
          <p>Best regards,<br>Behen.pk Team</p>
        `;
        break;

      case "new_message":
        subject = "New Message - Behen.pk";
        html = `
          <h1>You have a new message!</h1>
          <p>Hi ${recipientName},</p>
          <p><strong>${data.senderName}</strong> sent you a message about <strong>${data.productTitle}</strong>:</p>
          <blockquote style="background: #f5f5f5; padding: 10px; border-left: 3px solid #333;">
            ${data.message}
          </blockquote>
          <p><a href="${data.chatLink}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; display: inline-block;">View Conversation</a></p>
          <p>Best regards,<br>Behen.pk Team</p>
        `;
        break;
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
      throw new Error(`Resend API error: ${await emailResponse.text()}`);
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
