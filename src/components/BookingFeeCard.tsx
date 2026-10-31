import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Loader2, ShieldCheck, Clock } from "lucide-react";
import { compressImage } from "@/lib/compressImage";

const ACCOUNT = "0611359113165";

// Each side (buyer AND seller) pays this fee. Must match the DB trigger set_booking_fee_amount.
export const feeRateFor = (listingType?: string | null) => (listingType === "sale" ? 0.05 : 0.085);
export function bookingFeeFor(price: number, listingType?: string | null) {
  // Round to paisa first so float noise (10000*0.085=850.0000001) does not add a rupee.
  return Math.ceil(Math.round(price * feeRateFor(listingType) * 100) / 100);
}

interface Props {
  conversation: any;
  product: any;
  userId: string;
  acceptedOffer: any | null;
  onConfirmed: () => void;
}

export default function BookingFeeCard({ conversation, product, userId, acceptedOffer, onConfirmed }: Props) {
  const qc = useQueryClient();
  const isBuyer = userId === conversation.renter_id;
  const [file, setFile] = useState<File | null>(null);
  const [trx, setTrx] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ["booking-fee", conversation.id],
    enabled: !!acceptedOffer,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_fee_payments")
        .select("id, status, amount_pkr, transaction_id, created_at, payer_id")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  if (!acceptedOffer || conversation.is_booking_confirmed) return null;

  const fee = bookingFeeFor(Number(acceptedOffer.offered_price), product?.listing_type);
  const pct = product?.listing_type === "sale" ? "5%" : "8.5%";
  const otherId = isBuyer ? conversation.owner_id : conversation.renter_id;
  const mine = payments.filter((p: any) => p.payer_id === userId);
  const theirs = payments.filter((p: any) => p.payer_id === otherId);
  const latest = mine[0];
  const otherStatus = theirs.find((p: any) => p.status === "approved") ? "approved" : theirs[0]?.status;
  const otherLabel = isBuyer ? "Seller" : "Buyer";

  const OtherBadge = () => (
    <p className="text-xs text-muted-foreground">
      {otherLabel}'s fee:{" "}
      <Badge variant={otherStatus === "approved" ? "default" : "secondary"}>
        {otherStatus === "approved" ? "Verified" : otherStatus === "pending" ? "Submitted — verifying" : "Not paid yet"}
      </Badge>
    </p>
  );

  if (latest?.status === "approved") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-2 pt-4 text-center text-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <p className="font-semibold">Your fee is verified</p>
          <p className="text-muted-foreground">Contact details unlock as soon as the {otherLabel.toLowerCase()}'s fee is verified too.</p>
          <OtherBadge />
        </CardContent>
      </Card>
    );
  }

  if (latest?.status === "pending") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-2 pt-4 text-center text-sm">
          <Clock className="mx-auto h-8 w-8 text-primary" />
          <p className="font-semibold">Verifying your payment…</p>
          <p className="text-muted-foreground">Our team checks it against the bank, usually within 2 hours. You'll get a notification once it's confirmed.</p>
          <p className="text-xs text-muted-foreground">Transaction ID: {latest.transaction_id}</p>
          <OtherBadge />
        </CardContent>
      </Card>
    );
  }

  const submit = async () => {
    if (!file) return toast.error("Please attach the payment screenshot");
    if (trx.trim().length < 6) return toast.error("Please enter the transaction ID from your bank app");
    setBusy(true);
    try {
      const small = file.type.startsWith("image/") ? await compressImage(file) : file;
      const path = `${userId}/booking-fee-${conversation.id}-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("payment-proofs").upload(path, small, { contentType: small.type || "image/jpeg" });
      if (upErr) throw upErr;
      const { error } = await supabase.from("booking_fee_payments").insert({
        conversation_id: conversation.id,
        offer_id: acceptedOffer.id,
        booking_id: conversation.booking_id,
        product_id: conversation.product_id,
        payer_id: userId,
        owner_id: conversation.owner_id,
        amount_pkr: fee,
        transaction_id: trx.trim(),
        proof_path: path,
      });
      if (error) {
        if (error.code === "23505") throw new Error("This transaction ID has already been used.");
        if (error.message?.includes("fee_already_submitted")) throw new Error("You have already submitted your fee.");
        throw error;
      }
      toast.success("Payment submitted — verifying now");
      setFile(null);
      setTrx("");
      qc.invalidateQueries({ queryKey: ["booking-fee", conversation.id] });
    } catch (e: any) {
      toast.error(e.message || "Could not submit payment");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-primary/40">
      <CardContent className="space-y-3 pt-4 text-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <p className="font-semibold">Confirm booking & unlock contact</p>
        </div>
        {latest?.status === "rejected" && (
          <p className="rounded bg-destructive/10 p-2 text-destructive">Your last payment couldn't be verified. Please check and submit again.</p>
        )}
        <p>
          Pay your Behen.pk platform fee of <strong>PKR {fee.toLocaleString()}</strong> ({pct} of PKR {Number(acceptedOffer.offered_price).toLocaleString()}). Buyer and seller each pay {pct}. {isBuyer ? "The dress price is paid directly to the seller." : "You receive the dress price directly from the buyer."}
        </p>
        <OtherBadge />
        <div className="space-y-1 rounded-md bg-muted p-3">
          <p>Bank: <strong>UBL</strong></p>
          <p>Account title: <strong>Behen.Pk</strong></p>
          <div className="flex items-center justify-between gap-2">
            <p>Account: <strong>{ACCOUNT}</strong></p>
            <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(ACCOUNT); toast.success("Account number copied"); }}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          {product?.product_code && <p className="text-xs text-muted-foreground">Write <strong>{product.product_code}</strong> in the transfer remarks.</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="fee-proof">Payment screenshot *</Label>
          <Input id="fee-proof" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="fee-trx">Transaction ID *</Label>
          <Input id="fee-trx" value={trx} onChange={(e) => setTrx(e.target.value)} placeholder="e.g. 123456789012" />
        </div>
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Submit payment
        </Button>
        <p className="text-xs text-muted-foreground">Only send money to the account above. Behen.pk will never ask you to pay anywhere else.</p>
      </CardContent>
    </Card>
  );
}
