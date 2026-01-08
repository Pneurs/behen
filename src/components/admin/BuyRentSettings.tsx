import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Calendar } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const BuyRentSettings = () => {
  const [buyEnabled, setBuyEnabled] = useState(true);
  const [rentEnabled, setRentEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

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
        console.error("Error fetching settings:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert buy_now_enabled
      await supabase
        .from("app_settings")
        .upsert(
          { key: "buy_now_enabled", value: { enabled: buyEnabled } },
          { onConflict: "key" }
        );

      // Upsert rent_now_enabled
      await supabase
        .from("app_settings")
        .upsert(
          { key: "rent_now_enabled", value: { enabled: rentEnabled } },
          { onConflict: "key" }
        );

      queryClient.invalidateQueries({ queryKey: ["buy-rent-settings"] });
      toast.success("Settings saved successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5" />
          Buy & Rent Buttons
        </CardTitle>
        <CardDescription>
          Enable or disable Buy Now and Rent Now buttons across the website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Buy Now Button
            </Label>
            <p className="text-sm text-muted-foreground">
              When disabled, users cannot purchase products
            </p>
          </div>
          <Switch
            checked={buyEnabled}
            onCheckedChange={setBuyEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Rent Now Button
            </Label>
            <p className="text-sm text-muted-foreground">
              When disabled, users cannot rent products
            </p>
          </div>
          <Switch
            checked={rentEnabled}
            onCheckedChange={setRentEnabled}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
};

export default BuyRentSettings;
