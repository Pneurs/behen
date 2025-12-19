import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface RatingData {
  productId: string;
  averageRating: number | null;
  reviewCount: number;
}

// Batch fetch ratings for multiple products
export const useProductRatings = (productIds: string[]) => {
  return useQuery({
    queryKey: ["ratings", productIds.sort().join(",")],
    queryFn: async () => {
      if (productIds.length === 0) return {};

      const { data, error } = await supabase
        .from("reviews")
        .select("product_id, product_rating")
        .in("product_id", productIds);

      if (error) throw error;

      // Group ratings by product_id
      const ratingsMap: Record<string, RatingData> = {};
      
      // Initialize all products with null ratings
      productIds.forEach(id => {
        ratingsMap[id] = {
          productId: id,
          averageRating: null,
          reviewCount: 0,
        };
      });

      // Calculate averages
      const productReviews: Record<string, number[]> = {};
      data?.forEach(review => {
        if (!productReviews[review.product_id]) {
          productReviews[review.product_id] = [];
        }
        productReviews[review.product_id].push(review.product_rating);
      });

      Object.entries(productReviews).forEach(([productId, ratings]) => {
        const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
        ratingsMap[productId] = {
          productId,
          averageRating: avg,
          reviewCount: ratings.length,
        };
      });

      return ratingsMap;
    },
    enabled: productIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - ratings don't change often
  });
};

// Single product rating
export const useSingleProductRating = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["rating", productId],
    queryFn: async () => {
      if (!productId) return { averageRating: null, reviewCount: 0 };

      const { data, error } = await supabase
        .from("reviews")
        .select("product_rating")
        .eq("product_id", productId);

      if (error) throw error;

      if (!data || data.length === 0) {
        return { averageRating: null, reviewCount: 0 };
      }

      const avg = data.reduce((sum, r) => sum + r.product_rating, 0) / data.length;
      return {
        averageRating: avg,
        reviewCount: data.length,
      };
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000,
  });
};
