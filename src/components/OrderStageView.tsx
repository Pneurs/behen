import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PaymentUploadSection from "./PaymentUploadSection";
import ContactInfoReveal from "./ContactInfoReveal";
import { CheckCircle, Loader2, ShieldCheck } from "lucide-react";

interface OrderStageViewProps {
  booking: any;
  userId: string;
  onRefresh: () => void;
}

/**
 * Simple connector flow: payment verified → contacts + pickup unlocked →
 * either party marks the deal completed. No mandatory videos or printouts.
 */
export default function OrderStageView({ booking, userId, onRefresh }: OrderStageViewProps) {
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState<any>(null);

  const isRenter = userId === booking.renter_id;

  useEffect(() => {
    supabase
      .from("products")
      .select("listing_type, contact_phone, pickup_location, dropoff_location, title")
      .eq("id", booking.product_id)
      .single()
      .then(({ data }) => data && setProduct(data));
  }, [booking.product_id]);

  const isSaleProduct = product?.listing_type === "sale";
  const isPaymentPending = booking.payment_status !== "verified";
  const isCompleted = booking.order_stage === "completed" || booking.booking_status === "completed";

  const markCompleted = async () => {
    setLoading(true);
    try {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from("bookings")
        .update({ order_stage: "completed", booking_status: "completed", completed_at: now })
        .eq("id", booking.id);
      if (error) throw error;
      toast.success("Deal marked as completed. Thank you!");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        {product && <Badge variant="outline">{isSaleProduct ? "Sale" : "Rental"}</Badge>}
        <Badge variant={isCompleted ? "default" : "secondary"}>
          {isPaymentPending ? "Payment pending" : isCompleted ? "Completed" : "Contacts unlocked"}
        </Badge>
      </div>

      {isPaymentPending && (
        <PaymentUploadSection booking={booking} isRenter={isRenter} onUploadComplete={onRefresh} />
      )}

      {!isPaymentPending && <ContactInfoReveal booking={booking} userId={userId} product={product} />}

      {!isPaymentPending && (
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-2 text-sm">
            <p className="font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> Safety tips
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>If you're meeting in person, please meet in a public place (mall, café, busy market) and preferably bring someone along.</li>
              <li>Inspect the dress at handover, or do a quick WhatsApp video call before sending it.</li>
              <li>Never share OTPs or bank PINs with anyone.</li>
            </ul>
            <p className="text-muted-foreground" dir="rtl">
              اگر آپ کسی سے ملنے جا رہی ہیں تو براہِ کرم کسی عوامی جگہ پر ملیں اور ہو سکے تو کسی کو ساتھ لے کر جائیں۔
            </p>
          </CardContent>
        </Card>
      )}

      {!isPaymentPending && !isCompleted && (
        <Button className="w-full" onClick={markCompleted} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
          {isSaleProduct ? "Mark as received / completed" : "Mark rental as completed"}
        </Button>
      )}

      {isCompleted && (
        <Card className="border-primary/30">
          <CardContent className="pt-6 text-center text-sm">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
            This deal is completed. Thank you for using Behen.pk!
          </CardContent>
        </Card>
      )}
    </div>
  );
}
