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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Package, Calendar, TrendingUp, Check, X, Eye, CreditCard, Loader2, Shield, LogOut, UserCog } from "lucide-react";
import { format } from "date-fns";
import { sendEmailNotification } from "@/lib/emailNotifications";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<string>("");
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
      navigate("/admin");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["super_admin", "admin", "manager"]);

    if (!roles || roles.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }

    setCurrentUser(user);
    setCurrentRole(roles[0].role);
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
      
      // Get renter email from auth
      const { data: renterAuth } = await supabase.auth.admin?.getUserById(booking.renter_id) || { data: null };
      
      return {
        ...booking,
        owner_name: ownerProfile.data?.name || "Bari Behen",
        owner_phone: ownerProfile.data?.phone || null,
        renter_name: renterProfile.data?.name || "Choti Behen",
        renter_phone: renterProfile.data?.phone || null,
        renter_email: renterAuth?.user?.email || null,
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

    // Fetch users with their roles
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Fetch roles for each user
    const usersWithRoles = await Promise.all((allUsers || []).map(async (user) => {
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.user_id);
      
      return {
        ...user,
        roles: userRoles?.map(r => r.role) || [],
      };
    }));

    setUsers(usersWithRoles);

    setLoading(false);
  };

  const handleVerifyPayment = async (booking: any, approved: boolean) => {
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
      .eq("id", booking.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update booking",
        variant: "destructive",
      });
      return;
    }

    // Send email notification
    if (booking.renter_email) {
      await sendEmailNotification({
        type: "payment_verification",
        recipientEmail: booking.renter_email,
        recipientName: booking.renter_name,
        data: {
          productTitle: booking.products?.title,
          verified: approved,
        },
      });
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

  const handleAssignRole = async (userId: string, role: string) => {
    if (currentRole !== "super_admin") {
      toast({
        title: "Access Denied",
        description: "Only super admins can assign roles",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: role as any });

    if (error) {
      if (error.code === "23505") {
        toast({
          title: "Role Exists",
          description: "User already has this role",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to assign role",
          variant: "destructive",
        });
      }
      return;
    }

    toast({
      title: "Role Assigned",
      description: `Successfully assigned ${role} role`,
    });

    fetchData();
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    if (currentRole !== "super_admin") {
      toast({
        title: "Access Denied",
        description: "Only super admins can remove roles",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role as "super_admin" | "admin" | "manager" | "bari_behen" | "choti_behen");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to remove role",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Role Removed",
      description: `Successfully removed ${role} role`,
    });

    fetchData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Admin Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-white">Behen.pk Admin</h1>
              <p className="text-xs text-slate-400">Role: {currentRole.replace("_", " ").toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary text-primary">
              {currentUser?.email}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Total Users</CardTitle>
                <Users className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.users}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Total Products</CardTitle>
                <Package className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.products}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.bookings}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-300">Total Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">PKR {stats.revenue.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Management Tabs */}
          <Tabs defaultValue="bookings" className="space-y-4">
            <TabsList className="bg-slate-800 border-slate-700">
              <TabsTrigger value="bookings" className="data-[state=active]:bg-primary">
                Pending Payments ({pendingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-primary">
                Pending Products ({pendingProducts.length})
              </TabsTrigger>
              <TabsTrigger value="users" className="data-[state=active]:bg-primary">
                Users ({users.length})
              </TabsTrigger>
              {currentRole === "super_admin" && (
                <TabsTrigger value="roles" className="data-[state=active]:bg-primary">
                  <UserCog className="h-4 w-4 mr-2" />
                  Role Management
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="bookings">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <CreditCard className="h-5 w-5" />
                    Pending Payment Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {pendingBookings.map((booking) => (
                        <Card key={booking.id} className="border-amber-500/30 bg-slate-700/50">
                          <CardContent className="pt-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                              {booking.products?.ai_cover_image && (
                                <img
                                  src={booking.products.ai_cover_image}
                                  alt={booking.products.title}
                                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold text-lg text-white">{booking.products?.title}</h3>
                                    <Badge variant="outline" className="mt-1 border-slate-600 text-slate-300">
                                      Order #{booking.id.slice(0, 8)}
                                    </Badge>
                                  </div>
                                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Payment Submitted</Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-slate-400">Bari Behen (Owner)</p>
                                    <p className="font-medium text-white">{booking.owner_name}</p>
                                    {booking.owner_phone && (
                                      <p className="text-xs text-slate-500">{booking.owner_phone}</p>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-slate-400">Choti Behen (Renter)</p>
                                    <p className="font-medium text-white">{booking.renter_name}</p>
                                    {booking.renter_phone && (
                                      <p className="text-xs text-slate-500">{booking.renter_phone}</p>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                                  <div>
                                    <span className="text-slate-500">Dates: </span>
                                    {format(new Date(booking.start_date), "MMM dd")} - {format(new Date(booking.end_date), "MMM dd, yyyy")}
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Rent: </span>
                                    <span className="font-semibold">PKR {Number(booking.total_price).toLocaleString()}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Security: </span>
                                    <span className="font-semibold">PKR {Number(booking.security_deposit).toLocaleString()}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Total: </span>
                                    <span className="font-bold text-primary">
                                      PKR {(Number(booking.total_price) + Number(booking.security_deposit)).toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                                
                                {booking.payment_notes && (
                                  <p className="text-sm bg-slate-600/50 p-2 rounded text-slate-300">
                                    <span className="font-medium">Note: </span>{booking.payment_notes}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex flex-col gap-2 lg:w-32">
                                {booking.payment_proof_url && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setSelectedProof(booking.payment_proof_url)}
                                    className="w-full border-slate-600 text-slate-300"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Proof
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  onClick={() => handleVerifyPayment(booking, true)}
                                  className="w-full"
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleVerifyPayment(booking, false)}
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
                        <div className="text-center py-12 text-slate-500">
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
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Pending Product Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {pendingProducts.map((product) => (
                        <Card key={product.id} className="bg-slate-700/50 border-slate-600">
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
                                <h3 className="font-semibold text-white">{product.title}</h3>
                                <p className="text-sm text-slate-400">
                                  Owner: {product.owner_name}
                                </p>
                                <p className="text-sm text-slate-300">Category: {product.category}</p>
                                <p className="text-sm text-slate-300">
                                  Price: PKR {product.rental_price_4days}/4 days
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
                        <div className="text-center py-12 text-slate-500">
                          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No pending product approvals</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">All Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {users.map((user) => (
                        <Card key={user.id} className="bg-slate-700/50 border-slate-600">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-white">{user.name}</p>
                                <p className="text-sm text-slate-400">{user.phone || "No phone"}</p>
                                <p className="text-xs text-slate-500">
                                  Joined: {format(new Date(user.created_at), "MMM dd, yyyy")}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-slate-600 text-slate-300">
                                  {user.role}
                                </Badge>
                                {user.roles?.map((role: string) => (
                                  <Badge key={role} className="bg-primary/20 text-primary border-primary/30">
                                    {role.replace("_", " ")}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {currentRole === "super_admin" && (
              <TabsContent value="roles">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <UserCog className="h-5 w-5" />
                      Role Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {users.map((user) => (
                          <Card key={user.id} className="bg-slate-700/50 border-slate-600">
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-white">{user.name}</p>
                                  <p className="text-sm text-slate-400">{user.user_id.slice(0, 8)}...</p>
                                  <div className="flex gap-1 mt-2">
                                    {user.roles?.map((role: string) => (
                                      <Badge 
                                        key={role} 
                                        className="bg-primary/20 text-primary border-primary/30 cursor-pointer hover:bg-red-500/20 hover:text-red-400"
                                        onClick={() => handleRemoveRole(user.user_id, role)}
                                      >
                                        {role.replace("_", " ")} ×
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                <Select onValueChange={(value: "super_admin" | "admin" | "manager") => handleAssignRole(user.user_id, value)}>
                                  <SelectTrigger className="w-40 bg-slate-600 border-slate-500 text-white">
                                    <SelectValue placeholder="Add Role" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-700 border-slate-600">
                                    <SelectItem value="super_admin" className="text-white">Super Admin</SelectItem>
                                    <SelectItem value="admin" className="text-white">Admin</SelectItem>
                                    <SelectItem value="manager" className="text-white">Manager</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Payment Proof Modal */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Payment Proof</DialogTitle>
          </DialogHeader>
          {selectedProof && (
            <img
              src={selectedProof}
              alt="Payment Proof"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}