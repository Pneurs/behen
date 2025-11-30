import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import { Pencil, Trash2, Plus } from "lucide-react";
import { format } from "date-fns";

export default function BariBehenDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; productId: string | null }>({
    open: false,
    productId: null,
  });

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
    fetchProducts(user.id);
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
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
                    <div className="flex items-start gap-4">
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
                          </div>
                        </div>

                        <div className="flex gap-2 mt-4">
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
