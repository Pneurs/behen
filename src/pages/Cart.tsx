import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import FlatpickrCalendar from "@/components/ui/flatpickr-calendar";
import { 
  Upload, 
  Loader2, 
  Info, 
  ShoppingBag, 
  Calendar as CalendarIcon,
  MessageCircle,
  Phone,
  CreditCard
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { sendEmailNotification } from "@/lib/emailNotifications";

const PLATFORM_WHATSAPP = "03328133263";
const SALE_FEE_PERCENT = 5;
const RENT_FEE_PERCENT = 10;

export default function Cart() {
  const { productId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderType = searchParams.get("type") as "buy" | "rent" || "rent";

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);

  // For rental
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  // Payment
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentNotes, setPaymentNotes] = useState("");

  useEffect(() => {
    checkAuth();
    if (productId) {
      fetchProduct();
      fetchExistingBookings();
    }
  }, [productId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      localStorage.setItem("auth_redirect", `/cart/${productId}?type=${orderType}`);
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const fetchProduct = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      toast.error("Failed to load product");
      navigate("/browse");
      return;
    }
    setProduct(data);
    setLoading(false);
  };

  const fetchExistingBookings = async () => {
    const { data } = await supabase
      .from("bookings")
      .select("start_date, end_date")
      .eq("product_id", productId)
      .in("booking_status", ["confirmed", "payment_submitted", "pending_payment", "payment_verified", "active"]);

    if (data) {
      setExistingBookings(data);
    }
  };

  const getBlackoutDates = () => {
    const dates: Date[] = [];
    
    if (product?.availability_data?.blackout_dates) {
      dates.push(...product.availability_data.blackout_dates.map((d: string) => new Date(d)));
    }
    
    existingBookings.forEach(booking => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    });
    
    return dates;
  };

  const calculateTotals = () => {
    if (!product) return { basePrice: 0, platformFee: 0, total: 0, deposit: 0, days: 0 };

    if (orderType === "buy") {
      const basePrice = product.sale_price || 0;
      const platformFee = Math.round(basePrice * (SALE_FEE_PERCENT / 100));
      return {
        basePrice,
        platformFee,
        total: basePrice + platformFee,
        deposit: 0,
        days: 0,
      };
    } else {
      // Rental calculation
      if (selectedDates.length < 2) {
        return { basePrice: 0, platformFee: 0, total: 0, deposit: product.security_deposit || 0, days: 0 };
      }

      const startDate = selectedDates[0];
      const endDate = selectedDates[selectedDates.length - 1];
      const days = differenceInDays(endDate, startDate) + 1;

      let basePrice = 0;
      if (days <= 4) {
        basePrice = product.rental_price_4days || (product.rental_price_per_day * 4);
      } else {
        basePrice = (product.rental_price_4days || (product.rental_price_per_day * 4)) + 
                    ((days - 4) * (product.extra_day_rate || product.rental_price_per_day));
      }

      const platformFee = Math.round(basePrice * (RENT_FEE_PERCENT / 100));
      const deposit = product.security_deposit || 0;

      return {
        basePrice,
        platformFee,
        total: basePrice + platformFee + deposit,
        deposit,
        days,
      };
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB");
        return;
      }
      setPaymentProof(file);
    }
  };

  const handleWhatsAppShare = () => {
    const { total } = calculateTotals();
    const message = `Hi! I want to ${orderType === "buy" ? "buy" : "rent"} "${product?.title}" for PKR ${total.toLocaleString()}. Product: ${window.location.origin}/product/${productId}`;
    window.open(`https://wa.me/${PLATFORM_WHATSAPP}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleSubmitOrder = async () => {
    if (orderType === "rent" && selectedDates.length < 2) {
      toast.error("Please select rental dates (minimum 4 days)");
      return;
    }

    if (!paymentProof) {
      toast.error("Please upload payment screenshot");
      return;
    }

    setSubmitting(true);

    try {
      // Upload payment proof
      const fileExt = paymentProof.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(`payment-proofs/${fileName}`, paymentProof);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(`payment-proofs/${fileName}`);

      const { basePrice, platformFee, total, deposit, days } = calculateTotals();

      let bookingData: any;
      if (orderType === "rent") {
        const startDate = selectedDates[0];
        const endDate = selectedDates[selectedDates.length - 1];

        // Create booking for rental
        const { data, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            product_id: productId,
            renter_id: user.id,
            owner_id: product.owner_id,
            start_date: format(startDate, "yyyy-MM-dd"),
            end_date: format(endDate, "yyyy-MM-dd"),
            total_days: days,
            daily_rate: product.rental_price_per_day || (product.rental_price_4days / 4),
            total_price: basePrice + platformFee,
            security_deposit: deposit,
            payment_proof_url: publicUrl,
            payment_notes: `Platform fee: PKR ${platformFee} (${RENT_FEE_PERCENT}%). ${paymentNotes}`,
            booking_status: 'payment_submitted',
            payment_status: 'submitted',
          })
          .select()
          .single();

        if (bookingError) throw bookingError;
        bookingData = data;
      } else {
        // Create booking for sale (using same table with different tracking)
        const { data, error: bookingError } = await supabase
          .from("bookings")
          .insert({
            product_id: productId,
            renter_id: user.id,
            owner_id: product.owner_id,
            start_date: format(new Date(), "yyyy-MM-dd"),
            end_date: format(new Date(), "yyyy-MM-dd"),
            total_days: 1,
            daily_rate: basePrice,
            total_price: basePrice + platformFee,
            security_deposit: 0,
            payment_proof_url: publicUrl,
            payment_notes: `SALE ORDER. Platform fee: PKR ${platformFee} (${SALE_FEE_PERCENT}%). ${paymentNotes}`,
            booking_status: 'payment_submitted',
            payment_status: 'submitted',
          })
          .select()
          .single();

        if (bookingError) throw bookingError;
        bookingData = data;
      }

      // Get owner profile and send notification
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", product.owner_id)
        .single();

      const { data: renterProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", user.id)
        .single();

      // Send email notification to Bari Behen
      await sendEmailNotification({
        type: "new_order",
        recipientEmail: `owner-${product.owner_id}@behen.pk`,
        recipientName: ownerProfile?.name || "Bari Behen",
        data: {
          productTitle: product.title,
          renterName: renterProfile?.name || "Choti Behen",
          totalPrice: total,
          orderType: orderType === "buy" ? "Sale" : "Rental",
          waitingTime: "8 hours",
        },
      });

      toast.success("Order submitted! We'll verify your payment and contact you soon.");
      navigate("/my-bookings");
    } catch (error: any) {
      toast.error(error.message || "Failed to submit order");
    } finally {
      setSubmitting(false);
    }
  };

  const { basePrice, platformFee, total, deposit, days } = calculateTotals();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) return null;

  const isOwnProduct = user?.id === product.owner_id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
            {orderType === "buy" ? "Buy" : "Rent"}: {product.title}
          </h1>
          <p className="text-muted-foreground mb-8">Complete your order below</p>

          {isOwnProduct ? (
            <Card className="p-8 text-center">
              <p className="text-lg text-muted-foreground">You cannot order your own product</p>
              <Button onClick={() => navigate(`/product/${productId}`)} className="mt-4">
                Back to Product
              </Button>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Column - Product & Calendar */}
              <div className="space-y-6">
                {/* Product Card */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="w-24 h-32 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        <img 
                          src={product.ai_cover_image || product.real_images?.[0] || "/placeholder.svg"} 
                          alt={product.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.title}</h3>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                        <Badge variant="outline" className="mt-2">
                          {orderType === "buy" ? "For Sale" : "For Rent"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Calendar for Rental */}
                {orderType === "rent" && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5" />
                        Select Rental Dates
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">Minimum 4 days rental. Select start and end date.</p>
                    </CardHeader>
                    <CardContent>
                      <FlatpickrCalendar
                        mode="range"
                        disabledDates={getBlackoutDates()}
                        onDateChange={(dates) => setSelectedDates(dates)}
                        selectedDates={selectedDates}
                        inline={true}
                        showMonths={1}
                      />
                      {selectedDates.length === 2 && (
                        <div className="mt-4 p-3 bg-primary/10 rounded-lg text-center">
                          <p className="text-sm font-medium">
                            {format(selectedDates[0], "MMM d")} - {format(selectedDates[1], "MMM d, yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {differenceInDays(selectedDates[1], selectedDates[0]) + 1} days
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Negotiate Option */}
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5 text-primary" />
                        <span className="text-sm">Want to negotiate?</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/chat?product=${productId}`)}
                      >
                        Chat with Seller
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Payment */}
              <div className="space-y-6">
                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag className="h-5 w-5" />
                      Order Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {orderType === "rent" && days > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Rental Duration:</span>
                        <span className="font-medium">{days} days</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span>{orderType === "buy" ? "Sale Price" : "Rental Price"}:</span>
                      <span className="font-semibold">PKR {basePrice.toLocaleString()}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <span>Platform Fee ({orderType === "buy" ? SALE_FEE_PERCENT : RENT_FEE_PERCENT}%):</span>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>We charge {orderType === "buy" ? "5%" : "10%"} platform fee on {orderType === "buy" ? "sales" : "rentals"} to maintain our online platform. This fee applies to both buyers and sellers.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <span className="font-semibold">PKR {platformFee.toLocaleString()}</span>
                    </div>

                    {orderType === "rent" && deposit > 0 && (
                      <div className="flex justify-between">
                        <span>Security Deposit (Refundable):</span>
                        <span className="font-semibold">PKR {deposit.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="border-t pt-4">
                      <div className="flex justify-between text-lg">
                        <span className="font-bold">Total Amount:</span>
                        <span className="font-bold text-primary">PKR {total.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5" />
                      Payment Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-primary/5 p-4 rounded-lg border">
                      <p className="text-sm font-semibold mb-2">Send payment to:</p>
                      <p className="text-sm">JazzCash/EasyPaisa: <strong>0332-8133263</strong></p>
                      <p className="text-sm">Account Name: <strong>Behen.pk</strong></p>
                    </div>

                    {/* Upload Payment Proof */}
                    <div>
                      <Label htmlFor="payment-proof">Upload Payment Screenshot *</Label>
                      <div className="mt-2">
                        <label htmlFor="payment-proof" className="cursor-pointer">
                          <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
                            <p className="mt-2 text-sm text-muted-foreground">
                              {paymentProof ? paymentProof.name : "Click to upload payment screenshot"}
                            </p>
                          </div>
                          <Input
                            id="payment-proof"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="payment-notes">Transaction ID / Notes (Optional)</Label>
                      <Textarea
                        id="payment-notes"
                        value={paymentNotes}
                        onChange={(e) => setPaymentNotes(e.target.value)}
                        placeholder="Enter transaction ID or additional notes"
                        className="mt-1"
                      />
                    </div>

                    <Button 
                      onClick={handleSubmitOrder}
                      disabled={submitting || (orderType === "rent" && days < 4) || !paymentProof}
                      className="w-full"
                      size="lg"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>Submit Order</>
                      )}
                    </Button>

                    {/* WhatsApp Alternative */}
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>

                    <Button 
                      variant="outline"
                      onClick={handleWhatsAppShare}
                      className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white border-0"
                    >
                      <Phone className="mr-2 h-4 w-4" />
                      Share on WhatsApp ({PLATFORM_WHATSAPP})
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
