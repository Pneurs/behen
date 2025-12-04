import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Phone, Mail, User, CheckCircle, Loader2, MapPin } from "lucide-react";

interface ContactInfoRevealProps {
  booking: any;
  userId: string;
}

interface UserProfile {
  name: string;
  phone: string | null;
  city: string | null;
  area: string | null;
}

export default function ContactInfoReveal({ booking, userId }: ContactInfoRevealProps) {
  const [loading, setLoading] = useState(true);
  const [ownerProfile, setOwnerProfile] = useState<UserProfile | null>(null);
  const [renterProfile, setRenterProfile] = useState<UserProfile | null>(null);
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
  const [renterEmail, setRenterEmail] = useState<string | null>(null);

  const isOwner = userId === booking.owner_id;
  const isPaymentVerified = booking.payment_status === "verified";

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
      // Fetch profiles
      const [ownerRes, renterRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("name, phone, city, area")
          .eq("user_id", booking.owner_id)
          .single(),
        supabase
          .from("profiles")
          .select("name, phone, city, area")
          .eq("user_id", booking.renter_id)
          .single(),
      ]);

      if (ownerRes.data) setOwnerProfile(ownerRes.data);
      if (renterRes.data) setRenterProfile(renterRes.data);

      // For now, we'll show a placeholder for email since we can't access auth.users directly
      // In a real implementation, you'd fetch this via an edge function
      setOwnerEmail("Contact via app");
      setRenterEmail("Contact via app");
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
  const otherLabel = isOwner ? "Choti Behen (Renter)" : "Bari Behen (Owner)";

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
          ✓ Payment verified. You may coordinate pickup now.
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

        <p className="text-xs text-muted-foreground text-center">
          Please coordinate pickup time and location directly with {isOwner ? "Choti Behen" : "Bari Behen"}.
        </p>
      </CardContent>
    </Card>
  );
}
