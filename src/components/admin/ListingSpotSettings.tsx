import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useListingSpotSettings } from "@/components/ListingSpotsCard";

type Pkg = { spots: number; price: number; label?: string };

export default function ListingSpotSettings() {
  const qc = useQueryClient();
  const { data, isLoading } = useListingSpotSettings();
  const [packages, setPackages] = useState<Pkg[]>([]);
  const [discount, setDiscount] = useState(100);
  const [required, setRequired] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPackages(data.packages);
    setDiscount(data.discount);
    supabase.from("app_settings").select("value").eq("key", "listing_spot_packages").maybeSingle()
      .then(({ data: r }) => setRequired(!!(r?.value as any)?.required));
  }, [data]);

  const update = (i: number, patch: Partial<Pkg>) => {
    const next = [...packages]; next[i] = { ...next[i], ...patch }; setPackages(next);
  };

  const save = async () => {
    const clean = packages.filter((p) => p.spots > 0 && p.price >= 0);
    if (new Set(clean.map((p) => p.spots)).size !== clean.length) {
      toast.error("Each package needs a different number of dresses"); return;
    }
    setSaving(true);
    const { error } = await supabase.from("app_settings").upsert(
      { key: "listing_spot_packages", value: { packages: clean, discount_percent: Math.min(100, Math.max(0, discount)), required } as any },
      { onConflict: "key" },
    );
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["listing-spot-settings"] });
    toast.success("Listing packages saved");
  };

  if (isLoading) return <Card><CardContent className="py-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Ticket className="h-5 w-5" /> Seller Listing Packages</CardTitle>
        <CardDescription>Set how many dresses each package allows, its price and the discount sellers see.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1"><Label>Discount (%) — 100 = free</Label>
            <Input type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div><p className="font-medium text-sm">Require a spot to list</p>
              <p className="text-xs text-muted-foreground">{required ? "Sellers use 1 spot per dress" : "Listing is open to everyone"}</p></div>
            <Switch checked={required} onCheckedChange={setRequired} />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Packages</Label>
            <Button size="sm" variant="outline" onClick={() => setPackages([...packages, { spots: 1, price: 500, label: "" }])}>
              <Plus className="h-4 w-4 mr-1" /> Add package</Button>
          </div>
          {packages.map((p, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_2fr_auto] gap-2 items-end">
              <div className="space-y-1"><Label className="text-xs">No. of dresses</Label>
                <Input type="number" min={1} value={p.spots} onChange={(e) => update(i, { spots: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Price (PKR)</Label>
                <Input type="number" min={0} value={p.price} onChange={(e) => update(i, { price: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-xs">Label</Label>
                <Input value={p.label || ""} onChange={(e) => update(i, { label: e.target.value })} /></div>
              <Button size="icon" variant="ghost" onClick={() => setPackages(packages.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Save packages</Button>
      </CardContent>
    </Card>
  );
}
