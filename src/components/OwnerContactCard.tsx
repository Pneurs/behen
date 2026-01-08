import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Phone, Eye, EyeOff } from "lucide-react";

interface OwnerContactCardProps {
  owner: {
    name: string;
    phone: string | null;
    role: string;
  };
  currentUser: any;
  onLoginClick: () => void;
}

export default function OwnerContactCard({ owner, currentUser, onLoginClick }: OwnerContactCardProps) {
  const [showPhone, setShowPhone] = useState(false);

  const handleShowContact = () => {
    if (!currentUser) {
      onLoginClick();
      return;
    }
    setShowPhone(true);
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
            {owner.name?.[0]?.toUpperCase() || "B"}
          </div>
          <div className="flex-1">
            <p className="font-semibold">{owner.name || "Bari Behen"}</p>
            <p className="text-sm text-muted-foreground">
              {owner.role === "bari" ? "Verified Seller" : "Member"}
            </p>
          </div>
        </div>

        {/* Contact Details Section */}
        <div className="mt-4 pt-4 border-t">
          {showPhone && owner.phone ? (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a 
                href={`tel:${owner.phone}`}
                className="text-primary hover:underline font-medium"
              >
                {owner.phone}
              </a>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleShowContact}
              className="w-full"
            >
              {currentUser ? (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Show Contact Details
                </>
              ) : (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Sign in to View Contact
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}