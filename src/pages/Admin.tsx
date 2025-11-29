import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Package, Calendar, TrendingUp, Check, X, Eye } from "lucide-react";
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

    // Fetch pending bookings
    const { data: bookings } = await supabase
      .from("bookings")
      .select(`
        *,
        products (title, ai_cover_image),
        profiles!bookings_renter_id_fkey (name)
      `)
      .eq("payment_status", "submitted")
      .order("created_at", { ascending: false });

    setPendingBookings(bookings || []);

    // Fetch pending products
    const { data: products } = await supabase
      .from("products")
      .select("*, profiles!products_owner_id_fkey (name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    setPendingProducts(products || []);

    // Fetch users
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setUsers(allUsers || []);

    setLoading(false);
  };

  const handleVerifyPayment = async (bookingId: string, approved: boolean) => {
    const { error } = await supabase
      .from("bookings")
      .update({
        payment_status: approved ? "verified" : "rejected",
        booking_status: approved ? "confirmed" : "cancelled",
      })
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
      description: `Booking has been ${approved ? "confirmed" : "cancelled"}`,
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

  if (loading) return <div>Loading...</div>;

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
                <CardTitle>Pending Payment Verifications</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {pendingBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="font-semibold">{booking.products?.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                Renter: {booking.profiles?.name}
                              </p>
                              <p className="text-sm">
                                {format(new Date(booking.start_date), "MMM dd")} - {format(new Date(booking.end_date), "MMM dd, yyyy")}
                              </p>
                              <p className="text-sm font-semibold mt-2">
                                Total: ₹{Number(booking.total_price).toLocaleString()}
                              </p>
                              {booking.payment_notes && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  Note: {booking.payment_notes}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2">
                              {booking.payment_proof_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(booking.payment_proof_url, "_blank")}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Proof
                                </Button>
                              )}
                              <Button
                                size="sm"
                                onClick={() => handleVerifyPayment(booking.id, true)}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleVerifyPayment(booking.id, false)}
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
                      <p className="text-center text-muted-foreground py-8">
                        No pending payment verifications
                      </p>
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
                                Owner: {product.profiles?.name}
                              </p>
                              <p className="text-sm">Category: {product.category}</p>
                              <p className="text-sm">
                                Price: ₹{product.rental_price_per_day}/day
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
      </div>
      </div>
    </div>
  );
}