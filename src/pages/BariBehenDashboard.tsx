import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import { Pencil, Trash2, Plus, Package, Wallet, Users, Copy, Share2, ShoppingBag, Clock, CheckCircle, Loader2, ArrowRight, Search, UserCheck, Gift } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEarnings } from "@/hooks/useEarnings";
import { useReferralStats } from "@/hooks/useReferralStats";
import { useEarningsPromoSettings } from "@/hooks/useEarningsPromoSettings";
import EarningsPromoPopup from "@/components/EarningsPromoPopup";
import PaymentInfoCard from "@/components/PaymentInfoCard";
import OrderStageView from "@/components/OrderStageView";

export default function BariBehenDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const { earnings, generateReferralCode, loading: earningsLoading } = useEarnings();
  const { stats: referralStats, loading: referralStatsLoading } = useReferralStats();
  const { data: promoSettings } = useEarningsPromoSettings();
  const referralBonusAmount = promoSettings?.referralBonusAmount ?? 150;

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    
    const userRole = user.user_metadata?.role || "choti";
    if (userRole !== "bari") {
      toast({
        title: "Access Denied",
        description: "Only Bari Behens can access this dashboard",
        variant: "destructive",
      });
      navigate("/browse");
      return;
    }
    
    setUser(user);
    setUserName(user.user_metadata?.name || "User");
    fetchProducts(user.id);
    fetchOrders(user.id);
  };

  const fetchOrders = async (userId: string) => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          products:product_id (
            id,
            title,
            ai_cover_image,
            real_images,
            listing_type,
            product_type,
            rental_price_4days,
            rental_price_per_day,
            sale_price,
            security_deposit
          )
        `)
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch renter names from profiles separately
      const ordersWithNames = await Promise.all((data || []).map(async (order) => {
        const { data: renterProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", order.renter_id)
          .maybeSingle();
        
        return {
          ...order,
          renter: { name: renterProfile?.name || "Unknown User" }
        };
      }));
      
      setOrders(ordersWithNames);
    } catch (error: any) {
      console.error("Error loading orders:", error);
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleGenerateReferralCode = async () => {
    if (earnings?.referral_code) {
      copyReferralCode();
      return;
    }
    await generateReferralCode(userName);
  };

  const copyReferralCode = () => {
    if (earnings?.referral_code) {
      navigator.clipboard.writeText(earnings.referral_code);
      toast({
        title: "Copied!",
        description: "Referral code copied to clipboard",
      });
    }
  };

  const shareReferralCode = () => {
    const shareUrl = `${window.location.origin}/auth?role=bari&ref=${earnings?.referral_code}`;
    const shareText = `Join Behen.pk using my referral code: ${earnings?.referral_code} and get PKR ${referralBonusAmount} bonus! Sign up here: ${shareUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: "Join Behen.pk",
        text: shareText,
      });
    } else {
      navigator.clipboard.writeText(shareText);
      toast({
        title: "Copied!",
        description: "Share link copied to clipboard",
      });
    }
  };

  const fetchProducts = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("owner_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDialog.productId) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", deleteDialog.productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      fetchProducts(user.id);
      setDeleteDialog({ open: false, productId: null });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (productId: string) => {
    navigate(`/list-dress?edit=${productId}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

  const getInventoryColor = (status: string) => {
    switch (status) {
      case "available":
        return "default";
      case "rented":
        return "secondary";
      case "unavailable":
        return "destructive";
      default:
        return "outline";
    }
  };

  const handleInventoryStatusChange = async (productId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ inventory_status: newStatus })
        .eq("id", productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Inventory status updated to ${newStatus}`,
      });

      fetchProducts(user.id);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update inventory status",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <EarningsPromoPopup userRole="bari" />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold">My Products</h1>
              <p className="text-muted-foreground mt-2">Manage your listings</p>
            </div>
            <Button onClick={() => navigate("/list-dress")}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Product
            </Button>
          </div>

          {/* Earnings & Ambassador Section */}
          <div className="grid md:grid-cols-2 gap-4 mb-8">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wallet className="h-5 w-5 text-primary" />
                  My Earnings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold text-primary">
                      PKR {earnings?.balance?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending Balance</p>
                    <p className="text-2xl font-bold text-muted-foreground">
                      PKR {earnings?.pending_balance?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available after first order
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-100 to-pink-50 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-purple-600" />
                  Brand Ambassador
                </CardTitle>
              </CardHeader>
              <CardContent>
                {earnings?.referral_code ? (
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Your Referral Code</p>
                      <div className="flex items-center gap-2">
                        <code className="bg-white px-3 py-2 rounded font-mono text-lg font-bold text-purple-600 flex-1">
                          {earnings.referral_code}
                        </code>
                        <Button size="icon" variant="outline" onClick={copyReferralCode}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" onClick={shareReferralCode}>
                          <Share2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Referral Stats */}
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-purple-200">
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-600 mb-1">
                          <UserCheck className="h-4 w-4" />
                          <span className="text-xs font-medium">Users Joined</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-700">
                          {referralStatsLoading ? "..." : referralStats.referredCount}
                        </p>
                      </div>
                      <div className="bg-white/50 rounded-lg p-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                          <Gift className="h-4 w-4" />
                          <span className="text-xs font-medium">Earned</span>
                        </div>
                        <p className="text-2xl font-bold text-green-700">
                          PKR {referralStatsLoading ? "..." : referralStats.totalEarned.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-xs text-muted-foreground">
                      Share this code! Both you and your friend get PKR {referralBonusAmount} when they sign up.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Generate your referral code and earn PKR {referralBonusAmount} for every friend who joins!
                    </p>
                    <Button 
                      onClick={handleGenerateReferralCode}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                      disabled={earningsLoading}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Become Brand Ambassador
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* My Orders Section */}
          <Card className="mb-8">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5" />
                  My Orders (Incoming)
                </CardTitle>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by product or renter..."
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-input bg-background"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {ordersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (() => {
                const filteredOrders = orders.filter(order => {
                  if (!orderSearchQuery.trim()) return true;
                  const query = orderSearchQuery.toLowerCase();
                  const productTitle = order.products?.title?.toLowerCase() || "";
                  const renterName = order.renter?.name?.toLowerCase() || "";
                  return productTitle.includes(query) || renterName.includes(query);
                });
                return filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{orderSearchQuery ? "No orders match your search." : "No orders yet. Orders will appear here when customers book your products."}</p>
                </div>
              ) : (
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="w-full grid grid-cols-3 mb-4">
                    <TabsTrigger value="active" className="text-xs sm:text-sm">
                      Active ({filteredOrders.filter(o => 
                        o.booking_status === "confirmed" || 
                        o.booking_status === "active" ||
                        o.booking_status === "payment_verified"
                      ).length})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs sm:text-sm">
                      Pending ({filteredOrders.filter(o => 
                        o.booking_status === "pending_payment" || 
                        o.booking_status === "payment_submitted"
                      ).length})
                    </TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs sm:text-sm">
                      Completed ({filteredOrders.filter(o => 
                        o.booking_status === "completed" || 
                        o.booking_status === "cancelled"
                      ).length})
                    </TabsTrigger>
                  </TabsList>

                  {["active", "pending", "completed"].map((tabValue) => (
                    <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                      {filteredOrders
                        .filter(order => {
                          if (tabValue === "active") {
                            return order.booking_status === "confirmed" || 
                                   order.booking_status === "active" ||
                                   order.booking_status === "payment_verified";
                          } else if (tabValue === "pending") {
                            return order.booking_status === "pending_payment" || 
                                   order.booking_status === "payment_submitted";
                          } else {
                            return order.booking_status === "completed" || 
                                   order.booking_status === "cancelled";
                          }
                        })
                        .map((order) => {
                          const product = order.products;
                          const renter = order.renter;
                          const productImage = product?.ai_cover_image || product?.real_images?.[0];
                          const isSale = product?.listing_type === "sale";
                          const isRental = !isSale;
                          const daysRemaining = order.return_deadline 
                            ? differenceInDays(new Date(order.return_deadline), new Date())
                            : null;

                          return (
                            <Card key={order.id} className="overflow-hidden">
                              <CardContent className="p-4">
                                <div className="flex gap-4">
                                  {productImage && (
                                    <img
                                      src={productImage}
                                      alt={product?.title}
                                      className="w-20 h-20 object-cover rounded flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <h4 className="font-semibold truncate">{product?.title}</h4>
                                        <p className="text-sm text-muted-foreground">
                                          Renter: {renter?.name || "Unknown"}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          {format(new Date(order.start_date), "MMM dd")} - {format(new Date(order.end_date), "MMM dd, yyyy")}
                                        </p>
                                      </div>
                                      <div className="flex flex-col items-end gap-1">
                                        <Badge variant={
                                          order.booking_status === "completed" ? "default" :
                                          order.booking_status === "cancelled" ? "destructive" :
                                          order.booking_status === "active" ? "default" :
                                          "secondary"
                                        }>
                                          {order.booking_status.replace(/_/g, " ")}
                                        </Badge>
                                        {order.order_stage && order.booking_status !== "cancelled" && (
                                          <Badge variant="outline" className="text-xs">
                                            {order.order_stage.replace(/_/g, " ")}
                                          </Badge>
                                        )}
                                      </div>
                                    </div>

                                    {/* Return deadline warning for rentals */}
                                    {isRental && order.order_stage === "in_rental_period" && daysRemaining !== null && (
                                      <div className={`mt-2 flex items-center gap-1 text-xs ${
                                        daysRemaining < 0 ? "text-destructive" : 
                                        daysRemaining <= 1 ? "text-amber-600" : "text-muted-foreground"
                                      }`}>
                                        <Clock className="h-3 w-3" />
                                        {daysRemaining < 0 
                                          ? `${Math.abs(daysRemaining)} day(s) overdue`
                                          : `${daysRemaining} day(s) until return`
                                        }
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Payment Info Card */}
                                <div className="mt-4">
                                  <PaymentInfoCard 
                                    booking={{
                                      ...order,
                                      products: product
                                    }}
                                    isOwner={true}
                                    isRenter={false}
                                  />
                                </div>

                                {/* Manage Order Button */}
                                {order.booking_status !== "cancelled" && order.booking_status !== "completed" && (
                                  <Button 
                                    variant="outline" 
                                    className="w-full mt-4"
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    Manage Order
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </Button>
                                )}

                                {order.booking_status === "completed" && (
                                  <div className="mt-4 flex items-center justify-center gap-2 text-sm text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    Order Completed
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      {filteredOrders.filter(order => {
                        if (tabValue === "active") {
                          return order.booking_status === "confirmed" || 
                                 order.booking_status === "active" ||
                                 order.booking_status === "payment_verified";
                        } else if (tabValue === "pending") {
                          return order.booking_status === "pending_payment" || 
                                 order.booking_status === "payment_submitted";
                        } else {
                          return order.booking_status === "completed" || 
                                 order.booking_status === "cancelled";
                        }
                      }).length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No {tabValue} orders</p>
                        </div>
                      )}
                    </TabsContent>
                  ))}
                </Tabs>
              );
              })()}
            </CardContent>
          </Card>

          {/* Products Section Header */}
          <h2 className="text-2xl font-bold mb-4">My Products</h2>

          {products.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground mb-4">You haven't listed any products yet</p>
                <Button onClick={() => navigate("/list-dress")}>
                  <Plus className="mr-2 h-4 w-4" />
                  List Your First Product
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {products.map((product) => (
                <Card key={product.id}>
                  <CardContent className="pt-6">
                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-start gap-4">
                      {product.ai_cover_image && (
                        <img
                          src={product.ai_cover_image}
                          alt={product.title}
                          className="w-24 h-24 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">{product.title}</h3>
                            <p className="text-sm text-muted-foreground">
                              {product.category} • {product.condition}
                            </p>
                            <p className="text-sm">
                              Listed on {format(new Date(product.created_at), "MMM dd, yyyy")}
                            </p>
                            {product.listing_type === "rent" || product.listing_type === "both" ? (
                              <p className="text-sm font-semibold mt-2">
                                PKR {product.rental_price_4days?.toLocaleString() || 
                                     (product.rental_price_per_day * 4)?.toLocaleString()} / 4 days
                              </p>
                            ) : (
                              <p className="text-sm font-semibold mt-2">
                                PKR {product.sale_price?.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStatusColor(product.status)}>
                              {product.status}
                            </Badge>
                            <Badge variant={getInventoryColor(product.inventory_status || 'available')}>
                              <Package className="mr-1 h-3 w-3" />
                              {product.inventory_status || 'available'}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4 items-center">
                          <Select
                            value={product.inventory_status || "available"}
                            onValueChange={(value) => handleInventoryStatusChange(product.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Inventory Status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="rented">Rented</SelectItem>
                              <SelectItem value="unavailable">Unavailable</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(product.id)}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setDeleteDialog({ open: true, productId: product.id })}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/product/${product.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex gap-3 mb-3">
                        {product.ai_cover_image && (
                          <img
                            src={product.ai_cover_image}
                            alt={product.title}
                            className="w-20 h-20 object-cover rounded flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate">{product.title}</h3>
                          <p className="text-xs text-muted-foreground">
                            {product.category} • {product.condition}
                          </p>
                          {product.listing_type === "rent" || product.listing_type === "both" ? (
                            <p className="text-sm font-semibold mt-1">
                              PKR {product.rental_price_4days?.toLocaleString() || 
                                   (product.rental_price_per_day * 4)?.toLocaleString()} / 4 days
                            </p>
                          ) : (
                            <p className="text-sm font-semibold mt-1">
                              PKR {product.sale_price?.toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 mb-3">
                        <Badge variant={getStatusColor(product.status)} className="text-xs">
                          {product.status}
                        </Badge>
                        <Badge variant={getInventoryColor(product.inventory_status || 'available')} className="text-xs">
                          <Package className="mr-1 h-3 w-3" />
                          {product.inventory_status || 'available'}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={product.inventory_status || "available"}
                          onValueChange={(value) => handleInventoryStatusChange(product.id, value)}
                        >
                          <SelectTrigger className="w-full text-xs h-9">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="available">Available</SelectItem>
                            <SelectItem value="rented">Rented</SelectItem>
                            <SelectItem value="unavailable">Unavailable</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs h-9"
                          onClick={() => handleEdit(product.id)}
                        >
                          <Pencil className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full text-xs h-9"
                          onClick={() => setDeleteDialog({ open: true, productId: product.id })}
                        >
                          <Trash2 className="mr-1 h-3 w-3" />
                          Delete
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full text-xs h-9"
                          onClick={() => navigate(`/product/${product.id}`)}
                        >
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Product Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, productId: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, productId: null })}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Management Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Order</DialogTitle>
            <DialogDescription>
              {selectedOrder?.products?.title} - Renter: {selectedOrder?.renter?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedOrder && user && (
            <OrderStageView 
              booking={selectedOrder}
              userId={user.id}
              onRefresh={() => {
                fetchOrders(user.id);
                setSelectedOrder(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
