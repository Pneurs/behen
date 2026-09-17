import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, ShieldCheck, MessageCircle, RefreshCw, Clock, Copy } from "lucide-react";
import { useWhatsAppBusinessNumber, normalizePhoneForWhatsApp } from "@/hooks/useWhatsAppBusinessNumber";

interface PhoneVerificationCardProps {
  userId: string;
  compact?: boolean;
}

export function PhoneVerificationCard({ userId, compact = false }: PhoneVerificationCardProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [phone, setPhone] = useState("");
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [sentAt, setSentAt] = useState<string | null>(null);
  const { businessNumber } = useWhatsAppBusinessNumber();

  const fetchStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("phone, phone_verified, phone_verification_code, phone_verification_sent_at")
        .eq("user_id", userId)
        .single();

      if (error) throw error;
      setPhone(data.phone || "");
      setVerified(data.phone_verified || false);
      setCode(data.phone_verification_code);
      setSentAt(data.phone_verification_sent_at);
    } catch (e) {
      console.error("Error fetching verification status:", e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const generateCode = async () => {
    if (!phone.trim()) {
      toast.error("Please add and save your phone number above first");
      return;
    }
    setGenerating(true);
    try {
      const newCode = Math.floor(100000 + Math.random() * 900000).toString();
      const { error } = await supabase
        .from("profiles")
        .update({
          phone_verification_code: newCode,
          phone_verification_sent_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) throw error;
      setCode(newCode);
      setSentAt(new Date().toISOString());
      toast.success("Verification code generated! Send it to us on WhatsApp.");
    } catch (e: any) {
      console.error("Error generating code:", e);
      toast.error("Failed to generate code. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const openWhatsApp = () => {
    if (!businessNumber) {
      toast.error("WhatsApp verification is not available right now. Please contact support.");
      return;
    }
    const message = `Hello Behen.pk! My WhatsApp verification code is: ${code}`;
    window.open(`https://wa.me/${businessNumber}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Code copied!");
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
        {!code ? (
          <>
            <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Save your WhatsApp number in your profile above</li>
              <li>Generate your unique code</li>
              <li>Send it to us on WhatsApp — that's it!</li>
            </ol>
            <Button onClick={generateCode} disabled={generating} className="w-full">
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Verification Code"
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
              <span className="text-3xl font-mono font-bold tracking-widest">{code}</span>
              <Button variant="ghost" size="icon" onClick={copyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={openWhatsApp}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Send Code via WhatsApp
            </Button>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>
                Awaiting confirmation{sentAt ? ` since ${new Date(sentAt).toLocaleString()}` : ""}.
                Our team will verify your number shortly after you send the code.
              </p>
            </div>
            <Button variant="outline" onClick={generateCode} disabled={generating} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate New Code
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
