import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { fetchPublicProfile, fetchPublicProfiles } from "@/lib/publicProfiles";
import { toast } from "sonner";
import { format } from "date-fns";
import { Check, X, Loader2, Calendar, DollarSign, Shield } from "lucide-react";
import FlatpickrCalendar from "@/components/ui/flatpickr-calendar";
import { sendEmailNotification } from "@/lib/emailNotifications";

interface OfferCardProps {
  conversationId: string;
  productId: string;
  product: any;
  userId: string;
  isOwner: boolean;
  existingOffers: any[];
  onOfferCreated: () => void;
  onOfferAccepted: (offer: any) => void;
}

export default function OfferCard({
  conversationId,
  productId,
  product,
  userId,
  isOwner,
  existingOffers,
  onOfferCreated,
  onOfferAccepted,
}: OfferCardProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [offerData, setOfferData] = useState({
    price: (product?.listing_type === "sale" ? product?.sale_price : product?.rental_price_4days)?.toString() || "",
    security: product?.security_deposit?.toString() || "",
  });
  const [dateRange, setDateRange] = useState<Date[]>([]);

  const pendingOffer = existingOffers.find(o => o.status === "pending");
  const isSale = product?.listing_type === "sale";
  const listedPrice = isSale ? product?.sale_price : product?.rental_price_4days;

  const handleCreateOffer = async () => {
    if (!isSale && (!dateRange[0] || !dateRange[1])) {
      toast.error("Please select rental dates");
      return;
    }

    if (!offerData.price || (!isSale && !offerData.security)) {
      toast.error(isSale ? "Please enter your price" : "Please enter price and security deposit");
      return;
    }

    setLoading(true);

    try {
      const startDate = isSale ? new Date() : dateRange[0];
      const endDate = isSale ? new Date() : dateRange[1];
      const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      const { error } = await supabase.from("offers").insert({
        conversation_id: conversationId,
        product_id: productId,
        sender_id: userId,
        offered_price: parseFloat(offerData.price),
        offered_security_deposit: isSale ? 0 : parseFloat(offerData.security),
        start_date: format(startDate, "yyyy-MM-dd"),
        end_date: format(endDate, "yyyy-MM-dd"),
        total_days: totalDays,
        status: "pending",
      });

      if (error) throw error;

      toast.success("Offer sent!");
      setShowForm(false);
      setOfferData({ price: "", security: "" });
      setDateRange([]);
      onOfferCreated();
    } catch (error: any) {
      toast.error(error.message || "Failed to create offer");
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToOffer = async (offerId: string, accept: boolean) => {
    setLoading(true);

    try {
      const { data: offer, error: fetchError } = await supabase
        .from("offers")
        .select("*")
        .eq("id", offerId)
        .single();

      if (fetchError) throw fetchError;

      if (accept) {
        // Create booking from accepted offer
        const { data: booking, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            product_id: offer.product_id,
            renter_id: isOwner ? offer.sender_id : userId,
            owner_id: isOwner ? userId : product.owner_id,
            start_date: offer.start_date,
            end_date: offer.end_date,
            total_days: offer.total_days,
            daily_rate: offer.offered_price / offer.total_days,
            total_price: offer.offered_price,
            security_deposit: offer.offered_security_deposit,
            booking_status: "pending_payment",
            payment_status: "pending",
            order_stage: "pending_packing_video",
          })
          .select()
          .single();

        if (bookingError) throw bookingError;

        // Update offer status
        const { error: updateError } = await supabase
          .from("offers")
          .update({ status: "accepted", responded_at: new Date().toISOString() })
          .eq("id", offerId);

        if (updateError) throw updateError;

        // Update conversation with booking
        await supabase
          .from("chat_conversations")
          .update({ 
            booking_id: booking.id,
          })
          .eq("id", conversationId);

        toast.success("Offer accepted! Buyer can now pay the platform fee to confirm.");
        onOfferAccepted(offer);
      } else {
        // Reject offer
        const { error: updateError } = await supabase
          .from("offers")
          .update({ status: "rejected", responded_at: new Date().toISOString() })
          .eq("id", offerId);

        if (updateError) throw updateError;

        // Send rejection notification to the buyer
        try {
          const buyerId = offer.sender_id;
          const buyerProfile = await fetchPublicProfile(buyerId);

          const chatLink = `/chat?id=${conversationId}`;
          
          // Create in-app notification
          await supabase.from("notifications").insert({
            user_id: buyerId,
            type: "offer",
            title: "Offer Not Accepted",
            message: `Your offer for "${product?.title}" was not accepted. Try sending a new offer!`,
            link: chatLink,
          });

          // Send email notification
          await sendEmailNotification({
            type: "offer_rejected",
            recipientEmail: "",
            recipientName: buyerProfile?.name || "Choti Behen",
            data: {
              productTitle: product?.title,
              chatLink: `${window.location.origin}${chatLink}`,
              buyerId,
            },
          });
        } catch (notifError) {
          console.error("Failed to send rejection notification:", notifError);
        }

        toast.info("Offer rejected");
        onOfferCreated();
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to respond to offer");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="space-y-3">
      {/* Pending Offer Display */}
      {pendingOffer && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
                Pending Offer
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(new Date(pendingOffer.created_at), "MMM dd, HH:mm")}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground text-xs">{pendingOffer.sender_id === userId ? "Your offer" : isOwner ? "Buyer offers" : "Seller offers"}</p>
                  <p className="font-semibold">PKR {pendingOffer.offered_price.toLocaleString()}</p>
                </div>
              </div>
              {!isSale && (
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground text-xs">Security</p>
                  <p className="font-semibold">PKR {pendingOffer.offered_security_deposit.toLocaleString()}</p>
                </div>
              </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Listed price: PKR {Number(listedPrice || 0).toLocaleString()}</p>
            
            {!isSale && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>
                {format(new Date(pendingOffer.start_date), "MMM dd")} - {format(new Date(pendingOffer.end_date), "MMM dd, yyyy")}
                <span className="text-muted-foreground ml-1">({pendingOffer.total_days} days)</span>
              </span>
            </div>
            )}

            {/* Accept/Reject buttons - shown to the OTHER party */}
            {pendingOffer.sender_id !== userId && (
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => handleRespondToOffer(pendingOffer.id, true)}
                  disabled={loading}
                  className="flex-1"
                  size="sm"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}
                  Accept
                </Button>
                <Button
                  onClick={async () => { await handleRespondToOffer(pendingOffer.id, false); setShowForm(true); }}
                  disabled={loading}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  Counter
                </Button>
                <Button
                  onClick={() => handleRespondToOffer(pendingOffer.id, false)}
                  disabled={loading}
                  variant="ghost"
                  size="sm"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {pendingOffer.sender_id === userId && (
              <p className="text-xs text-muted-foreground text-center">
                Waiting for response...
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Offer Form - buyer or seller */}
      {!pendingOffer && (
        <>
          {!showForm ? (
            <Button onClick={() => setShowForm(true)} variant="outline" className="w-full">
              💰 {isOwner ? "Offer a price" : "Make an offer"}
            </Button>
          ) : (
            <Card className="border-primary/30">
              <CardContent className="pt-4 space-y-4">
                <h4 className="font-semibold text-sm">{isSale ? "Offer your price" : "Rental offer"}</h4>
                <p className="text-xs text-muted-foreground">
                  Listed price: <strong>PKR {Number(listedPrice || 0).toLocaleString()}</strong>{isSale ? "" : " / 4 days"}
                </p>

                <div className="space-y-3">
                {!isSale && (
                <div>
                    <Label className="text-xs">Select Rental Dates</Label>
                    <FlatpickrCalendar
                      selectedDates={dateRange}
                      onDateChange={(dates) => setDateRange(dates)}
                      mode="range"
                      minDate={new Date()}
                      placeholder="Select date range"
                    />
                    {dateRange.length === 2 && (
                      <p className="text-xs text-primary font-medium mt-1">
                        📅 Total: {Math.ceil((dateRange[1].getTime() - dateRange[0].getTime()) / (1000 * 60 * 60 * 24)) + 1} days for rent
                      </p>
                    )}
                  </div>
                )}
                  
                  <div className={isSale ? "" : "grid grid-cols-2 gap-2"}>
                    <div>
                      <Label className="text-xs">Your price (PKR)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 15000"
                        value={offerData.price}
                        onChange={(e) => setOfferData({ ...offerData, price: e.target.value })}
                      />
                    </div>
                    {!isSale && (
                    <div>
                      <Label className="text-xs">Security Deposit (PKR)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 5000"
                        value={offerData.security}
                        onChange={(e) => setOfferData({ ...offerData, security: e.target.value })}
                      />
                    </div>
                    )}
                  </div>
                </div>


                <div className="flex gap-2">
                  <Button onClick={handleCreateOffer} disabled={loading} className="flex-1" size="sm">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Offer"}
                  </Button>
                  <Button onClick={() => setShowForm(false)} variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Previous Offers */}
      {existingOffers.filter(o => o.status !== "pending").length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Previous Offers:</p>
          {existingOffers
            .filter(o => o.status !== "pending")
            .slice(0, 3)
            .map((offer) => (
              <div key={offer.id} className="text-xs p-2 bg-muted rounded flex justify-between items-center">
                <span>PKR {offer.offered_price.toLocaleString()}</span>
                <Badge variant={offer.status === "accepted" ? "default" : "secondary"} className="text-xs">
                  {offer.status}
                </Badge>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}