import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useChatEnabled() {
  const [chatEnabled, setChatEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChatStatus = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "chat_system_enabled")
          .single();

        if (!error && data?.value) {
          const value = data.value as { enabled?: boolean };
          setChatEnabled(value.enabled !== false);
        }
      } catch (e) {
        console.error("Error fetching chat status:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchChatStatus();
  }, []);

  return { chatEnabled, loading };
}
