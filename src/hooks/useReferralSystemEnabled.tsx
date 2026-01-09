import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ReferralSystemSettings {
  referralSystemEnabled: boolean;
  earnMoneyEnabled: boolean;
}

const defaultSettings: ReferralSystemSettings = {
  referralSystemEnabled: true,
  earnMoneyEnabled: true,
};

export const useReferralSystemEnabled = () => {
  return useQuery({
    queryKey: ["referral-system-settings"],
    queryFn: async (): Promise<ReferralSystemSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["referral_system_enabled", "earn_money_enabled"]);

      if (error) {
        console.error("Error fetching referral system settings:", error);
        return defaultSettings;
      }

      const settings = { ...defaultSettings };
      
      data?.forEach((setting) => {
        if (setting.key === "referral_system_enabled") {
          settings.referralSystemEnabled = setting.value === true;
        }
        if (setting.key === "earn_money_enabled") {
          settings.earnMoneyEnabled = setting.value === true;
        }
      });

      return settings;
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });
};
