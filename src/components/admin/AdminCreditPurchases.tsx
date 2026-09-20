import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X, Coins, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function AdminCreditPurchases() {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [grantEmail, setGrantEmail] = useState("");
  const [grantAmount, setGrantAmount] = useState(3);
  const [granting, setGranting] = useState(false);

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ["admin-credit-purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("credit_purchases")
        .select("id, user_id, credits, amount_pkr, status, payment_reference, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const userIds = [...new Set((data || []).map((p) => p.user_id))];
      let profileMap: Record<string, { name: string; phone: string | null }> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, phone")
          .in("user_id", userIds);
        (profiles || []).forEach((p) => {
          profileMap[p.user_id] = { name: p.name, phone: p.phone };
        });
      }

      return (data || []).map((p) => ({ ...p, profile: profileMap[p.user_id] }));
    },
  });

  const approve = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase.rpc("admin_approve_credit_purchase", { _purchase_id: id });
      if (error) throw error;
      toast.success("Credits added to the buyer");
      queryClient.invalidateQueries({ queryKey: ["admin-credit-purchases"] });
    } catch (e: any) {
      toast.error(e.message || "Could not approve");
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      const { error } = await supabase.from("credit_purchases").update({ status: "rejected" }).eq("id", id);
      if (error) throw error;
      toast.success("Order rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-credit-purchases"] });
    } catch (e: any) {
      toast.error(e.message || "Could not reject");
    } finally {
      setBusyId(null);
    }
  };

  const grant = async () => {
    if (!grantEmail.trim()) {
      toast.error("Enter the buyer's phone number or name");
      return;
    }
    setGranting(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("user_id, name")
        .or(`phone.eq.${grantEmail.trim()},name.ilike.${grantEmail.trim()}`)
        .limit(1);
      if (error) throw error;
      if (!profiles?.length) {
        toast.error("No buyer found with that phone number or name");
        return;
      }

      const { error: rpcError } = await supabase.rpc("admin_add_credits", {
        _user_id: profiles[0].user_id,
        _credits: grantAmount,
        _notes: "Credits added by admin",
      });
      if (rpcError) throw rpcError;

      toast.success(`${grantAmount} credits added to ${profiles[0].name}`);
      setGrantEmail("");
      queryClient.invalidateQueries({ queryKey: ["admin-credit-purchases"] });
    } catch (e: any) {
      toast.error(e.message || "Could not add credits");
    } finally {
      setGranting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Credits Manually
          </CardTitle>
          <CardDescription>Find a buyer by phone number or name and add credits.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="buyer">Buyer phone number or name</Label>
            <Input id="buyer" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} placeholder="03001234567" />
          </div>
          <div className="w-full sm:w-28 space-y-2">
            <Label htmlFor="amount">Credits</Label>
            <Input
              id="amount"
              type="number"
              min={1}
              value={grantAmount}
              onChange={(e) => setGrantAmount(Number(e.target.value))}
            />
          </div>
          <Button onClick={grant} disabled={granting}>
            {granting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Coins className="mr-2 h-4 w-4" />}
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Credit Orders</CardTitle>
          <CardDescription>Approve an order to add the credits to the buyer's balance.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : purchases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No credit orders yet.</p>
          ) : (
            purchases.map((p: any) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3">
                <div className="space-y-0.5">
                  <p className="font-medium">
                    {p.profile?.name || "Buyer"} — {p.credits} credits (PKR {Number(p.amount_pkr).toLocaleString()})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.profile?.phone || "no phone"} · {format(new Date(p.created_at), "dd MMM yyyy, h:mm a")}
                    {p.payment_reference ? ` · TXN ${p.payment_reference}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.status === "approved" ? "default" : p.status === "rejected" ? "destructive" : "secondary"}>
                    {p.status}
                  </Badge>
                  {p.status === "pending" && (
                    <>
                      <Button size="sm" onClick={() => approve(p.id)} disabled={busyId === p.id}>
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => reject(p.id)} disabled={busyId === p.id}>
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
