import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HeroSettings {
  tagline: string;
  title: string;
  description: string;
}

const defaultSettings: HeroSettings = {
  tagline: "Pakistan's Premier Bridal Marketplace",
  title: "Behen.pk",
  description: "Rent or buy stunning bridal and formal wear. Share your designer pieces with your Behen and make every celebration unforgettable.",
};

export const useHeroSettings = () => {
  return useQuery({
    queryKey: ['hero-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('key, value')
        .in('key', ['hero_tagline', 'hero_title', 'hero_description']);

      if (error) {
        console.error('Error fetching hero settings:', error);
        return defaultSettings;
      }

      const settings: HeroSettings = { ...defaultSettings };
      
      data?.forEach((item) => {
        const value = item.value as string;
        if (item.key === 'hero_tagline' && value) settings.tagline = value;
        if (item.key === 'hero_title' && value) settings.title = value;
        if (item.key === 'hero_description' && value) settings.description = value;
      });

      return settings;
    },
    staleTime: 5 * 60 * 1000,
  });
};
