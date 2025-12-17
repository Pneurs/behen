import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, differenceInDays, differenceInHours, differenceInMinutes, addDays } from "date-fns";
import VideoRecorder from "./VideoRecorder";
import PaymentUploadSection from "./PaymentUploadSection";
import ContactInfoReveal from "./ContactInfoReveal";
import {
  Package,
  Truck,
  Clock,
  Video,
  CheckCircle,
  AlertTriangle,
  User,
  Play,
  Loader2,
  CreditCard,
  MapPin,
  Phone,
} from "lucide-react";

interface OrderStageViewProps {
  booking: any;
  userId: string;
  onRefresh: () => void;
}

const RETURN_WINDOW_DAYS = 4;
const LATE_FEE_PER_DAY = 1550;
const MAX_LATE_DAYS = 3;

// RENTAL flow stages (3 videos: packing, return, acceptance)
const RENTAL_STAGES = [
  { key: "payment_pending", label: "Payment", icon: CreditCard },
  { key: "pending_packing_video", label: "Packing Video", icon: Package },
  { key: "pending_pickup", label: "Product Pickup", icon: Truck },
  { key: "in_rental_period", label: "Rental Period", icon: Clock },
  { key: "pending_return_video", label: "Return Video", icon: Video },
  { key: "pending_acceptance_video", label: "Acceptance Video", icon: CheckCircle },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

// SALE flow stages (1 video: packing only)
const SALE_STAGES = [
  { key: "payment_pending", label: "Payment", icon: CreditCard },
  { key: "pending_packing_video", label: "Packing Video", icon: Package },
  { key: "ready_for_pickup", label: "Ready for Pickup", icon: Truck },
  { key: "completed", label: "Completed", icon: CheckCircle },
];

export default function OrderStageView({ booking, userId, onRefresh }: OrderStageViewProps) {
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const [product, setProduct] = useState<any>(null);

  const isOwner = userId === booking.owner_id;
  const isRenter = userId === booking.renter_id;
  
  // Fetch product to determine if sale or rental
  useEffect(() => {
    const fetchProduct = async () => {
      const { data } = await supabase
        .from("products")
        .select("listing_type, contact_phone, pickup_location, dropoff_location")
        .eq("id", booking.product_id)
        .single();
      
      if (data) setProduct(data);
    };
    fetchProduct();
  }, [booking.product_id]);

  const isSaleProduct = product?.listing_type === "sale";
  const STAGES = isSaleProduct ? SALE_STAGES : RENTAL_STAGES;
  
  // Determine current stage - payment takes precedence if not verified
  const isPaymentPending = booking.payment_status !== "verified";
  const currentStage = isPaymentPending ? "payment_pending" : (booking.order_stage || "pending_packing_video");
  
  const currentStageIndex = STAGES.findIndex(s => s.key === currentStage);
  const progressPercent = ((currentStageIndex + 1) / STAGES.length) * 100;

  // Countdown timer for return window (rental only)
  useEffect(() => {
    if (isSaleProduct) return;
    if (currentStage !== "in_rental_period" && currentStage !== "pending_return_video") return;
    if (!booking.return_deadline) return;

    const interval = setInterval(() => {
      const deadline = new Date(booking.return_deadline);
      const now = new Date();
      
      if (now > deadline) {
        const daysLate = differenceInDays(now, deadline);
        setCountdown(`⚠️ ${daysLate} day${daysLate > 1 ? 's' : ''} OVERDUE`);
      } else {
        const days = differenceInDays(deadline, now);
        const hours = differenceInHours(deadline, now) % 24;
        const minutes = differenceInMinutes(deadline, now) % 60;
        setCountdown(`${days}d ${hours}h ${minutes}m remaining`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [currentStage, booking.return_deadline, isSaleProduct]);

  const handleVideoUploaded = async (videoType: string, videoUrl: string) => {
    setLoading(true);
    try {
      let updateData: any = {};
      const now = new Date().toISOString();

      if (videoType === "packing") {
        if (isSaleProduct) {
          // For sale: go directly to ready_for_pickup
          updateData = {
            packing_video_url: videoUrl,
            packing_video_uploaded_at: now,
            order_stage: "ready_for_pickup",
          };
        } else {
          // For rental: go to pending_pickup
          updateData = {
            packing_video_url: videoUrl,
            packing_video_uploaded_at: now,
            order_stage: "pending_pickup",
          };
        }
      } else if (videoType === "return") {
        updateData = {
          return_video_url: videoUrl,
          return_video_uploaded_at: now,
          order_stage: "pending_acceptance_video",
        };
      } else if (videoType === "acceptance") {
        const deleteAfter = addDays(new Date(), 7).toISOString();
        updateData = {
          acceptance_video_url: videoUrl,
          acceptance_video_uploaded_at: now,
          order_stage: "completed",
          booking_status: "completed",
          completed_at: now,
          videos_delete_after: deleteAfter,
        };
      }

      const { error } = await supabase
        .from("bookings")
        .update(updateData)
        .eq("id", booking.id);

      if (error) throw error;

      toast.success(`${videoType.charAt(0).toUpperCase() + videoType.slice(1)} video uploaded!`);
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  // For RENTAL: Mark as picked (starts rental period)
  const handleMarkAsPicked = async () => {
    setLoading(true);
    try {
      const returnDeadline = addDays(new Date(), RETURN_WINDOW_DAYS).toISOString();
      
      const { error } = await supabase
        .from("bookings")
        .update({
          order_stage: "in_rental_period",
          booking_status: "active",
          picked_at: new Date().toISOString(),
          picked_by_user_id: userId,
          return_deadline: returnDeadline,
        })
        .eq("id", booking.id);

      if (error) throw error;

      toast.success("Product marked as picked up!");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  // For SALE: Mark as delivered/picked (completes order)
  const handleMarkAsDelivered = async () => {
    setLoading(true);
    try {
      const deleteAfter = addDays(new Date(), 7).toISOString();
      
      const { error } = await supabase
        .from("bookings")
        .update({
          order_stage: "completed",
          booking_status: "completed",
          picked_at: new Date().toISOString(),
          picked_by_user_id: userId,
          completed_at: new Date().toISOString(),
          videos_delete_after: deleteAfter,
        })
        .eq("id", booking.id);

      if (error) throw error;

      toast.success("Order completed! Product delivered.");
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  const getPickedByName = () => {
    if (!booking.picked_by_user_id) return null;
    return booking.picked_by_user_id === booking.owner_id ? "Bari Behen" : "Choti Behen";
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Order Progress</span>
            <div className="flex items-center gap-2">
              {isSaleProduct && (
                <Badge variant="outline" className="text-xs">Sale</Badge>
              )}
              <Badge variant={currentStage === "completed" ? "default" : "secondary"}>
                {STAGES.find(s => s.key === currentStage)?.label}
              </Badge>
            </div>
          </div>
          <Progress value={progressPercent} className="h-2" />
          
          {/* Stage indicators */}
          <div className="flex justify-between mt-4 overflow-x-auto pb-2">
            {STAGES.map((stage, index) => {
              const StageIcon = stage.icon;
              const isComplete = index < currentStageIndex;
              const isCurrent = index === currentStageIndex;
              
              return (
                <div key={stage.key} className="flex flex-col items-center min-w-[60px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isComplete ? "bg-green-500 text-white" :
                    isCurrent ? "bg-primary text-white" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    <StageIcon className="h-4 w-4" />
                  </div>
                  <span className="text-xs mt-1 text-center max-w-[60px]">{stage.label}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment Section - Always show if payment not verified */}
      {isPaymentPending && (
        <PaymentUploadSection
          booking={booking}
          isRenter={isRenter}
          onUploadComplete={onRefresh}
        />
      )}

      {/* Contact Info - Only visible after payment verified */}
      {booking.payment_status === "verified" && (
        <ContactInfoReveal booking={booking} userId={userId} product={product} />
      )}

      {/* Stage-specific content - Only show if payment is verified */}
      {currentStage === "pending_packing_video" && !isPaymentPending && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              {isSaleProduct ? "Packing Video" : "Stage 1: Packing Video"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isOwner ? (
              <VideoRecorder
                bookingId={booking.id}
                videoType="packing"
                onUploadComplete={(url) => handleVideoUploaded("packing", url)}
                disabled={loading}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Bari Behen is preparing and packing your product...</p>
                <p className="text-sm mt-2">You'll be notified when ready for pickup.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SALE: Ready for Pickup stage */}
      {isSaleProduct && currentStage === "ready_for_pickup" && !isPaymentPending && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Ready for Pickup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.packing_video_url && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Packing Video:</p>
                <video
                  src={booking.packing_video_url}
                  controls
                  className="w-full rounded-lg max-h-[300px]"
                />
              </div>
            )}

            {/* Show pickup details from product */}
            {product && (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Pickup Details
                </h4>
                {product.contact_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${product.contact_phone}`} className="text-primary hover:underline">
                      {product.contact_phone}
                    </a>
                  </div>
                )}
                {product.pickup_location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{product.pickup_location}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="mb-4">Product is packed and ready! Coordinate pickup with the seller.</p>
              <Button onClick={handleMarkAsDelivered} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                Mark as Picked Up / Delivered
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RENTAL: Pending Pickup stage */}
      {!isSaleProduct && currentStage === "pending_pickup" && !isPaymentPending && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Stage 2: Product Pickup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.packing_video_url && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Packing Video:</p>
                <video
                  src={booking.packing_video_url}
                  controls
                  className="w-full rounded-lg max-h-[300px]"
                />
              </div>
            )}

            {/* Show pickup/dropoff details from product */}
            {product && (product.pickup_location || product.dropoff_location) && (
              <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Location Details
                </h4>
                {product.pickup_location && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-16">Pickup:</span>
                    <span>{product.pickup_location}</span>
                  </div>
                )}
                {product.dropoff_location && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs font-medium text-muted-foreground w-16">Dropoff:</span>
                    <span>{product.dropoff_location}</span>
                  </div>
                )}
              </div>
            )}
            
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="mb-4">Product is ready! Either party can mark as picked up.</p>
              <Button onClick={handleMarkAsPicked} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Truck className="mr-2 h-4 w-4" />}
                Mark as Picked / Delivered
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* RENTAL: Return Window / Return Video stages */}
      {!isSaleProduct && (currentStage === "in_rental_period" || currentStage === "pending_return_video") && (
        <Card className={countdown.includes("OVERDUE") ? "border-destructive" : ""}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Stage 3: Return Window
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Countdown Timer */}
            <div className={`text-center py-4 rounded-lg ${
              countdown.includes("OVERDUE") ? "bg-destructive/10 text-destructive" : "bg-primary/10"
            }`}>
              <p className="text-2xl font-bold">{countdown || "Loading..."}</p>
              <p className="text-sm mt-1">
                {isRenter ? "Time left to return the product" : "Product must be returned within this time"}
              </p>
            </div>

            {/* Picked by info */}
            {booking.picked_at && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                Picked up by {getPickedByName()} on {format(new Date(booking.picked_at), "MMM dd, yyyy HH:mm")}
              </div>
            )}

            {/* Dropoff location reminder */}
            {product?.dropoff_location && (
              <div className="bg-primary/5 border border-primary/20 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4" />
                  <span><strong>Dropoff Location:</strong> {product.dropoff_location}</span>
                </div>
              </div>
            )}

            {/* Late fee warning */}
            <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-600">Late Return Warning</p>
                  <p className="text-muted-foreground mt-1">
                    Failure to return on time will deduct <strong>PKR {LATE_FEE_PER_DAY.toLocaleString()}</strong> per day from your security deposit.
                    After {MAX_LATE_DAYS} days, you cannot claim your security back.
                  </p>
                </div>
              </div>
            </div>

            {/* Return Video Upload - Only for Renter */}
            {currentStage === "in_rental_period" && isRenter && (
              <VideoRecorder
                bookingId={booking.id}
                videoType="return"
                onUploadComplete={(url) => handleVideoUploaded("return", url)}
                disabled={loading}
              />
            )}

            {currentStage === "pending_return_video" && !isRenter && (
              <div className="text-center py-4 text-muted-foreground">
                <Video className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Choti Behen is returning your product...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* RENTAL: Acceptance Video stage */}
      {!isSaleProduct && currentStage === "pending_acceptance_video" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Stage 4: Verify Return
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {booking.return_video_url && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Return Video from Choti Behen:</p>
                <video
                  src={booking.return_video_url}
                  controls
                  className="w-full rounded-lg max-h-[300px]"
                />
              </div>
            )}
            
            {isOwner ? (
              <VideoRecorder
                bookingId={booking.id}
                videoType="acceptance"
                onUploadComplete={(url) => handleVideoUploaded("acceptance", url)}
                disabled={loading}
              />
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Bari Behen is verifying your return...</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Completed state */}
      {currentStage === "completed" && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
            <h3 className="text-xl font-semibold text-green-600">Order Completed!</h3>
            <p className="text-muted-foreground mt-2">
              Completed on {booking.completed_at ? format(new Date(booking.completed_at), "MMM dd, yyyy HH:mm") : "N/A"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Videos Summary */}
      {(booking.packing_video_url || booking.return_video_url || booking.acceptance_video_url) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5" />
              Videos Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              All videos include auto timestamp & watermark. Videos auto-delete 7 days after completion.
            </p>
            
            <div className="grid gap-4">
              {booking.packing_video_url && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span className="text-sm">Packing Video</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {booking.packing_video_uploaded_at && format(new Date(booking.packing_video_uploaded_at), "MMM dd, HH:mm")}
                    </span>
                    <a href={booking.packing_video_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Play className="h-3 w-3 mr-1" /> Watch
                      </Button>
                    </a>
                  </div>
                </div>
              )}
              
              {booking.return_video_url && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    <span className="text-sm">Return Video</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {booking.return_video_uploaded_at && format(new Date(booking.return_video_uploaded_at), "MMM dd, HH:mm")}
                    </span>
                    <a href={booking.return_video_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Play className="h-3 w-3 mr-1" /> Watch
                      </Button>
                    </a>
                  </div>
                </div>
              )}
              
              {booking.acceptance_video_url && (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Acceptance Video</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {booking.acceptance_video_uploaded_at && format(new Date(booking.acceptance_video_uploaded_at), "MMM dd, HH:mm")}
                    </span>
                    <a href={booking.acceptance_video_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <Play className="h-3 w-3 mr-1" /> Watch
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}