import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Gift, Instagram, Music2, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  useSocialRewardSettings,
  useSocialRewardClaimed,
  useClaimSocialReward,
} from "@/hooks/useSocialReward";

export const SocialFollowRewardCard = () => {
  const { user } = useAuth();
  const { data: settings } = useSocialRewardSettings();
  const { data: claimed } = useSocialRewardClaimed();
  const { claim } = useClaimSocialReward();
  const [open, setOpen] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [openedInstagram, setOpenedInstagram] = useState(false);
  const [openedTiktok, setOpenedTiktok] = useState(false);

  if (!user || !settings?.enabled) return null;

  const credits = settings.credits;

  const handleClaim = async () => {
    setClaiming(true);
    try {
      const result = await claim();
      if (result?.success) {
        toast.success(`${result.credits ?? credits} free credits added to your account!`);
        setOpen(false);
      } else if (result?.reason === "already_claimed") {
        toast.info("You have already claimed your free credits.");
        setOpen(false);
      } else {
        toast.error("Could not add your credits. Please try again.");
      }
    } catch {
      toast.error("Could not add your credits. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  if (claimed) {
    return (
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex items-center gap-3 py-4">
          <CheckCircle2 className="h-5 w-5 text-primary" />
          <p className="text-sm">
            Thank you for following us — your {credits} free credits were added.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10">
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-5">
          <div className="flex items-start gap-3">
            <Gift className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="font-semibold">Get {credits} free credits</p>
              <p className="text-sm text-muted-foreground">
                Follow Behen.pk on Instagram and TikTok to unlock seller details for free.
              </p>
            </div>
          </div>
          <Button onClick={() => setOpen(true)} className="shrink-0">
            Get free credits
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              Follow us and get {credits} free credits
            </DialogTitle>
            <DialogDescription>
              Tap both buttons to follow us, then come back here and claim your credits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Button
              variant={openedInstagram ? "secondary" : "outline"}
              className="w-full justify-between"
              onClick={() => {
                setOpenedInstagram(true);
                window.open(settings.instagram, "_blank", "noopener");
              }}
            >
              <span className="flex items-center gap-2">
                <Instagram className="h-4 w-4" />
                Follow on Instagram
              </span>
              {openedInstagram ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
            </Button>

            <Button
              variant={openedTiktok ? "secondary" : "outline"}
              className="w-full justify-between"
              onClick={() => {
                setOpenedTiktok(true);
                window.open(settings.tiktok, "_blank", "noopener");
              }}
            >
              <span className="flex items-center gap-2">
                <Music2 className="h-4 w-4" />
                Follow on TikTok
              </span>
              {openedTiktok ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <ExternalLink className="h-4 w-4" />
              )}
            </Button>

            <Button
              className="w-full"
              disabled={claiming || !openedInstagram || !openedTiktok}
              onClick={handleClaim}
            >
              {claiming && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              I've followed — claim {credits} credits
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              One reward per account. Please keep following us so we can keep giving free credits.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SocialFollowRewardCard;
