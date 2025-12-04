import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, Package, Calendar, TrendingUp, Check, X, Eye, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Header } from "@/components/Header";

export default function Admin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ users: 0, products: 0, bookings: 0, revenue: 0 });
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .single();

    if (!roles) {
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    setIsAdmin(true);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);

    // Fetch stats
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: productCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true });

    const { data: completedBookings } = await supabase
      .from("bookings")
      .select("total_price")
      .eq("booking_status", "completed");

    const revenue = completedBookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0;

    setStats({
      users: userCount || 0,
      products: productCount || 0,
      bookings: bookingCount || 0,
      revenue,
    });

    // Fetch pending bookings with owner and renter info
    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        *,
        products (title, ai_cover_image)
      `)
      .eq("payment_status", "submitted")
      .order("created_at", { ascending: false });

    // Fetch owner and renter names for each booking
    const bookingsWithNames = await Promise.all((bookings || []).map(async (booking) => {
      const [ownerProfile, renterProfile] = await Promise.all([
        supabase.from("profiles").select("name, phone").eq("user_id", booking.owner_id).single(),
        supabase.from("profiles").select("name, phone").eq("user_id", booking.renter_id).single(),
      ]);
      
      return {
        ...booking,
        owner_name: ownerProfile.data?.name || "Bari Behen",
        owner_phone: ownerProfile.data?.phone || null,
        renter_name: renterProfile.data?.name || "Choti Behen",
        renter_phone: renterProfile.data?.phone || null,
      };
    }));

    setPendingBookings(bookingsWithNames);

    // Fetch pending products
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    // Fetch owner names for products
    const productsWithNames = await Promise.all((products || []).map(async (product) => {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", product.owner_id)
        .single();
      
      return {
        ...product,
        owner_name: ownerProfile?.name || "Unknown",
      };
    }));

    setPendingProducts(productsWithNames);

    // Fetch users
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(allUsers || []);

    setLoading(false);
  };

  const handleVerifyPayment = async (bookingId: string, approved: boolean) => {
    const updateData = approved 
      ? {
          payment_status: "verified" as const,
          booking_status: "confirmed" as const,
          order_stage: "pending_packing_video" as const,
        }
      : {
          payment_status: "rejected" as const,
        };

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", bookingId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: approved ? "Payment Verified" : "Payment Rejected",
      description: approved 
        ? "Contact details unlocked. Video verification flow is now active."
        : "Choti Behen will be notified to upload correct payment proof.",
    });

    fetchData();
  };

  const handleApproveProduct = async (productId: string, approved: boolean) => {
    const { error } = await supabase
      .from("products")
      .update({ status: approved ? "published" : "rejected" })
      .eq("id", productId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: approved ? "Product Approved" : "Product Rejected",
      description: `Product has been ${approved ? "published" : "rejected"}`,
    });

    fetchData();
  };

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
        <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.users}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.products}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.bookings}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{stats.revenue.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Management Tabs */}
        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bookings">Pending Payments ({pendingBookings.length})</TabsTrigger>
            <TabsTrigger value="products">Pending Products ({pendingProducts.length})</TabsTrigger>
            <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Pending Payment Verifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {pendingBookings.map((booking) => (
                      <Card key={booking.id} className="border-amber-500/30">
                        <CardContent className="pt-6">
                          <div className="flex flex-col lg:flex-row gap-4">
                            {/* Product Image */}
                            {booking.products?.ai_cover_image && (
                              <img
                                src={booking.products.ai_cover_image}
                                alt={booking.products.title}
                                className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                              />
                            )}
                            
                            {/* Booking Details */}
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start justify-between">
                                <div>
                                  <h3 className="font-semibold text-lg">{booking.products?.title}</h3>
                                  <Badge variant="outline" className="mt-1">
                                    Order #{booking.id.slice(0, 8)}
                                  </Badge>
                                </div>
                                <Badge variant="secondary">Payment Submitted</Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <p className="text-muted-foreground">Bari Behen (Owner)</p>
                                  <p className="font-medium">{booking.owner_name}</p>
                                  {booking.owner_phone && (
                                    <p className="text-xs text-muted-foreground">{booking.owner_phone}</p>
                                  )}
                                </div>
                                <div>
                                  <p className="text-muted-foreground">Choti Behen (Renter)</p>
                                  <p className="font-medium">{booking.renter_name}</p>
                                  {booking.renter_phone && (
                                    <p className="text-xs text-muted-foreground">{booking.renter_phone}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex flex-wrap gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Dates: </span>
                                  {format(new Date(booking.start_date), "MMM dd")} - {format(new Date(booking.end_date), "MMM dd, yyyy")}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Rent: </span>
                                  <span className="font-semibold">PKR {Number(booking.total_price).toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Security: </span>
                                  <span className="font-semibold">PKR {Number(booking.security_deposit).toLocaleString()}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total: </span>
                                  <span className="font-bold text-primary">
                                    PKR {(Number(booking.total_price) + Number(booking.security_deposit)).toLocaleString()}
                                  </span>
                                </div>
                              </div>
                              
                              {booking.payment_notes && (
                                <p className="text-sm bg-muted p-2 rounded">
                                  <span className="font-medium">Note: </span>{booking.payment_notes}
                                </p>
                              )}
                            </div>
                            
                            {/* Actions */}
                            <div className="flex flex-col gap-2 lg:w-32">
                              {booking.payment_proof_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedProof(booking.payment_proof_url)}
                                  className="w-full"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Proof
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleVerifyPayment(booking.id, true)}
                                className="w-full"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleVerifyPayment(booking.id, false)}
                                className="w-full"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {pendingBookings.length === 0 && (
                      <div className="text-center py-12 text-muted-foreground">
                        <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No pending payment verifications</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products">
            <Card>
              <CardHeader>
                <CardTitle>Pending Product Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {pendingProducts.map((product) => (
                      <Card key={product.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            {product.ai_cover_image && (
                              <img
                                src={product.ai_cover_image}
                                alt={product.title}
                                className="w-24 h-24 object-cover rounded"
                              />
                            )}
                            <div className="flex-1">
                              <h3 className="font-semibold">{product.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                Owner: {product.owner_name}
                              </p>
                              <p className="text-sm">Category: {product.category}</p>
                              <p className="text-sm">
                                Price: PKR {product.rental_price_per_day}/day
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveProduct(product.id, true)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleApproveProduct(product.id, false)}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {pendingProducts.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No pending product approvals
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {users.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.phone}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.city}, {user.area}
                          </p>
                        </div>
                        <Badge variant={user.role === "bari_behen" ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payment Proof Dialog */}
        <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Payment Proof</DialogTitle>
            </DialogHeader>
            {selectedProof && (
              <div className="flex justify-center">
                <img
                  src={selectedProof}
                  alt="Payment proof"
                  className="max-w-full max-h-[70vh] object-contain rounded-lg"
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      </div>
    </div>
  );
}