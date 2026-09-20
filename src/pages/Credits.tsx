import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Loader2, Phone, CheckCircle2, Clock, Zap, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCreditSettings, useCreditBalance, useCreditTransactions, CreditPackage } from "@/hooks/useCredits";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const PAYMENT_NUMBER = "0332 813 3263";

export default function Credits() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, loading: authLoading } = useAuth();
  const { data: settings } = useCreditSettings();
  const { data: balance = 0 } = useCreditBalance();
  const { data: transactions = [] } = useCreditTransactions();

  const [selected, setSelected] = useState<CreditPackage | null>(null);
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  // A tracker in the URL means the buyer just came back from SafePay checkout.
  const returnTracker = searchParams.get("tracker");
  const [confirming, setConfirming] = useState<string | null>(returnTracker);

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
        .select("id, credits, amount_pkr, status, provider, safepay_tracker, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
    refetchInterval: confirming ? 3000 : false,
  });

  // When the tracked purchase turns approved, celebrate and clean the URL.
  useEffect(() => {
    if (!confirming) return;
    const match = (purchases as any[]).find(
      (p) => p.safepay_tracker === confirming && p.status === "approved"
    );
    if (match) {
      toast.success(`${match.credits} credits added to your balance!`);
      setConfirming(null);
      setSearchParams({}, { replace: true });
      queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
    }
  }, [confirming, purchases, queryClient, setSearchParams]);

  const payNow = async (pkg: CreditPackage) => {
    setPaying(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        toast.error("Please sign in again");
        return;
      }
      const { data, error } = await supabase.functions.invoke("safepay-create-checkout", {
        body: { credits: pkg.credits },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (error || !data?.checkout_url) {
        throw new Error(data?.error || error?.message || "Could not start the payment");
      }
      toast.info("Redirecting to secure checkout…");
      window.location.href = data.checkout_url;
    } catch (e: any) {
      toast.error(e.message || "Could not start the payment");
    } finally {
      setPaying(false);
    }
  };

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

  const confirmingPurchase = useMemo(
    () => (confirming ? (purchases as any[]).find((p) => p.safepay_tracker === confirming) : null),
    [confirming, purchases]
  );

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

        {confirming && (
          <Card className="border-primary/40">
            <CardContent className="flex items-center gap-3 py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="text-sm">
                <p className="font-medium">Confirming your payment…</p>
                <p className="text-muted-foreground">
                  {confirmingPurchase?.status === "failed"
                    ? "The payment didn't go through. Please try again or pay manually below."
                    : "As soon as SafePay confirms it, your credits appear here automatically. This usually takes a few seconds."}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Buy credits</CardTitle>
            <CardDescription>Pick a package, pay instantly, and your credits are added automatically.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(settings?.packages || []).map((pkg, i) => (
                <div
                  key={i}
                  className={`rounded-lg border-2 p-4 transition-colors ${
                    selected?.credits === pkg.credits ? "border-primary bg-primary/5" : "border-border"
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
                  <Button
                    onClick={() => payNow(pkg)}
                    disabled={paying}
                    className="w-full mt-3"
                  >
                    {paying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                    Pay now — instant
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-lg border">
              <button
                type="button"
                onClick={() => setManualOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium"
              >
                Or pay manually with JazzCash / EasyPaisa
                <ChevronDown className={`h-4 w-4 transition-transform ${manualOpen ? "rotate-180" : ""}`} />
              </button>
              {manualOpen && (
                <div className="border-t p-4 space-y-4 bg-muted/40">
                  {selected && (
                    <>
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
                      <p className="text-xs text-muted-foreground">
                        Manual payments are added after the admin confirms the money arrived.
                      </p>
                    </>
                  )}
                  {!selected && (
                    <p className="text-sm text-muted-foreground">
                      Pick a package above first, then send the payment manually.
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {purchases.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Your orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(purchases as any[]).map((p) => (
                <div key={p.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                  <div>
                    <p className="font-medium">{p.credits} credits — PKR {Number(p.amount_pkr).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.created_at), "dd MMM yyyy, h:mm a")}
                      {p.provider === "safepay" ? " · instant" : " · manual"}
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
