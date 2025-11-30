import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { EnhancedHeader } from "@/components/EnhancedHeader";

interface WishlistProduct {
  id: string;
  wishlist_id: string;
  title: string;
  ai_cover_image: string;
  rental_price_per_day: number;
  rental_price_4days: number;
  category: string;
  city: string;
}

export default function Wishlist() {
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndFetchWishlist();
  }, []);

  const checkAuthAndFetchWishlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Please sign in to view your wishlist");
      navigate("/auth");
      return;
    }

    await fetchWishlist(user.id);
  };

  const fetchWishlist = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select(`
          id,
          product_id,
          products (
            id,
            title,
            ai_cover_image,
            rental_price_per_day,
            rental_price_4days,
            category,
            city
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      const formattedProducts = data?.map((item: any) => ({
        id: item.products.id,
        wishlist_id: item.id,
        title: item.products.title,
        ai_cover_image: item.products.ai_cover_image,
        rental_price_per_day: item.products.rental_price_per_day,
        rental_price_4days: item.products.rental_price_4days,
        category: item.products.category,
        city: item.products.city,
      })) || [];

      setProducts(formattedProducts);
    } catch (error: any) {
      console.error("Error fetching wishlist:", error);
      toast.error("Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (wishlistId: string) => {
    try {
      const { error } = await supabase
        .from("wishlists")
        .delete()
        .eq("id", wishlistId);

      if (error) throw error;

      setProducts(products.filter(p => p.wishlist_id !== wishlistId));
      toast.success("Removed from wishlist");
    } catch (error: any) {
      console.error("Error removing from wishlist:", error);
      toast.error("Failed to remove from wishlist");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Wishlist</h1>

        {products.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-xl text-muted-foreground mb-4">Your wishlist is empty</p>
            <Button onClick={() => navigate("/browse")}>Browse Products</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="overflow-hidden group">
                <div 
                  className="relative aspect-[3/4] overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/product/${product.id}`)}
                >
                  <img
                    src={product.ai_cover_image || "/placeholder.svg"}
                    alt={product.title}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                
                <div className="p-4">
                  <h3 className="font-semibold text-lg mb-2 line-clamp-2">{product.title}</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {product.category} • {product.city}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">From</p>
                      <p className="font-bold text-lg">Rs. {product.rental_price_4days?.toLocaleString()}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/product/${product.id}`)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeFromWishlist(product.wishlist_id)}
                    >
                      <Heart className="w-4 h-4 fill-current text-primary" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
