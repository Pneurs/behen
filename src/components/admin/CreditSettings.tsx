import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Coins, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCreditSettings, CreditPackage } from "@/hooks/useCredits";
import { useQueryClient } from "@tanstack/react-query";

export default function CreditSettings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useCreditSettings();

  const [enabled, setEnabled] = useState(true);
  const [cost, setCost] = useState(1);
  const [signupGrant, setSignupGrant] = useState(0);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setCost(settings.costPerUnlock);
      setSignupGrant(settings.signupGrant);
      setPackages(settings.packages);
    }
  }, [settings]);

  const save = async () => {
    setSaving(true);
    try {
      const rows = [
        { key: "credit_system_enabled", value: { enabled } },
        { key: "credit_cost_per_unlock", value: { cost: Math.max(1, cost) } },
        { key: "credit_signup_grant", value: { credits: Math.max(0, signupGrant) } },
        { key: "credit_packages", value: packages.filter((p) => p.credits > 0 && p.price >= 0) },
      ];

      for (const row of rows) {
        const { error } = await supabase
          .from("app_settings")
          .upsert({ key: row.key, value: row.value as any }, { onConflict: "key" });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["credit-settings"] });
      toast.success("Credit settings saved");
    } catch (e: any) {
      toast.error(e.message || "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Credits for Seller Contacts
        </CardTitle>
        <CardDescription>
          Buyers spend credits to see a seller's contact details. Turn this off to show contact details to every signed-in buyer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Credit system</p>
            <p className="text-sm text-muted-foreground">
              {enabled ? "Contact details are locked behind credits" : "Contact details are free for signed-in buyers"}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="cost">Credits per unlock</Label>
            <Input
              id="cost"
              type="number"
              min={1}
              value={cost}
              onChange={(e) => setCost(Number(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="grant">Free credits on signup</Label>
            <Input
              id="grant"
              type="number"
              min={0}
              value={signupGrant}
              onChange={(e) => setSignupGrant(Number(e.target.value))}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Credit packages</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPackages([...packages, { credits: 1, price: 100 }])}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add package
            </Button>
          </div>

          {packages.map((pkg, i) => (
            <div key={i} className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Credits</Label>
                <Input
                  type="number"
                  min={1}
                  value={pkg.credits}
                  onChange={(e) => {
                    const next = [...packages];
                    next[i] = { ...next[i], credits: Number(e.target.value) };
                    setPackages(next);
                  }}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Price (PKR)</Label>
                <Input
                  type="number"
                  min={0}
                  value={pkg.price}
                  onChange={(e) => {
                    const next = [...packages];
                    next[i] = { ...next[i], price: Number(e.target.value) };
                    setPackages(next);
                  }}
                />
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs">Original price (PKR, optional)</Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 600"
                  value={pkg.originalPrice ?? ""}
                  onChange={(e) => {
                    const next = [...packages];
                    next[i] = {
                      ...next[i],
                      originalPrice: e.target.value === "" ? undefined : Number(e.target.value),
                    };
                    setPackages(next);
                  }}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setPackages(packages.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Save Credit Settings
        </Button>
      </CardContent>
    </Card>
  );
}
