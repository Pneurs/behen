import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Copy, ShieldCheck, MessageCircle } from "lucide-react";

export default function VerifyWhatsApp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("t") || "";
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  useEffect(() => {
    const run = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setNeedsLogin(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("get_my_verification_code", { _token: token });
      if (error) {
        console.error("Error getting verification code:", error);
        toast.error("Could not load your code. Please try again.");
      } else {
        setCode(data as string | null);
      }
      setLoading(false);
    };
    run();
  }, [token]);

  const copyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      toast.success("Code copied!");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Your WhatsApp Verification Code
          </CardTitle>
          <CardDescription>
            Copy this code and paste it into the verification box in your profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : needsLogin ? (
            <>
              <p className="text-sm text-muted-foreground">
                Please sign in to your Behen.pk account first, then open this link again.
              </p>
              <Button className="w-full" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            </>
          ) : !code ? (
            <p className="text-sm text-muted-foreground">
              This link is not valid. Please open the verification link we sent you on WhatsApp.
            </p>
          ) : (
            <>
              <div className="flex items-center justify-center gap-3 p-4 bg-muted rounded-lg">
                <span className="text-2xl font-mono font-bold tracking-wider">{code}</span>
                <Button variant="ghost" size="icon" onClick={copyCode}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <Button className="w-full" onClick={() => navigate("/profile")}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Go to Profile & Verify
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
