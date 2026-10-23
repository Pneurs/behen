import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type UploadAnnouncement = { enabled: boolean; text: string };

export const useUploadAnnouncement = () =>
  useQuery({
    queryKey: ["upload-page-announcement"],
    queryFn: async (): Promise<UploadAnnouncement> => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "upload_page_announcement")
        .maybeSingle();
      const v = data?.value as Partial<UploadAnnouncement> | null;
      return { enabled: v?.enabled === true, text: v?.text ?? "" };
    },
    staleTime: 5 * 60 * 1000,
  });
