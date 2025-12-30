import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BrandingSettings {
  logoType: 'text' | 'image';
  logoUrl: string | null;
  faviconUrl: string | null;
}

export const useBranding = () => {
  return useQuery({
    queryKey: ['branding-settings'],
    queryFn: async (): Promise<BrandingSettings> => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['branding_logo_type', 'branding_logo_url', 'branding_favicon_url']);
      
      if (error) {
        console.error('Error fetching branding settings:', error);
        return { logoType: 'text', logoUrl: null, faviconUrl: null };
      }

      const settings: BrandingSettings = {
        logoType: 'text',
        logoUrl: null,
        faviconUrl: null,
      };

      data?.forEach((item) => {
        const value = item.value as { type?: string; url?: string };
        if (item.key === 'branding_logo_type' && value?.type) {
          settings.logoType = value.type as 'text' | 'image';
        } else if (item.key === 'branding_logo_url' && value?.url) {
          settings.logoUrl = value.url;
        } else if (item.key === 'branding_favicon_url' && value?.url) {
          settings.faviconUrl = value.url;
        }
      });

      return settings;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
