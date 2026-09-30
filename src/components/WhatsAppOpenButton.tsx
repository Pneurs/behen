import { useState } from "react";
import { MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface WhatsAppOpenButtonProps {
  /** Phone in any format; normalized to 92XXXXXXXXXX */
  phone: string;
  message?: string;
  className?: string;
  children?: React.ReactNode;
}

const normalize = (phone: string) =>
  phone.replace(/\D/g, "").replace(/^0/, "92");

const isAndroid = () =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

const isMobile = () =>
  typeof navigator !== "undefined" &&
  /android|iphone|ipad|ipod/i.test(navigator.userAgent);

export const WhatsAppOpenButton = ({
  phone,
  message,
  className,
  children,
}: WhatsAppOpenButtonProps) => {
  const [open, setOpen] = useState(false);
  const number = normalize(phone);
  const text = message ? `&text=${encodeURIComponent(message)}` : "";

  const webUrl = `https://wa.me/${number}${
    message ? `?text=${encodeURIComponent(message)}` : ""
  }`;

  const openApp = (pkg: "com.whatsapp" | "com.whatsapp.w4b") => {
    if (isAndroid()) {
      // Direct Android intent so the user's chosen app opens, not the OS default
      window.location.href = `intent://send?phone=${number}${text}#Intent;scheme=whatsapp;package=${pkg};S.browser_fallback_url=${encodeURIComponent(
        webUrl
      )};end`;
    } else {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
    setOpen(false);
  };

  const handleClick = () => {
    if (isMobile()) {
      setOpen(true);
    } else {
      window.open(webUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={className ?? "text-xs font-medium text-primary underline"}
      >
        {children ?? "WhatsApp"}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-4 w-4 text-primary" />
              Open with
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose which WhatsApp app you want to use.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => openApp("com.whatsapp")}
            >
              WhatsApp
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => openApp("com.whatsapp.w4b")}
            >
              WhatsApp Business
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default WhatsAppOpenButton;
