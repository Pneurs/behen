import { Info, Wallet, ShieldCheck, Clock, CheckCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PaymentInfoCardProps {
  booking: {
    total_price: number;
    security_deposit: number;
    booking_status: string;
    order_stage: string | null;
    products?: {
      listing_type?: string;
      product_type?: string;
    };
  };
  isOwner: boolean; // Bari Behen
  isRenter: boolean; // Choti Behen
}

export default function PaymentInfoCard({ booking, isOwner, isRenter }: PaymentInfoCardProps) {
  const isSale = booking.products?.listing_type === "sale" || booking.products?.product_type === "sale";
  const isCompleted = booking.order_stage === "completed" || booking.booking_status === "completed";
  const isDelivered = ["in_rental_period", "pending_return_video", "pending_acceptance_video", "completed", "closed"].includes(booking.order_stage || "");
  
  const totalPrice = Number(booking.total_price);
  const securityDeposit = Number(booking.security_deposit);

  // Tooltip content based on user role and product type
  const getOwnerTooltip = () => {
    if (isSale) {
      return "You will receive the full payment once the product is delivered and confirmed by the buyer.";
    }
    return "You receive the rental amount as soon as the product is picked up. Security deposit is held by platform and released to you only if the item is damaged or not returned.";
  };

  const getRenterTooltip = () => {
    if (isSale) {
      return "Your payment is held securely until delivery is confirmed.";
    }
    return "Rental is paid to Bari Behen upon pickup. Security deposit is held by platform and returned to you after successful return. If item is damaged or not returned, security may be partially/fully given to Bari Behen.";
  };

  return (
    <div className="mt-3 p-3 rounded-md bg-muted/50 border border-border/50">
      <div className="flex items-center gap-2 mb-2">
        <Wallet className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Payment Breakdown</span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="ml-auto">
                <Info className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-sm">
                {isOwner ? getOwnerTooltip() : getRenterTooltip()}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-2 text-sm">
        {/* Rental/Sale Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDelivered ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
            ) : (
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            )}
            <span className="text-muted-foreground">
              {isSale ? "Sale Price" : "Rental Amount"}
            </span>
          </div>
          <div className="text-right">
            <span className="font-semibold">PKR {totalPrice.toLocaleString()}</span>
            <p className="text-xs text-muted-foreground">
              {isOwner ? (
                isDelivered ? (
                  <span className="text-green-600">Received</span>
                ) : (
                  "On delivery"
                )
              ) : (
                isDelivered ? (
                  <span className="text-green-600">Paid to seller</span>
                ) : (
                  "Pending delivery"
                )
              )}
            </p>
          </div>
        </div>

        {/* Security Deposit - Only for rentals */}
        {!isSale && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-muted-foreground">Security Deposit</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">
                      {isOwner 
                        ? "Security is held by platform. You receive it if item is damaged or not returned on time."
                        : "Held safely by platform. Returned to you after successful return, or given to seller if damaged/not returned."
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-right">
              <span className="font-semibold">PKR {securityDeposit.toLocaleString()}</span>
              <p className="text-xs text-muted-foreground">
                {isCompleted ? (
                  isRenter ? (
                    <span className="text-green-600">Refunded</span>
                  ) : (
                    <span className="text-muted-foreground">Returned to buyer</span>
                  )
                ) : (
                  <span className="text-blue-600">Held by platform</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="font-medium">Total {isRenter ? "Paid" : "Value"}</span>
          <span className="font-bold text-primary">
            PKR {(totalPrice + (isSale ? 0 : securityDeposit)).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
