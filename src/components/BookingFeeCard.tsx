import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Copy, Loader2, ShieldCheck, Clock, Hourglass, XCircle } from "lucide-react";
import { compressImage } from "@/lib/compressImage";

const ACCOUNT = "0611359113165";

// Must match the DB trigger set_booking_fee_amount. Launch promo rates; `list` is the normal rate shown struck through.
export type FeeSide = "buyer" | "seller";
const RATES = {
  sale: { buyer: { list: 0.05, promo: 0.025 }, seller: { list: 0.075, promo: 0.05 } },
  rent: { buyer: { list: 0.085, promo: 0.0425 }, seller: { list: 0.1, promo: 0.085 } },
};
export const SELLER_DEADLINE_MS = 24 * 60 * 60 * 1000;
export const feeRatesFor = (listingType: string | null | undefined, side: FeeSide) =>
  RATES[listingType === "sale" ? "sale" : "rent"][side];
const pctLabel = (r: number) => `${+(r * 100).toFixed(2)}%`;
export function bookingFeeFor(price: number, listingType: string | null | undefined, side: FeeSide, which: "promo" | "list" = "promo") {
  // Round to paisa first so float noise (10000*0.085=850.0000001) does not add a rupee.
  return Math.ceil(Math.round(price * feeRatesFor(listingType, side)[which] * 100) / 100);
}
const fmtLeft = (ms: number) => {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000);
  return `${h} hrs ${m} mins`;
};

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
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);

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

  const side: FeeSide = isBuyer ? "buyer" : "seller";
  const price = Number(acceptedOffer.offered_price);
  const fee = bookingFeeFor(price, product?.listing_type, side);
  const listFee = bookingFeeFor(price, product?.listing_type, side, "list");
  const rates = feeRatesFor(product?.listing_type, side);
  const otherId = isBuyer ? conversation.owner_id : conversation.renter_id;
  const buyerActive = payments.filter((p: any) => p.payer_id === conversation.renter_id && p.status !== "rejected");
  const buyerPaidAt = buyerActive.length ? Math.min(...buyerActive.map((p: any) => new Date(p.created_at).getTime())) : null;
  const sellerActive = payments.some((p: any) => p.payer_id === conversation.owner_id && p.status !== "rejected");
  const deadline = buyerPaidAt ? buyerPaidAt + SELLER_DEADLINE_MS : null;
  const expired = !!deadline && !sellerActive && now > deadline;
  const left = deadline ? Math.max(0, deadline - now) : 0;
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

  if (expired) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="space-y-2 pt-4 text-center text-sm">
          <XCircle className="mx-auto h-8 w-8 text-destructive" />
          <p className="font-semibold">This deal has expired</p>
          <p className="text-muted-foreground">
            {isBuyer
              ? "The seller did not pay her fee within 24 hours. Our team will refund your fee to your bank account. You can chat with other sellers anytime."
              : "You did not pay your fee within 24 hours of the buyer's payment, so this deal was cancelled and the buyer will be refunded."}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isBuyer && !buyerPaidAt) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-2 pt-4 text-center text-sm">
          <Hourglass className="mx-auto h-8 w-8 text-primary" />
          <p className="font-semibold">Waiting for the buyer to pay first</p>
          <p className="text-muted-foreground">The buyer pays her Behen.pk fee first. You'll get a WhatsApp alert the moment she pays, then you have 24 hours to pay yours.</p>
        </CardContent>
      </Card>
    );
  }

  if (latest?.status === "approved") {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-2 pt-4 text-center text-sm">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <p className="font-semibold">Your fee is verified</p>
          <p className="text-muted-foreground">Contact details unlock as soon as the {otherLabel.toLowerCase()}'s fee is verified too.</p>
          {isBuyer && !sellerActive && deadline && <p className="text-xs">⏳ Seller has <strong>{fmtLeft(left)}</strong> left to pay her fee.</p>}
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
          {isBuyer && !sellerActive && deadline && <p className="text-xs">⏳ Seller has <strong>{fmtLeft(left)}</strong> left to pay her fee.</p>}
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
        if (error.message?.includes("buyer_pays_first")) throw new Error("The buyer pays first. Please wait for her payment.");
        if (error.message?.includes("seller_deadline_passed")) throw new Error("The 24-hour window has passed, so this deal expired.");
        throw error;
      }
      toast.success("Payment submitted — verifying now");
      if (isBuyer && !sellerActive) {
        // Tell the seller in chat; this also sends her a WhatsApp alert.
        await supabase.from("chat_messages").insert({
          conversation_id: conversation.id,
          sender_id: userId,
          message: "💳 The buyer has submitted her Behen.pk fee! Seller, please pay your fee within 24 hours to confirm this deal and unlock contact details.",
        });
        supabase.functions.invoke("whatsapp-notify", { body: { conversation_id: conversation.id, fee_paid: true } }).catch(() => {});
      }
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
        {!isBuyer && deadline && (
          <p className="rounded bg-primary/10 p-2 text-center font-medium">⏳ Time remaining: {fmtLeft(left)} to submit your fee</p>
        )}
        <p>
          Pay your Behen.pk platform fee of <span className="text-muted-foreground line-through">PKR {listFee.toLocaleString()}</span>{" "}
          <strong>PKR {fee.toLocaleString()}</strong> (<span className="line-through">{pctLabel(rates.list)}</span> {pctLabel(rates.promo)} of PKR {price.toLocaleString()}).{" "}
          <Badge variant="secondary">Launch discount</Badge>{" "}
          {isBuyer ? "You pay first; the seller then has 24 hours to pay hers. The dress price is paid directly to the seller." : "You receive the dress price directly from the buyer."}
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
