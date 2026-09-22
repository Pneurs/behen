import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// AI cover image generation is OFF by default; super admin can turn it on.
export function useAiImageEnabled() {
  const { data, isLoading } = useQuery({
    queryKey: ["ai-image-generation-enabled"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "ai_image_generation_enabled")
        .maybeSingle();

      if (error) return false;
      const value = data?.value as { enabled?: boolean } | null;
      return value?.enabled === true;
    },
    staleTime: 5 * 60 * 1000,
  });

  return { aiImageEnabled: data === true, loading: isLoading };
}
