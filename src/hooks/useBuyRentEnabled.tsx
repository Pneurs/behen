import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBuyRentEnabled() {
  const [buyEnabled, setBuyEnabled] = useState(true);
  const [rentEnabled, setRentEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", ["buy_now_enabled", "rent_now_enabled"]);

        if (!error && data) {
          data.forEach((setting) => {
            const value = setting.value as { enabled?: boolean };
            if (setting.key === "buy_now_enabled") {
              setBuyEnabled(value.enabled !== false);
            } else if (setting.key === "rent_now_enabled") {
              setRentEnabled(value.enabled !== false);
            }
          });
        }
      } catch (e) {
        console.error("Error fetching buy/rent settings:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { buyEnabled, rentEnabled, loading };
}
