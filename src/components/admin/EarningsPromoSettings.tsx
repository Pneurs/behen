import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useEarningsPromoSettings } from "@/hooks/useEarningsPromoSettings";
import { Loader2, Gift, Save } from "lucide-react";
import { Json } from "@/integrations/supabase/types";

const EarningsPromoSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useEarningsPromoSettings();

  const [enabled, setEnabled] = useState(true);
  const [title, setTitle] = useState("Earn Money with Behen.pk! 💰");
  const [description, setDescription] = useState("Upload your product & get");
  const [productBonusAmount, setProductBonusAmount] = useState(250);
  const [referralBonusAmount, setReferralBonusAmount] = useState(150);
  const [buttonText, setButtonText] = useState("Learn More");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setTitle(settings.title);
      setDescription(settings.description);
      setProductBonusAmount(settings.productBonusAmount);
      setReferralBonusAmount(settings.referralBonusAmount);
      setButtonText(settings.buttonText);
    }
  }, [settings]);

  const upsertSetting = async (key: string, value: Json) => {
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    if (error) throw error;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        upsertSetting("earnings_promo_enabled", { enabled }),
        upsertSetting("earnings_promo_title", { text: title }),
        upsertSetting("earnings_promo_description", { text: description }),
        upsertSetting("earnings_product_bonus_amount", { amount: productBonusAmount }),
        upsertSetting("earnings_referral_bonus_amount", { amount: referralBonusAmount }),
        upsertSetting("earnings_promo_button_text", { text: buttonText }),
      ]);

      await queryClient.invalidateQueries({ queryKey: ["earnings-promo-settings"] });

      toast({
        title: "Settings Saved",
        description: "Earnings promo settings have been updated successfully.",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Earnings Promo Popup Settings
        </CardTitle>
        <CardDescription>
          Configure the earnings promotional popup shown to Bari Behens. These values also update the Earn Money page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <Label className="text-base font-medium">Enable Popup</Label>
            <p className="text-sm text-muted-foreground">
              Show the earnings promo popup to Bari Behens
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Popup Title */}
        <div className="space-y-2">
          <Label htmlFor="title">Popup Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Earn Money with Behen.pk! 💰"
          />
        </div>

        {/* Popup Description */}
        <div className="space-y-2">
          <Label htmlFor="description">Popup Description</Label>
          <Input
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Upload your product & get"
          />
          <p className="text-xs text-muted-foreground">
            The bonus amount will be appended automatically
          </p>
        </div>

        {/* Bonus Amounts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="productBonus">First Product Bonus (PKR)</Label>
            <Input
              id="productBonus"
              type="number"
              value={productBonusAmount}
              onChange={(e) => setProductBonusAmount(Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Amount given for first product upload
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="referralBonus">Referral Bonus (PKR)</Label>
            <Input
              id="referralBonus"
              type="number"
              value={referralBonusAmount}
              onChange={(e) => setReferralBonusAmount(Number(e.target.value))}
              min={0}
            />
            <p className="text-xs text-muted-foreground">
              Amount given for each referral
            </p>
          </div>
        </div>

        {/* Button Text */}
        <div className="space-y-2">
          <Label htmlFor="buttonText">Button Text</Label>
          <Input
            id="buttonText"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
            placeholder="Learn More"
          />
        </div>

        {/* Preview */}
        <div className="p-4 bg-gradient-to-r from-primary to-pink-500 text-white rounded-lg">
          <p className="text-xs uppercase tracking-wide mb-2 opacity-80">Preview</p>
          <h3 className="font-bold text-lg mb-1">{title}</h3>
          <p className="text-sm opacity-90">
            {description} <strong>PKR {productBonusAmount} instantly</strong>
          </p>
          <p className="text-sm opacity-90">
            OR Share & earn <strong>PKR {referralBonusAmount}</strong> each!
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default EarningsPromoSettings;
