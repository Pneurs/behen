import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Ticket } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const DEFAULT_PACKAGES = [
  { spots: 1, price: 500, label: "Try it out" },
  { spots: 3, price: 1200, label: "Wardrobe refresh" },
  { spots: 5, price: 1800, label: "Boutique & bridal sets" },
];

export const useListingSpotSettings = () =>
  useQuery({
    queryKey: ["listing-spot-settings"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "listing_spot_packages").maybeSingle();
      const v = (data?.value || {}) as any;
      return {
        discount: Number(v.discount_percent ?? 100),
        packages: Array.isArray(v.packages) && v.packages.length ? v.packages : DEFAULT_PACKAGES,
      } as { discount: number; packages: { spots: number; price: number; label?: string }[] };
    },
    staleTime: 5 * 60 * 1000,
  });

export default function ListingSpotsCard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState<number | null>(null);
  const { data: settings } = useListingSpotSettings();
  const { data: balance = 0 } = useQuery({
    queryKey: ["listing-spots", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("listing_spots").select("balance").eq("user_id", user!.id).maybeSingle();
      return data?.balance ?? 0;
    },
  });

  const discount = settings?.discount ?? 100;
  const money = (n: number) => `PKR ${Math.round(n).toLocaleString("en-PK")}`;

  const claim = async (spots: number) => {
    setBusy(spots);
    const { data, error } = await supabase.rpc("claim_free_listing_spots", { _spots: spots });
    setBusy(null);
    const res = data as { success?: boolean; reason?: string } | null;
    if (error || !res?.success) {
      toast.error(res?.reason === "payment_required" ? "This package needs payment now." : "Could not add listing spots");
      return;
    }
    toast.success(`${spots} listing spot${spots > 1 ? "s" : ""} added`);
    qc.invalidateQueries({ queryKey: ["listing-spots"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" /> Listing Spots
          <Badge variant="secondary" className="ml-auto">{balance} available</Badge>
        </CardTitle>
        <CardDescription>
          {discount >= 100 ? "🎉 Launch offer: listing is 100% FREE for now." : `Launch offer: ${discount}% OFF.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-3">
        {(settings?.packages || DEFAULT_PACKAGES).map((p) => {
          const final = (p.price * (100 - discount)) / 100;
          return (
            <div key={p.spots} className="rounded-lg border p-4 space-y-2 text-center">
              <p className="font-semibold">{p.spots} listing{p.spots > 1 ? "s" : ""}</p>
              {p.label && <p className="text-xs text-muted-foreground">{p.label}</p>}
              <p className="text-sm">
                <span className="line-through text-muted-foreground mr-2">{money(p.price)}</span>
                <span className="font-bold text-primary">{final <= 0 ? "FREE" : money(final)}</span>
              </p>
              {discount > 0 && <Badge>{discount}% OFF</Badge>}
              <Button className="w-full" size="sm" disabled={busy !== null || final > 0} onClick={() => claim(p.spots)}>
                {busy === p.spots && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {final <= 0 ? "Claim free" : "Coming soon"}
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
