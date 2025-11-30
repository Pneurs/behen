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
import { ArrowLeft, Star, Clock, AlertTriangle } from "lucide-react";
import { format, differenceInDays, differenceInHours, differenceInMinutes } from "date-fns";
import ReviewForm from "@/components/ReviewForm";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";

export default function MyBookings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);

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
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          products (title, ai_cover_image, rental_price_per_day),
          profiles!bookings_owner_id_fkey (name),
          reviews (id)
        `)
        .eq("renter_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBookings(data || []);
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

  const handleReview = (booking: any) => {
    setSelectedBooking(booking);
    setShowReviewDialog(true);
  };

  const handleReviewSubmitted = () => {
    setShowReviewDialog(false);
    fetchBookings(user.id);
  };

  // Calculate time remaining to return
  const getReturnCountdown = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    
    if (now > end) {
      // Past due
      const daysPast = differenceInDays(now, end);
      return {
        isPastDue: true,
        display: `${daysPast} day${daysPast > 1 ? 's' : ''} overdue`,
        severity: "high"
      };
    }
    
    const daysLeft = differenceInDays(end, now);
    const hoursLeft = differenceInHours(end, now) % 24;
    const minutesLeft = differenceInMinutes(end, now) % 60;
    
    if (daysLeft === 0 && hoursLeft === 0) {
      return {
        isPastDue: false,
        display: `${minutesLeft} minute${minutesLeft > 1 ? 's' : ''} left`,
        severity: "high"
      };
    }
    
    if (daysLeft === 0) {
      return {
        isPastDue: false,
        display: `${hoursLeft} hour${hoursLeft > 1 ? 's' : ''} left`,
        severity: "medium"
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

  const completedBookings = bookings.filter(
    (b) => b.booking_status === "completed"
  );
  const activeBookings = bookings.filter(
    (b) => b.booking_status === "confirmed" || b.booking_status === "active"
  );
  const pendingBookings = bookings.filter(
    (b) => b.booking_status === "payment_submitted" || b.booking_status === "pending_payment"
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">My Bookings</h1>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({bookings.length})</TabsTrigger>
            <TabsTrigger value="active">Active ({activeBookings.length})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingBookings.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedBookings.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <BookingsList
              bookings={bookings}
              onReview={handleReview}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getReturnCountdown={getReturnCountdown}
            />
          </TabsContent>

          <TabsContent value="active">
            <BookingsList
              bookings={activeBookings}
              onReview={handleReview}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getReturnCountdown={getReturnCountdown}
            />
          </TabsContent>

          <TabsContent value="pending">
            <BookingsList
              bookings={pendingBookings}
              onReview={handleReview}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getReturnCountdown={getReturnCountdown}
            />
          </TabsContent>

          <TabsContent value="completed">
            <BookingsList
              bookings={completedBookings}
              onReview={handleReview}
              getStatusColor={getStatusColor}
              getStatusLabel={getStatusLabel}
              getReturnCountdown={getReturnCountdown}
            />
          </TabsContent>
        </Tabs>
        </div>
      </div>

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
    </div>
  );
}

interface BookingsListProps {
  bookings: any[];
  onReview: (booking: any) => void;
  getStatusColor: (status: string) => any;
  getStatusLabel: (status: string) => string;
  getReturnCountdown: (endDate: string) => {
    isPastDue: boolean;
    display: string;
    severity: string;
  };
}

function BookingsList({
  bookings,
  onReview,
  getStatusColor,
  getStatusLabel,
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
          const countdown = (booking.booking_status === "confirmed" || booking.booking_status === "active") 
            ? getReturnCountdown(booking.end_date) 
            : null;

          return (
            <Card key={booking.id}>
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
                        <p className="text-sm text-muted-foreground">
                          Seller: {booking.profiles?.name}
                        </p>
                        <p className="text-sm">
                          {format(new Date(booking.start_date), "MMM dd")} -{" "}
                          {format(new Date(booking.end_date), "MMM dd, yyyy")}
                        </p>
                        <p className="text-sm font-semibold mt-2">
                          PKR {Number(booking.total_price).toLocaleString()}
                        </p>
                      </div>
                      <Badge variant={getStatusColor(booking.booking_status)}>
                        {getStatusLabel(booking.booking_status)}
                      </Badge>
                    </div>

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
                            {countdown.isPastDue ? "⚠️ Overdue:" : "Time to return:"} {countdown.display}
                          </p>
                          {countdown.isPastDue && (
                            <p className="text-xs mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Penalty charges may apply
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {booking.booking_status === "completed" && !booking.reviews?.length && (
                      <Button
                        className="mt-4"
                        size="sm"
                        onClick={() => onReview(booking)}
                      >
                        <Star className="mr-2 h-4 w-4" />
                        Leave a Review
                      </Button>
                    )}

                    {booking.reviews?.length > 0 && (
                      <Badge variant="secondary" className="mt-4">
                        Review Submitted
                      </Badge>
                    )}
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