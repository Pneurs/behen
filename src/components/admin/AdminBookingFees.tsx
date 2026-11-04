import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Check, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AdminBookingFees() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-booking-fees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_fee_payments")
        .select("id, conversation_id, payer_id, owner_id, product_id, amount_pkr, transaction_id, proof_path, status, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      const ids = [...new Set((data || []).flatMap((r) => [r.payer_id, r.owner_id]))];
      const pids = [...new Set((data || []).map((r) => r.product_id))];
      const [{ data: profs }, { data: prods }] = await Promise.all([
        ids.length ? supabase.from("profiles").select("user_id, name").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
        pids.length ? supabase.from("products").select("id, title, product_code").in("id", pids) : Promise.resolve({ data: [] as any[] }),
      ]);
      const pm = Object.fromEntries((profs || []).map((p: any) => [p.user_id, p.name]));
      const prm = Object.fromEntries((prods || []).map((p: any) => [p.id, p]));
      const all = data || [];
      const DAY = 24 * 60 * 60 * 1000;
      // Refund due: buyer paid, seller never paid within 24 hours.
      const refundDue = (r: any) =>
        r.payer_id !== r.owner_id && r.status !== "rejected" &&
        Date.now() - new Date(r.created_at).getTime() > DAY &&
        !all.some((o: any) => o.conversation_id === r.conversation_id && o.payer_id === o.owner_id && o.status !== "rejected");
      return all.map((r) => ({ ...r, refundDue: refundDue(r), buyer: pm[r.payer_id], seller: pm[r.owner_id], payerRole: r.payer_id === r.owner_id ? "Seller" : "Buyer", product: prm[r.product_id] }));
    },
  });

  const viewProof = async (path: string) => {
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    else toast.error("Could not open screenshot");
  };

  const review = async (id: string, approve: boolean) => {
    if (!approve && !confirm("Reject this payment?")) return;
    setBusy(id);
    const { data, error } = await supabase.rpc("admin_review_booking_fee", { _id: id, _approve: approve });
    setBusy(null);
    if (error || !(data as any)?.success) return toast.error(error?.message || (data as any)?.reason || "Failed");
    if (approve) supabase.functions.invoke("send-notifications", { body: { type: "booking_fee_email_sweep" } }).catch(() => {});
    toast.success(approve ? "Booking confirmed" : "Payment rejected");
    qc.invalidateQueries({ queryKey: ["admin-booking-fees"] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chat booking fees</CardTitle>
        <CardDescription>Buyer pays first, then the seller has 24 hours. "Refund due" means the seller missed the deadline — refund the buyer via UBL.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No booking fees yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Dress</TableHead>
                  <TableHead>Paid by</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-xs">{format(new Date(r.created_at), "MMM dd, hh:mm a")}</TableCell>
                    <TableCell className="text-xs">{r.product?.product_code} {r.product?.title}</TableCell>
                    <TableCell className="text-xs"><Badge variant="outline">{r.payerRole}</Badge> {r.payerRole === "Buyer" ? r.buyer : r.seller}</TableCell>
                    <TableCell>PKR {Number(r.amount_pkr).toLocaleString()}</TableCell>
                    <TableCell className="font-mono text-xs">{r.transaction_id}</TableCell>
                    <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge>{r.refundDue && <Badge variant="destructive" className="ml-1">Refund due</Badge>}</TableCell>
                    <TableCell className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => viewProof(r.proof_path)}><ImageIcon className="h-4 w-4" /></Button>
                      {r.status === "pending" && (
                        <>
                          <Button size="sm" disabled={busy === r.id} onClick={() => review(r.id, true)}><Check className="h-4 w-4" /></Button>
                          <Button size="sm" variant="destructive" disabled={busy === r.id} onClick={() => review(r.id, false)}><X className="h-4 w-4" /></Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
