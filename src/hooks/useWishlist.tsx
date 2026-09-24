import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// One shared query for the whole wishlist instead of 2 network calls per card.
export const useWishlist = (productId?: string) => {
  const { user } = useAuth();
  const userId = user?.id || null;
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const key = ["wishlist-ids", userId];

  const { data: ids } = useQuery({
    queryKey: key,
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wishlists")
        .select("product_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.product_id as string));
    },
  });

  const isInWishlist = !!(productId && ids?.has(productId));

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
        toast.success("Removed from wishlist");
      } else {
        const { error } = await supabase
          .from("wishlists")
          .insert({ user_id: userId, product_id: productId });
        if (error) throw error;
        toast.success("Added to wishlist");
      }
      queryClient.setQueryData<Set<string>>(key, (prev) => {
        const next = new Set(prev || []);
        if (isInWishlist) next.delete(productId);
        else next.add(productId);
        return next;
      });
    } catch (error: any) {
      console.error("Error toggling wishlist:", error);
      toast.error("Failed to update wishlist");
    } finally {
      setLoading(false);
    }
  };

  return { isInWishlist, loading, toggleWishlist };
};
