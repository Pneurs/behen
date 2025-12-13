import { supabase } from "@/integrations/supabase/client";

interface EmailNotification {
  type: "booking_confirmation" | "payment_verification" | "return_reminder" | "new_message" | "payment_uploaded" | "new_order" | "welcome" | "new_review" | "security_deposit";
  recipientEmail: string;
  recipientName: string;
  data: any;
}

export const sendEmailNotification = async (notification: EmailNotification) => {
  try {
    console.log("Sending email notification:", notification.type, "to", notification.recipientEmail);
    
    const { data, error } = await supabase.functions.invoke("send-notifications", {
      body: notification,
    });

    if (error) {
      console.error("Error sending email notification:", error);
      return { success: false, error };
    }

    console.log("Email notification sent successfully:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Error invoking email function:", error);
    return { success: false, error };
  }
};
