import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ShieldCheck, MessageCircle } from "lucide-react";
import { useWhatsAppBusinessNumber } from "@/hooks/useWhatsAppBusinessNumber";

interface PhoneVerificationCardProps {
  userId: string;
  compact?: boolean;
}

export function PhoneVerificationCard({ userId, compact = false }: PhoneVerificationCardProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [entered, setEntered] = useState("");
  const { businessNumber } = useWhatsAppBusinessNumber();

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone, phone_verified")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setPhone(data.phone || "");
      setVerified(data.phone_verified || false);
    } catch (e) {
      console.error("Error fetching verification status:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const openWhatsApp = () => {
    if (!businessNumber) {
      toast.error("WhatsApp verification is not available right now. Please contact support.");
      return;
    }
    const message = "Hi Behen.pk! Please send me my WhatsApp verification link.";
    window.open(`https://wa.me/${businessNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const submitCode = async () => {
    if (!entered.trim()) {
      toast.error("Please enter the code from your WhatsApp link");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("verify_phone_with_code", {
        _code: entered.trim(),
      });
      if (error) throw error;
      if (data === true) {
        setVerified(true);
        toast.success("Your WhatsApp number is verified!");
      } else {
        toast.error("That code doesn't match. Please open your WhatsApp link again.");
      }
    } catch (e: any) {
      console.error("Error verifying code:", e);
      toast.error("Verification failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (verified) {
    return (
      <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="flex items-center gap-3 py-4">
          <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-500 flex-shrink-0" />
          <div>
            <p className="font-semibold text-green-800 dark:text-green-300 flex items-center gap-2">
              WhatsApp Verified
              <Badge className="bg-green-600 text-white hover:bg-green-600">Verified</Badge>
            </p>
            <p className="text-sm text-green-700 dark:text-green-400">
              Your number {phone} is verified. Customers will see a verified badge on your listings.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader className={compact ? "pb-3" : ""}>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Verify Your WhatsApp Number
        </CardTitle>
        <CardDescription>
          Verified sellers get a green badge and can upload products. It takes less than a minute.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
          <li>Make sure your WhatsApp number is saved in your profile</li>
          <li>Tap the button below and send us the WhatsApp message</li>
          <li>You'll instantly get a reply with a link — open it to see your code</li>
          <li>Paste the code here to verify right away</li>
        </ol>
        <Button
          onClick={openWhatsApp}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Message Us on WhatsApp
        </Button>
        <div className="flex gap-2">
          <Input
            placeholder="Paste your code here"
            value={entered}
            onChange={(e) => setEntered(e.target.value)}
          />
          <Button onClick={submitCode} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Send the message from the same WhatsApp number saved in your profile.
        </p>
      </CardContent>
    </Card>
  );
}
