import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Phone, Eye, EyeOff, User, AlertTriangle, ShieldCheck } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface OwnerContactCardProps {
  owner: {
    name: string;
    phone: string | null;
    role: string;
    phone_verified?: boolean;
  };
  currentUser: any;
  onLoginClick: () => void;
}

export default function OwnerContactCard({ owner, currentUser, onLoginClick }: OwnerContactCardProps) {
  const [showDialog, setShowDialog] = useState(false);

  const handleShowContact = () => {
    if (!currentUser) {
      onLoginClick();
      return;
    }
    setShowDialog(true);
  };

  return (
    <>
      <Button
        variant="outline"
        size="lg"
        onClick={handleShowContact}
        className="w-full"
      >
        {currentUser ? (
          <>
            <Eye className="mr-2 h-5 w-5" />
            Show Contact Details
          </>
        ) : (
          <>
            <EyeOff className="mr-2 h-5 w-5" />
            Sign in to View Contact
          </>
        )}
      </Button>

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
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
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

                {owner.phone && (
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a 
                      href={`tel:${owner.phone}`}
                      className="text-primary hover:underline font-medium"
                    >
                      {owner.phone}
                    </a>
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
