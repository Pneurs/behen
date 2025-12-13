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
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import { Pencil, Trash2, Plus, Package, Wallet, Users, Copy, Share2 } from "lucide-react";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEarnings } from "@/hooks/useEarnings";
import EarningsPromoPopup from "@/components/EarningsPromoPopup";

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
  const { earnings, generateReferralCode, loading: earningsLoading } = useEarnings();

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
    const shareText = `Join Behen.pk using my referral code: ${earnings?.referral_code} and get PKR 150 bonus! Sign up here: ${shareUrl}`;
    
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
                    <p className="text-xs text-muted-foreground">
                      Share this code! Both you and your friend get PKR 150 when they upload their first product.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Generate your referral code and earn PKR 150 for every friend who joins!
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
    </div>
  );
}
