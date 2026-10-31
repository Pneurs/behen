import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Phone, Eye, EyeOff, User, AlertTriangle, ShieldCheck, Lock, Coins, Loader2, Mail, Copy } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCreditSettings, useCreditBalance, useContactUnlocked, useUnlockContact } from "@/hooks/useCredits";
import { WhatsAppOpenButton } from "@/components/WhatsAppOpenButton";

interface OwnerContactCardProps {
  owner: {
    name: string;
    phone: string | null;
    role: string;
    phone_verified?: boolean;
  };
  currentUser: any;
  productId?: string;
  onLoginClick: () => void;
}

export default function OwnerContactCard({ owner, currentUser, productId, onLoginClick }: OwnerContactCardProps) {
  const navigate = useNavigate();
  const [showDialog, setShowDialog] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [sellerEmail, setSellerEmail] = useState<string | null>(null);

  const { data: settings } = useCreditSettings();
  const { data: balance = 0 } = useCreditBalance();
  const { data: unlocked = false, refetch: refetchUnlocked } = useContactUnlocked(productId);
  const { unlock } = useUnlockContact();

  // Admins and super admins never spend credits to see seller details
  const { data: isPrivileged = false } = useQuery({
    queryKey: ["is-privileged-viewer", currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .in("role", ["admin", "super_admin"]);
      return !!data && data.length > 0;
    },
    enabled: !!currentUser?.id,
    staleTime: 5 * 60 * 1000,
  });

  const creditsEnabled = !!settings?.enabled && !!productId;
  const cost = settings?.costPerUnlock || 1;
  const needsCredits = creditsEnabled && !unlocked && !isPrivileged;

  const loadEmail = async () => {
    if (!productId) return;
    const { data, error } = await supabase.rpc("get_seller_contact", { _product_id: productId });
    if (error) return;
    const result = data as any;
    if (result?.allowed) setSellerEmail(result.email || null);
  };

  useEffect(() => {
    if (showDialog) loadEmail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDialog, productId]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Could not copy");
    }
  };

  const handleShowContact = async () => {
    if (!currentUser) {
      onLoginClick();
      return;
    }

    if (!needsCredits) {
      setShowDialog(true);
      return;
    }

    if (balance < cost) {
      toast.error(`You need ${cost} credit${cost > 1 ? "s" : ""} to see this seller's details`);
      navigate("/credits");
      return;
    }

    setUnlocking(true);
    try {
      const result = await unlock(productId!);
      if (result?.success) {
        await refetchUnlocked();
        setShowDialog(true);
      } else if (result?.reason === "insufficient_credits") {
        toast.error("You don't have enough credits");
        navigate("/credits");
      } else {
        toast.error("Could not unlock the contact details");
      }
    } catch (e: any) {
      toast.error(e.message || "Could not unlock the contact details");
    } finally {
      setUnlocking(false);
    }
  };

  // Credits are retired: contact details only appear once both platform fees are verified in chat
  // (which unlocks this dress for the buyer), or for admins.
  if (!currentUser || (!unlocked && !isPrivileged)) return null;

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={handleShowContact}
        disabled={unlocking}
        className="w-full"
      >
        {unlocking ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Unlocking...
          </>
        ) : !currentUser ? (
          <>
            <EyeOff className="mr-2 h-5 w-5" />
            Sign in to View Contact
          </>
        ) : needsCredits ? (
          <>
            <Lock className="mr-2 h-5 w-5" />
            Show Contact Details ({cost} credit{cost > 1 ? "s" : ""})
          </>
        ) : (
          <>
            <Eye className="mr-2 h-5 w-5" />
            Show Contact Details
          </>
        )}
      </Button>

      {currentUser && needsCredits && (
        <p className="text-xs text-muted-foreground text-center mt-2 flex items-center justify-center gap-1">
          <Coins className="h-3 w-3" />
          You have {balance} credit{balance === 1 ? "" : "s"} ·{" "}
          <button type="button" onClick={() => navigate("/credits")} className="underline">
            Buy credits
          </button>
        </p>
      )}

      {currentUser && isPrivileged && creditsEnabled && !unlocked && (
        <p className="text-xs text-muted-foreground text-center mt-2">
          Admin access — no credits needed
        </p>
      )}

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Details
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                    {owner.name?.[0]?.toUpperCase() || "B"}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{owner.name || "Bari Behen"}</p>
                    <p className="text-sm text-muted-foreground">
                      {owner.role === "bari" ? "Seller" : "Member"}
                    </p>
                    {owner.phone_verified && (
                      <p className="text-xs font-medium text-green-600 dark:text-green-500 flex items-center gap-1 mt-0.5">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        WhatsApp Verified
                      </p>
                    )}
                  </div>
                </div>

                {owner.phone ? (
                  <div className="flex items-center justify-between gap-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${owner.phone}`} className="text-primary hover:underline font-medium text-base">
                        {owner.phone}
                      </a>
                    </div>
                    <WhatsAppOpenButton phone={owner.phone} />
                  </div>
                ) : (
                  <p className="p-3 bg-muted rounded-lg text-sm">This seller hasn't added a phone number yet. Please message her through chat.</p>
                )}

                {sellerEmail && (
                  <div className="flex items-center justify-between gap-2 p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <a
                        href={`mailto:${sellerEmail}`}
                        className="text-primary hover:underline font-medium text-sm truncate"
                      >
                        {sellerEmail}
                      </a>
                    </div>
                    <button
                      type="button"
                      onClick={() => copy(sellerEmail, "Email")}
                      aria-label="Copy email address"
                      className="text-muted-foreground hover:text-foreground flex-shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-amber-800 dark:text-amber-200">
                    Please meet in a public place for your security.
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
