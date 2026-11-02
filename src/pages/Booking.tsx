import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateRange } from "react-day-picker";
import { differenceInDays, format } from "date-fns";
import { Upload } from "lucide-react";
import { Header } from "@/components/Header";

export default function Booking() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [product, setProduct] = useState<any>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentNotes, setPaymentNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchProduct();
    checkAuth();
    fetchExistingBookings();
  }, [productId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
  };

  const fetchProduct = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load product",
        variant: "destructive",
      });
      return;
    }
    setProduct(data);
  };

  const fetchExistingBookings = async () => {
    const { data, error } = await supabase
      .from("bookings")
      .select("start_date, end_date")
      .eq("product_id", productId)
      .in("booking_status", ["confirmed", "payment_submitted", "pending_payment"]);

    if (!error && data) {
      setExistingBookings(data);
    }
  };

  const calculateTotals = () => {
    if (!dateRange?.from || !dateRange?.to || !product) return { days: 0, total: 0, deposit: 0 };
    
    const days = differenceInDays(dateRange.to, dateRange.from) + 1;
    const total = days * (product.rental_price_per_day || 0);
    const deposit = product.security_deposit || 0;
    
    return { days, total, deposit };
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

  const checkDateOverlap = () => {
    if (!dateRange?.from || !dateRange?.to) return false;

    const selectedStart = dateRange.from;
    const selectedEnd = dateRange.to;

    for (const booking of existingBookings) {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);
      
      // Check for overlap
      if (bookingStart <= selectedEnd && bookingEnd >= selectedStart) {
        return true; // Overlap found
      }
    }

    return false;
  };

  const handleSubmitBooking = async () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Error",
        description: "Please select booking dates",
        variant: "destructive",
      });
      return;
    }

    // Check for date overlap
    if (checkDateOverlap()) {
      toast({
        title: "Error",
        description: "Selected dates overlap with an existing booking. Please choose different dates.",
        variant: "destructive",
      });
      return;
    }

    if (!paymentProof) {
      toast({
        title: "Error",
        description: "Please upload payment proof",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Upload payment proof
      const fileExt = paymentProof.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(`${user.id}/payment-proofs/${fileName}`, paymentProof);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(`${user.id}/payment-proofs/${fileName}`);

      // Create booking
      const { days, total, deposit } = calculateTotals();
      const { error: bookingError } = await supabase
        .from("bookings")
        .insert({
          product_id: productId,
          renter_id: user.id,
          owner_id: product.owner_id,
          start_date: format(dateRange.from, "yyyy-MM-dd"),
          end_date: format(dateRange.to, "yyyy-MM-dd"),
          total_days: days,
          daily_rate: product.rental_price_per_day,
          total_price: total,
          security_deposit: deposit,
          payment_proof_url: publicUrl,
          payment_notes: paymentNotes,
          booking_status: 'payment_submitted',
          payment_status: 'submitted',
        });

      if (bookingError) throw bookingError;

      toast({
        title: "Booking Submitted!",
        description: "Your booking is pending admin verification",
      });

      navigate("/browse");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { days, total, deposit } = calculateTotals();

  if (!product) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Book: {product.title}</h1>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={1}
                disabled={(date) => {
                  // Disable past dates
                  if (date < new Date(new Date().setHours(0, 0, 0, 0))) return true;

                  // Disable blackout dates
                  if (product?.availability_data?.blackout_dates) {
                    const blackoutDates = product.availability_data.blackout_dates.map((d: string) => new Date(d));
                    if (
                      blackoutDates.some(
                        (bd) => bd.toDateString() === date.toDateString(),
                      )
                    ) {
                      return true;
                    }
                  }

                  // Disable booked dates
                  for (const booking of existingBookings) {
                    const start = new Date(booking.start_date);
                    const end = new Date(booking.end_date);
                    if (date >= start && date <= end) {
                      return true;
                    }
                  }

                  return false;
                }}
                className="pointer-events-auto"
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Daily Rate:</span>
                  <span className="font-semibold">₹{product.rental_price_per_day}/day</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Days:</span>
                  <span className="font-semibold">{days} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Rental Total:</span>
                  <span className="font-semibold">₹{total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Security Deposit:</span>
                  <span className="font-semibold">₹{deposit}</span>
                </div>
                <div className="border-t pt-4 flex justify-between text-lg">
                  <span className="font-bold">Total Amount:</span>
                  <span className="font-bold">₹{total + deposit}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm font-semibold mb-2">Bank Details:</p>
                  <p className="text-sm">Account: 1234567890</p>
                  <p className="text-sm">IFSC: SBIN0001234</p>
                  <p className="text-sm">Name: Choti Behen Platform</p>
                </div>

                <div>
                  <Label htmlFor="payment-proof">Upload Payment Screenshot *</Label>
                  <div className="mt-2">
                    <label htmlFor="payment-proof" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">
                          {paymentProof ? paymentProof.name : "Click to upload payment proof"}
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
                  <Label htmlFor="payment-notes">Transaction ID / Notes</Label>
                  <Textarea
                    id="payment-notes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Enter transaction ID or additional notes"
                  />
                </div>

                <Button 
                  onClick={handleSubmitBooking} 
                  disabled={loading || !dateRange?.from || !dateRange?.to}
                  className="w-full"
                >
                  {loading ? "Submitting..." : "Submit Booking"}
                </Button>
              </CardContent>
          </Card>
        </div>
      </div>
      </div>
    </div>
    </div>
  );
}