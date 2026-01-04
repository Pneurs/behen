import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EarningsPromoSettings {
  enabled: boolean;
  title: string;
  description: string;
  productBonusAmount: number;
  referralBonusAmount: number;
  buttonText: string;
}

const defaultSettings: EarningsPromoSettings = {
  enabled: true,
  title: "Earn Money with Behen.pk! 💰",
  description: "Upload your product & get",
  productBonusAmount: 250,
  referralBonusAmount: 150,
  buttonText: "Learn More",
};

export const useEarningsPromoSettings = () => {
  return useQuery({
    queryKey: ["earnings-promo-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [
          "earnings_promo_enabled",
          "earnings_promo_title",
          "earnings_promo_description",
          "earnings_product_bonus_amount",
          "earnings_referral_bonus_amount",
          "earnings_promo_button_text",
        ]);

      if (error) {
        console.error("Error fetching earnings promo settings:", error);
        return defaultSettings;
      }

      const settingsMap: Record<string, any> = {};
      data?.forEach((item) => {
        settingsMap[item.key] = item.value;
      });

      return {
        enabled: settingsMap.earnings_promo_enabled?.enabled ?? defaultSettings.enabled,
        title: settingsMap.earnings_promo_title?.text ?? defaultSettings.title,
        description: settingsMap.earnings_promo_description?.text ?? defaultSettings.description,
        productBonusAmount: settingsMap.earnings_product_bonus_amount?.amount ?? defaultSettings.productBonusAmount,
        referralBonusAmount: settingsMap.earnings_referral_bonus_amount?.amount ?? defaultSettings.referralBonusAmount,
        buttonText: settingsMap.earnings_promo_button_text?.text ?? defaultSettings.buttonText,
      } as EarningsPromoSettings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
