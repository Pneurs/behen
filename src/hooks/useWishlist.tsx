import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useWishlist = (productId?: string) => {
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (userId && productId) {
      checkWishlistStatus();
    }
  }, [userId, productId]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id || null);
  };

  const checkWishlistStatus = async () => {
    if (!userId || !productId) return;

    try {
      const { data, error } = await supabase
        .from("wishlists")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      setIsInWishlist(!!data);
    } catch (error: any) {
      console.error("Error checking wishlist:", error);
    }
  };

  const toggleWishlist = async () => {
    if (!userId) {
      toast.error("Please sign in to add to wishlist");
      return;
    }

    if (!productId) return;

    setLoading(true);

    try {
      if (isInWishlist) {
        const { error } = await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", userId)
          .eq("product_id", productId);

        if (error) throw error;

        setIsInWishlist(false);
        toast.success("Removed from wishlist");
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert({
            user_id: userId,
            product_id: productId,
          });

        if (error) throw error;

        setIsInWishlist(true);
        toast.success("Added to wishlist");
      }
    } catch (error: any) {
      console.error("Error toggling wishlist:", error);
      toast.error("Failed to update wishlist");
    } finally {
      setLoading(false);
    }
  };

  return { isInWishlist, loading, toggleWishlist };
};
