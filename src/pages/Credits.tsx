import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Loader2, Phone, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCreditSettings, useCreditBalance, useCreditTransactions, CreditPackage } from "@/hooks/useCredits";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const PAYMENT_NUMBER = "0332 813 3263";

export default function Credits() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: settings } = useCreditSettings();
  const { data: balance = 0 } = useCreditBalance();
  const { data: transactions = [] } = useCreditTransactions();

  const [selected, setSelected] = useState<CreditPackage | null>(null);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      localStorage.setItem("auth_redirect", "/credits");
      navigate("/auth");
    }
  }, [authLoading, user, navigate]);

  const { data: purchases = [] } = useQuery({
    queryKey: ["my-credit-purchases", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("credit_purchases")
        .select("id, credits, amount_pkr, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const handleSubmitPurchase = async () => {
    if (!user || !selected) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("credit_purchases").insert({
        user_id: user.id,
        credits: selected.credits,
        amount_pkr: selected.price,
        payment_reference: reference || null,
      });
      if (error) throw error;
      toast.success("Order placed! Your credits are added as soon as the payment is confirmed.");
      setSelected(null);
      setReference("");
      queryClient.invalidateQueries({ queryKey: ["my-credit-purchases"] });
    } catch (e: any) {
      toast.error(e.message || "Could not place the order");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <p className="text-sm text-muted-foreground">Your credits</p>
              <p className="text-4xl font-bold text-primary flex items-center gap-2">
                <Coins className="h-8 w-8" />
                {balance}
              </p>
            </div>
            <p className="text-sm text-muted-foreground text-right max-w-[50%]">
              {settings?.costPerUnlock || 1} credit unlocks one seller's contact details, permanently for that listing.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Buy credits</CardTitle>
            <CardDescription>Pick a package, send the payment, and your credits are added.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(settings?.packages || []).map((pkg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(pkg)}
                  className={`text-left rounded-lg border-2 p-4 transition-colors ${
                    selected?.credits === pkg.credits ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold">{pkg.credits} credits</p>
                    {i === (settings?.packages.length || 0) - 1 && (
                      <Badge variant="secondary">Best value</Badge>
                    )}
                  </div>
                  <p className="text-primary font-semibold mt-1">PKR {pkg.price.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    See {pkg.credits} sellers' contact details
                  </p>
                </button>
              ))}
            </div>

            {selected && (
              <div className="rounded-lg border p-4 space-y-4 bg-muted/40">
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-1 text-primary" />
                  <div className="text-sm">
                    <p className="font-medium">Send PKR {selected.price.toLocaleString()} to JazzCash / EasyPaisa</p>
                    <p className="text-lg font-bold text-primary">{PAYMENT_NUMBER}</p>
                    <p className="text-muted-foreground">Account title: Behen.pk</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Transaction ID (optional)</Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. TXN123456789"
                  />
                </div>
                <Button onClick={handleSubmitPurchase} disabled={submitting} className="w-full">
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  I have paid — add my {selected.credits} credits
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {purchases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {purchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{p.credits} credits — PKR {Number(p.amount_pkr).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.created_at), "dd MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                    {p.status === "approved" ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {p.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Credit history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{t.notes || t.type}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(t.created_at), "dd MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  <span className={t.amount < 0 ? "text-destructive font-semibold" : "text-green-600 font-semibold"}>
                    {t.amount > 0 ? "+" : ""}
                    {t.amount}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
