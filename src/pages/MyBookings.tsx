import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Star, Clock, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import ReviewForm from "@/components/ReviewForm";
import OrderStageView from "@/components/OrderStageView";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";

export default function MyBookings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    fetchBookings(user.id);
  };

  const fetchBookings = async (userId: string) => {
    setLoading(true);

    try {
      // Fetch bookings where user is either renter or owner
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          products (title, ai_cover_image, rental_price_per_day),
          reviews (id)
        `)
        .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles for owner and renter names
      const bookingsWithNames = await Promise.all((data || []).map(async (booking) => {
        const [ownerProfile, renterProfile] = await Promise.all([
          supabase.from("profiles").select("name").eq("user_id", booking.owner_id).single(),
          supabase.from("profiles").select("name").eq("user_id", booking.renter_id).single(),
        ]);
        
        return {
          ...booking,
          owner_name: ownerProfile.data?.name || "Bari Behen",
          renter_name: renterProfile.data?.name || "Choti Behen",
        };
      }));
      
      setBookings(bookingsWithNames);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
      case "active":
        return "default";
      case "completed":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "payment_submitted":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      pending_packing_video: "Awaiting Packing Video",
      pending_pickup: "Ready for Pickup",
      in_rental_period: "In Rental Period",
      pending_return_video: "Awaiting Return Video",
      pending_acceptance_video: "Awaiting Acceptance",
      completed: "Completed",
      closed: "Closed",
    };
    return labels[stage] || stage;
  };

  const handleReview = (booking: any) => {
    setSelectedBooking(booking);
    setShowReviewDialog(true);
  };

  const handleViewOrder = (booking: any) => {
    setSelectedBooking(booking);
    setShowOrderDialog(true);
  };

  const handleReviewSubmitted = () => {
    setShowReviewDialog(false);
    fetchBookings(user.id);
  };

  const getReturnCountdown = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    
    if (now > end) {
      const daysPast = differenceInDays(now, end);
      return {
        isPastDue: true,
        display: `${daysPast} day${daysPast > 1 ? 's' : ''} overdue`,
        severity: "high"
      };
    }
    
    const daysLeft = differenceInDays(end, now);
    const hoursLeft = differenceInHours(end, now) % 24;
    
    if (daysLeft === 0) {
      return {
        isPastDue: false,
        display: `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} left`,
        severity: "high"
      };
    }
    
    if (daysLeft <= 2) {
      return {
        isPastDue: false,
        display: `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`,
        severity: "medium"
      };
    }
    
    return {
      isPastDue: false,
      display: `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`,
      severity: "low"
    };
  };

  const activeBookings = bookings.filter(
    (b) => ["confirmed", "active"].includes(b.booking_status) && 
           !["completed", "closed"].includes(b.order_stage)
  );
  const completedBookings = bookings.filter(
    (b) => b.booking_status === "completed" || b.order_stage === "completed"
  );
  const pendingBookings = bookings.filter(
    (b) => ["payment_submitted", "pending_payment"].includes(b.booking_status)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">My Bookings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your rental orders as {user ? "Bari Behen (Seller) or Choti Behen (Buyer)" : ""}
            </p>
          </div>

          <Tabs defaultValue="active" className="space-y-4">
            <TabsList>
              <TabsTrigger value="active">Active ({activeBookings.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pendingBookings.length})</TabsTrigger>
              <TabsTrigger value="completed">Completed ({completedBookings.length})</TabsTrigger>
              <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="active">
              <BookingsList
                bookings={activeBookings}
                userId={user?.id}
                onViewOrder={handleViewOrder}
                onReview={handleReview}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getStageLabel={getStageLabel}
                getReturnCountdown={getReturnCountdown}
              />
            </TabsContent>

            <TabsContent value="pending">
              <BookingsList
                bookings={pendingBookings}
                userId={user?.id}
                onViewOrder={handleViewOrder}
                onReview={handleReview}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getStageLabel={getStageLabel}
                getReturnCountdown={getReturnCountdown}
              />
            </TabsContent>

            <TabsContent value="completed">
              <BookingsList
                bookings={completedBookings}
                userId={user?.id}
                onViewOrder={handleViewOrder}
                onReview={handleReview}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getStageLabel={getStageLabel}
                getReturnCountdown={getReturnCountdown}
              />
            </TabsContent>

            <TabsContent value="all">
              <BookingsList
                bookings={bookings}
                userId={user?.id}
                onViewOrder={handleViewOrder}
                onReview={handleReview}
                getStatusColor={getStatusColor}
                getStatusLabel={getStatusLabel}
                getStageLabel={getStageLabel}
                getReturnCountdown={getReturnCountdown}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Your Rental</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <ReviewForm
              booking={selectedBooking}
              onReviewSubmitted={handleReviewSubmitted}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Order Stage Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && user && (
            <OrderStageView
              booking={selectedBooking}
              userId={user.id}
              onRefresh={() => {
                fetchBookings(user.id);
                // Refresh selected booking
                const refreshed = bookings.find(b => b.id === selectedBooking.id);
                if (refreshed) setSelectedBooking(refreshed);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface BookingsListProps {
  bookings: any[];
  userId: string;
  onViewOrder: (booking: any) => void;
  onReview: (booking: any) => void;
  getStatusColor: (status: string) => any;
  getStatusLabel: (status: string) => string;
  getStageLabel: (stage: string) => string;
  getReturnCountdown: (endDate: string) => {
    isPastDue: boolean;
    display: string;
    severity: string;
  };
}

function BookingsList({
  bookings,
  userId,
  onViewOrder,
  onReview,
  getStatusColor,
  getStatusLabel,
  getStageLabel,
  getReturnCountdown,
}: BookingsListProps) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No bookings found
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-4">
        {bookings.map((booking) => {
          const isOwner = userId === booking.owner_id;
          const isRenter = userId === booking.renter_id;
          const hasReturnDeadline = booking.return_deadline && 
            ["in_rental_period", "pending_return_video"].includes(booking.order_stage);
          const countdown = hasReturnDeadline ? getReturnCountdown(booking.return_deadline) : null;

          return (
            <Card key={booking.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {booking.products?.ai_cover_image && (
                    <img
                      src={booking.products.ai_cover_image}
                      alt={booking.products.title}
                      className="w-24 h-24 object-cover rounded"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {booking.products?.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant={isOwner ? "default" : "secondary"} className="text-xs">
                            {isOwner ? "You are Seller" : "You are Buyer"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {isOwner ? `Renter: ${booking.renter_name}` : `Seller: ${booking.owner_name}`}
                        </p>
                        <p className="text-sm">
                          {format(new Date(booking.start_date), "MMM dd")} -{" "}
                          {format(new Date(booking.end_date), "MMM dd, yyyy")}
                        </p>
                        <p className="text-sm font-semibold mt-2">
                          PKR {Number(booking.total_price).toLocaleString()}
                          <span className="font-normal text-muted-foreground ml-2">
                            + PKR {Number(booking.security_deposit).toLocaleString()} security
                          </span>
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <Badge variant={getStatusColor(booking.booking_status)}>
                          {getStatusLabel(booking.booking_status)}
                        </Badge>
                        {booking.order_stage && (
                          <p className="text-xs text-muted-foreground">
                            {getStageLabel(booking.order_stage)}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Return countdown */}
                    {countdown && (
                      <div className={`mt-3 flex items-center gap-2 p-3 rounded-md ${
                        countdown.isPastDue 
                          ? "bg-destructive/10 text-destructive" 
                          : countdown.severity === "high" 
                          ? "bg-amber-500/10 text-amber-600 dark:text-amber-500" 
                          : countdown.severity === "medium" 
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-muted"
                      }`}>
                        <Clock className="h-4 w-4" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {countdown.isPastDue ? "⚠️ Overdue:" : "Return deadline:"} {countdown.display}
                          </p>
                          {countdown.isPastDue && (
                            <p className="text-xs mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Late fees: PKR 1,550/day
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4">
                      {booking.order_stage && !["completed", "closed"].includes(booking.order_stage) && (
                        <Button
                          onClick={() => onViewOrder(booking)}
                          className="flex-1"
                        >
                          Manage Order <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                      
                      {booking.order_stage === "completed" && (
                        <Button
                          onClick={() => onViewOrder(booking)}
                          variant="outline"
                        >
                          View Details
                        </Button>
                      )}

                      {booking.booking_status === "completed" && !booking.reviews?.length && isRenter && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReview(booking)}
                        >
                          <Star className="mr-2 h-4 w-4" />
                          Leave Review
                        </Button>
                      )}

                      {booking.reviews?.length > 0 && (
                        <Badge variant="secondary">
                          Review Submitted
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </ScrollArea>
  );
}