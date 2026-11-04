import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Phone, User, CheckCircle, Loader2, MapPin, MessageCircle } from "lucide-react";

const toWa = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("0") ? "92" + d.slice(1) : d;
};

interface ContactInfoRevealProps {
  booking: any;
  userId: string;
  product?: any;
}

interface UserProfile {
  name: string;
  phone: string | null;
  city: string | null;
  area: string | null;
}

export default function ContactInfoReveal({ booking, userId, product }: ContactInfoRevealProps) {
  const [loading, setLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
  const [renterProfile, setRenterProfile] = useState<UserProfile | null>(null);

  const isOwner = userId === booking.owner_id;
  const isPaymentVerified = booking.payment_status === "verified";
  const isSaleProduct = product?.listing_type === "sale";

  useEffect(() => {
    if (isPaymentVerified) {
      fetchContactInfo();
    } else {
      setLoading(false);
    }
  }, [booking.id, isPaymentVerified]);

  const fetchContactInfo = async () => {
    setLoading(true);
    try {
      // Contact details are only returned for the two people in a paid booking
      const { data } = await supabase.rpc("get_booking_contacts", { _booking_id: booking.id });
      const contacts = data as { owner?: UserProfile | null; renter?: UserProfile | null } | null;
      if (contacts?.owner) setOwnerProfile(contacts.owner);
      if (contacts?.renter) setRenterProfile(contacts.renter);
    } catch (error) {
      console.error("Failed to fetch contact info:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isPaymentVerified) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <User className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <p className="font-medium">Contact info is hidden</p>
            <p className="text-sm mt-1">
              Contact details will be revealed after admin verifies payment.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading contact info...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const otherProfile = isOwner ? renterProfile : ownerProfile;
  const otherLabel = isOwner ? "Choti Behen (Buyer)" : "Bari Behen (Seller)";

  return (
    <Card className="border-green-500/30 bg-green-500/5">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Contact Information Unlocked
          </span>
          <Badge variant="default" className="bg-green-500">
            Payment Verified
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-green-600 font-medium">
          ✓ Payment verified. You may coordinate {isSaleProduct ? "pickup" : "pickup/return"} now.
        </p>

        <div className="bg-background p-4 rounded-lg border space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            {otherLabel}
          </h4>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{otherProfile?.name || "N/A"}</span>
            </div>

            {otherProfile?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${otherProfile.phone}`}
                  className="text-primary hover:underline"
                >
                  {otherProfile.phone}
                </a>
              </div>
            )}

            {otherProfile?.phone && (
              <div className="flex gap-2 pt-1">
                <Button asChild size="sm" className="flex-1">
                  <a
                    href={`https://wa.me/${toWa(otherProfile.phone)}?text=${encodeURIComponent(`Assalam o Alaikum! I'm contacting you from Behen.pk about "${product?.title || "the dress"}".`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="h-4 w-4 mr-1" /> Open WhatsApp
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline" className="flex-1">
                  <a href={`tel:${otherProfile.phone}`}>
                    <Phone className="h-4 w-4 mr-1" /> Call
                  </a>
                </Button>
              </div>
            )}

            {(otherProfile?.city || otherProfile?.area) && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>
                  {[otherProfile.area, otherProfile.city].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </div>
        </div>

        {product && (product.pickup_location || product.dropoff_location || product.contact_phone) && (
          <div className="bg-primary/5 p-4 rounded-lg border border-primary/20 space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {isSaleProduct ? "Pickup Details" : "Pickup & Dropoff Locations"}
            </h4>

            <div className="space-y-2">
              {isSaleProduct && product.contact_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground w-20">Contact:</span>
                  <a href={`tel:${product.contact_phone}`} className="text-primary hover:underline">
                    {product.contact_phone}
                  </a>
                </div>
              )}

              {product.pickup_location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-xs font-medium text-muted-foreground w-20">Pickup:</span>
                  <span>{product.pickup_location}</span>
                </div>
              )}

              {!isSaleProduct && product.dropoff_location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <span className="text-xs font-medium text-muted-foreground w-20">Dropoff:</span>
                  <span>{product.dropoff_location}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center">
          Please coordinate {isSaleProduct ? "pickup" : "pickup time and return"} directly with {isOwner ? "Choti Behen" : "Bari Behen"}.
        </p>
      </CardContent>
    </Card>
  );
}
