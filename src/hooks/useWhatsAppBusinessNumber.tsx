import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useWhatsAppBusinessNumber() {
  const [businessNumber, setBusinessNumber] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNumber = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "whatsapp_business_number")
          .maybeSingle();

        if (!error && data) {
          const value = data.value as { number?: string };
          setBusinessNumber(value.number || "");
        }
      } catch (e) {
        console.error("Error fetching WhatsApp business number:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchNumber();
  }, []);

  return { businessNumber, loading };
}

// Normalize a Pakistani phone number to digits-only international format for wa.me links
export function normalizePhoneForWhatsApp(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0092")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = "92" + digits.slice(1);
  return digits;
}
