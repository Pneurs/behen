import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { X, Gift, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EarningsPromoPopupProps {
  userRole?: string;
}

const EarningsPromoPopup = ({ userRole }: EarningsPromoPopupProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Only show for Bari Behens and once per session
    const hasSeenPopup = sessionStorage.getItem("earnings_popup_seen");
    
    if (userRole === "bari" && !hasSeenPopup) {
      // Delay popup appearance for better UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [userRole]);

  const handleDismiss = () => {
    sessionStorage.setItem("earnings_popup_seen", "true");
    setIsVisible(false);
  };

  const handleLearnMore = () => {
    sessionStorage.setItem("earnings_popup_seen", "true");
    setIsVisible(false);
    navigate("/earn-money");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gradient-to-r from-primary to-pink-500 text-white rounded-lg shadow-xl p-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-white/80 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="flex items-start gap-3">
          <div className="bg-white/20 p-2 rounded-full flex-shrink-0">
            <Gift className="h-6 w-6" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-lg mb-1">
              Earn Money with Behen.pk! 💰
            </h3>
            <p className="text-sm text-white/90 mb-3">
              Upload your product & get <strong>PKR 250 instantly</strong>
              <br />
              <span className="inline-flex items-center gap-1">
                <Share2 className="h-3 w-3" />
                OR Share & earn <strong>PKR 150</strong> each!
              </span>
            </p>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={handleLearnMore}
              className="bg-white text-primary hover:bg-white/90"
            >
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EarningsPromoPopup;
