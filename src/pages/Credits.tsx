import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Coins, Loader2, Phone, CheckCircle2, Clock, Upload } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCreditSettings, useCreditBalance, useCreditTransactions, CreditPackage } from "@/hooks/useCredits";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { sendEmailNotification } from "@/lib/emailNotifications";

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
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      // Give waiting orders a chance to clear themselves before we read them.
      await supabase.rpc("auto_approve_due_credit_purchases");
      const { data } = await supabase
        .from("credit_purchases")
        .select("id, credits, amount_pkr, status, provider, payment_reference, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const pendingCount = (purchases as any[]).filter((p) => p.status === "pending").length;

  // Email the buyer once, as soon as an order we were watching gets approved.
  const watchedPending = useRef<Set<string>>(new Set());
  const emailedApproved = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!user) return;
    (purchases as any[]).forEach((p) => {
      if (p.status === "pending") {
        watchedPending.current.add(p.id);
        return;
      }
      if (
        p.status === "approved" &&
        watchedPending.current.has(p.id) &&
        !emailedApproved.current.has(p.id)
      ) {
        emailedApproved.current.add(p.id);
        watchedPending.current.delete(p.id);
        sendEmailNotification({
          type: "credits_added",
          recipientEmail: user.email || "",
          recipientName: (user.user_metadata as any)?.name || "Behen",
          data: {
            credits: p.credits,
            amount: p.amount_pkr,
            reference: p.payment_reference,
          },
        });
      }
    });
  }, [purchases, user]);

  // While an order is waiting, keep checking so the credits appear on their own.
  useEffect(() => {
    if (!pendingCount) return;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["my-credit-purchases"] });
      queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
    }, 20000);
    return () => clearInterval(id);
  }, [pendingCount, queryClient]);

  const handleSubmitPurchase = async () => {
    if (!user || !selected) return;
    if (!proofFile) {
      toast.error("Please attach the payment screenshot first");
      return;
    }
    if (!reference.trim()) {
      toast.error("Please enter the transaction ID");
      return;
    }
    setSubmitting(true);
    try {
      const ext = proofFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-proofs")
        .upload(path, proofFile, { contentType: proofFile.type });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from("credit_purchases").insert({
        user_id: user.id,
        credits: selected.credits,
        amount_pkr: selected.price,
        payment_reference: reference.trim(),
        payment_proof_url: path,
      });
      if (error) throw error;

      toast.success("Screenshot received! Come back within 2 hours — we're verifying your payment.");
      setSelected(null);
      setReference("");
      setProofFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

        {pendingCount > 0 && (
          <Card className="border-primary/40">
            <CardContent className="flex items-center gap-3 py-4">
              <Clock className="h-5 w-5 text-primary" />
              <div className="text-sm">
                <p className="font-medium">Verifying your payment…</p>
                <p className="text-muted-foreground">
                  Come back within 2 hours — we're verifying your payment and your credits will be added automatically.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Buy credits</CardTitle>
            <CardDescription>
              Pick a package, send the money, upload the screenshot — credits land in your account within 2 hours after verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(settings?.packages || []).map((pkg, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelected(pkg)}
                  className={`text-left rounded-lg border-2 p-4 transition-colors ${
                    selected?.credits === pkg.credits ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold">{pkg.credits} credits</p>
                    {i === (settings?.packages.length || 0) - 1 && <Badge variant="secondary">Best value</Badge>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        PKR {pkg.originalPrice.toLocaleString()}
                      </span>
                    )}
                    <p className="text-primary font-semibold">PKR {pkg.price.toLocaleString()}</p>
                  </div>
                  {pkg.originalPrice && pkg.originalPrice > pkg.price && (
                    <Badge variant="destructive" className="mt-1">
                      {Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)}% OFF
                    </Badge>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">See {pkg.credits} sellers' contact details</p>
                </button>
              ))}
            </div>

            {selected ? (
              <div className="rounded-lg border p-4 space-y-4 bg-muted/40">
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 mt-1 text-primary" />
                  <div className="text-sm">
                    <p className="font-medium">
                      Step 1 — Send PKR {selected.price.toLocaleString()} to JazzCash / EasyPaisa
                    </p>
                    <p className="text-lg font-bold text-primary">{PAYMENT_NUMBER}</p>
                    <p className="text-muted-foreground">Account title: Behen.pk</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proof">Step 2 — Upload the payment screenshot</Label>
                  <Input
                    id="proof"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                  {proofFile && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {proofFile.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">
                    Step 3 — Transaction ID <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="reference"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. TXN123456789"
                  />
                  <p className="text-xs text-muted-foreground">
                    You'll find it in the JazzCash / EasyPaisa confirmation message.
                  </p>
                </div>

                <Button
                  onClick={handleSubmitPurchase}
                  disabled={submitting || !proofFile || !reference.trim()}
                  className="w-full"
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  I have paid — add my {selected.credits} credits
                </Button>
                <p className="text-xs text-muted-foreground">
                  You can close this page — we verify each payment manually and your credits are added automatically within 2 hours.
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Pick a package above to see the payment details.</p>
            )}
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
                    <p className="font-medium">
                      {p.credits} credits — PKR {Number(p.amount_pkr).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(p.created_at), "dd MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  <Badge
                    variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}
                  >
                    {p.status === "approved" ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {p.status === "pending" ? "checking" : p.status}
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
