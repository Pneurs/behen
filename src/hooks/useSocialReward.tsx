import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SocialRewardSettings {
  enabled: boolean;
  credits: number;
  instagram: string;
  tiktok: string;
}

const DEFAULTS: SocialRewardSettings = {
  enabled: true,
  credits: 3,
  instagram: "https://www.instagram.com/behen.pk",
  tiktok: "https://www.tiktok.com/@behen.pk",
};

export const useSocialRewardSettings = () => {
  return useQuery({
    queryKey: ["social-reward-settings"],
    queryFn: async (): Promise<SocialRewardSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "social_follow_reward")
        .maybeSingle();

      if (error || !data) return DEFAULTS;
      const value = data.value as any;
      return {
        enabled: value?.enabled !== false,
        credits: Number(value?.credits ?? 3) || 3,
        instagram: value?.instagram || DEFAULTS.instagram,
        tiktok: value?.tiktok || DEFAULTS.tiktok,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useSocialRewardClaimed = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["social-reward-claim", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("social_follow_claims")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
    staleTime: 60 * 1000,
  });
};

export const useClaimSocialReward = () => {
  const queryClient = useQueryClient();

  const claim = async () => {
    const { data, error } = await supabase.rpc("claim_social_follow_reward");
    if (error) throw error;
    const result = data as { success: boolean; reason?: string; credits?: number };
    if (result?.success) {
      queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["social-reward-claim"] });
    }
    return result;
  };

  return { claim };
};
