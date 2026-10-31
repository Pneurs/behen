import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { isWebPushSupported, subscribeWebPush } from "@/lib/webPush";
import { toast } from "sonner";

const DISMISS_KEY = "behen_push_prompt_dismissed_at";
const DISMISS_DAYS = 3;

const WebPushPrompt = () => {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user || !isWebPushSupported()) return setShow(false);
    if (Notification.permission === "granted") {
      // Keep this browser linked to the signed-in account
      subscribeWebPush().catch(() => {});
      return setShow(false);
    }
    if (Notification.permission === "denied") return setShow(false);
    const at = Number(localStorage.getItem(DISMISS_KEY) || 0);
    setShow(Date.now() - at > DISMISS_DAYS * 86400000);
  }, [user]);

  if (!show || pathname.startsWith("/admin") || pathname.startsWith("/auth")) return null;

  const enable = async () => {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm === "granted" && (await subscribeWebPush())) {
        toast.success("Notifications on! You will receive your customers' alerts here.");
      } else if (perm === "denied") {
        toast.error("Notifications blocked. You can allow them from your browser settings.");
      }
    } catch {
      toast.error("Could not turn on notifications on this browser.");
    } finally {
      setBusy(false);
      setShow(false);
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md rounded-xl border border-primary/30 bg-card shadow-lg p-4">
      <button onClick={dismiss} aria-label="Close" className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="space-y-2 pr-4">
          <p className="font-semibold text-sm">Turn on notifications</p>
          <p className="text-sm text-muted-foreground">
            You will receive your customers' alerts here — get notified instantly when someone messages you about a dress.
          </p>
          <p className="text-xs text-muted-foreground" dir="rtl">
            نوٹیفکیشن آن کریں — کسٹمر کا میسج آتے ہی آپ کو یہیں اطلاع ملے گی۔
          </p>
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={enable} disabled={busy}>
              {busy ? "Turning on..." : "Allow notifications"}
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebPushPrompt;
