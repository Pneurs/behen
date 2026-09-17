import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, ShieldX, RefreshCw, MessageCircle } from "lucide-react";
import { format } from "date-fns";

interface PendingVerification {
  user_id: string;
  name: string;
  phone: string | null;
  phone_verified: boolean;
  phone_verification_code: string | null;
  phone_verification_sent_at: string | null;
}

export default function AdminPhoneVerifications() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingVerification[]>([]);
  const [verified, setVerified] = useState<PendingVerification[]>([]);

  const fetchVerifications = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name, phone, phone_verified, phone_verification_code, phone_verification_sent_at")
        .or("phone_verification_code.not.is.null,phone_verified.eq.true")
        .order("phone_verification_sent_at", { ascending: false, nullsFirst: false });

      if (error) throw error;

      const rows = (data || []) as PendingVerification[];
      setPending(rows.filter((r) => !r.phone_verified && r.phone_verification_code));
      setVerified(rows.filter((r) => r.phone_verified));
    } catch (e: any) {
      console.error("Error fetching verifications:", e);
      toast({ title: "Error", description: "Failed to load verifications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  const confirmVerification = async (userId: string) => {
    setActionId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          phone_verified: true,
          phone_verification_code: null,
          phone_verification_sent_at: null,
        })
        .eq("user_id", userId);

      if (error) throw error;
      toast({ title: "Verified", description: "Seller's WhatsApp number is now verified." });
      fetchVerifications();
    } catch (e: any) {
      console.error("Error confirming verification:", e);
      toast({ title: "Error", description: "Failed to confirm verification", variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  const revokeVerification = async (userId: string) => {
    setActionId(userId);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ phone_verified: false })
        .eq("user_id", userId);

      if (error) throw error;
      toast({ title: "Revoked", description: "Verification removed from this seller." });
      fetchVerifications();
    } catch (e: any) {
      console.error("Error revoking verification:", e);
      toast({ title: "Error", description: "Failed to revoke verification", variant: "destructive" });
    } finally {
      setActionId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-green-600" />
                Pending WhatsApp Verifications ({pending.length})
              </CardTitle>
              <CardDescription>
                Match the code you received on WhatsApp with the seller below, then confirm.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchVerifications}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No pending verification requests.
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((p) => (
                <div
                  key={p.user_id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-sm text-muted-foreground">{p.phone || "No phone"}</p>
                    {p.phone_verification_sent_at && (
                      <p className="text-xs text-muted-foreground">
                        Code generated {format(new Date(p.phone_verification_sent_at), "PPp")}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-mono font-bold tracking-widest bg-muted px-3 py-1 rounded">
                      {p.phone_verification_code}
                    </span>
                    <Button
                      onClick={() => confirmVerification(p.user_id)}
                      disabled={actionId === p.user_id}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {actionId === p.user_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ShieldCheck className="h-4 w-4 mr-1" />
                          Confirm Verified
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-green-600" />
            Verified Sellers ({verified.length})
          </CardTitle>
          <CardDescription>Sellers with a verified WhatsApp number.</CardDescription>
        </CardHeader>
        <CardContent>
          {verified.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No verified sellers yet.</p>
          ) : (
            <div className="space-y-3">
              {verified.map((p) => (
                <div
                  key={p.user_id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium flex items-center gap-2">
                      {p.name}
                      <Badge className="bg-green-600 text-white hover:bg-green-600">Verified</Badge>
                    </p>
                    <p className="text-sm text-muted-foreground">{p.phone || "No phone"}</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => revokeVerification(p.user_id)}
                    disabled={actionId === p.user_id}
                  >
                    {actionId === p.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldX className="h-4 w-4 mr-1" />
                        Revoke
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
