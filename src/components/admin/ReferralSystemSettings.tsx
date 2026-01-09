import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Gift, Wallet } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export default function ReferralSystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [referralSystemEnabled, setReferralSystemEnabled] = useState(true);
  const [earnMoneyEnabled, setEarnMoneyEnabled] = useState(true);
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", ["referral_system_enabled", "earn_money_enabled"]);

      if (error) throw error;

      data?.forEach((setting) => {
        if (setting.key === "referral_system_enabled") {
          setReferralSystemEnabled(setting.value === true);
        }
        if (setting.key === "earn_money_enabled") {
          setEarnMoneyEnabled(setting.value === true);
        }
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Upsert referral_system_enabled
      const { error: error1 } = await supabase
        .from("app_settings")
        .upsert({
          key: "referral_system_enabled",
          value: referralSystemEnabled,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });

      if (error1) throw error1;

      // Upsert earn_money_enabled
      const { error: error2 } = await supabase
        .from("app_settings")
        .upsert({
          key: "earn_money_enabled",
          value: earnMoneyEnabled,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        }, { onConflict: "key" });

      if (error2) throw error2;

      // Invalidate the query cache so components refetch
      queryClient.invalidateQueries({ queryKey: ["referral-system-settings"] });

      toast.success("Settings saved successfully");
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Referral & Earnings System
        </CardTitle>
        <CardDescription>
          Control the referral bonus system and earnings features across the platform
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="referral-system" className="text-base">Referral System</Label>
            <p className="text-sm text-muted-foreground">
              When disabled: hides referral code field during signup, hides earnings/ambassador section in Bari Behen dashboard, and hides referral bonuses
            </p>
          </div>
          <Switch
            id="referral-system"
            checked={referralSystemEnabled}
            onCheckedChange={setReferralSystemEnabled}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="earn-money" className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              "Earn Money" Menu
            </Label>
            <p className="text-sm text-muted-foreground">
              When disabled: hides the "Earn Money" button from the header navigation
            </p>
          </div>
          <Switch
            id="earn-money"
            checked={earnMoneyEnabled}
            onCheckedChange={setEarnMoneyEnabled}
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
