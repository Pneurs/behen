import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Product {
  id: string;
  title: string;
  category: string;
  condition: string;
  rental_price_per_day: number | null;
  rental_price_4days: number | null;
  sale_price: number | null;
  listing_type: string;
  ai_cover_image: string | null;
  real_images: string[] | null;
  public_images?: string[] | null;
  city: string;
  area: string;
  original_price: number | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  owner_id: string;
  listing_active?: boolean | null;
  activated_at?: string | null;
  description?: string | null;
  size?: string;
  alteration_possible?: boolean;
  availability_data?: any;
}

interface UseProductsOptions {
  category?: string;
  listingType?: string;
  city?: string;
  status?: string;
  limit?: number;
}

// Only select fields needed for product cards (performance optimization)
const PRODUCT_CARD_FIELDS = `
  id, title, category, condition, 
  rental_price_per_day, rental_price_4days, sale_price, 
  listing_type, ai_cover_image, public_images, 
  city, area, original_price, status, owner_id
`;

// Fetch home page products (latest 8 published)
export const useHomeProducts = () => {
  return useQuery({
    queryKey: ["products", "home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_CARD_FIELDS)
        .eq("status", "published")
        .neq("listing_active", false)
        .limit(8)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Product[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const BROWSE_PAGE_SIZE = 24;

// Fetch browse page products with filters, 24 at a time
export const useBrowseProducts = (options: UseProductsOptions = {}) => {
  const { category, listingType, city, status = "published" } = options;

  return useInfiniteQuery({
    queryKey: ["products", "browse", { category, listingType, city, status }],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const from = (pageParam as number) * BROWSE_PAGE_SIZE;
      let query = supabase
        .from("products")
        .select(PRODUCT_CARD_FIELDS)
        .eq("status", status)
        .neq("listing_active", false)
        .order("created_at", { ascending: false })
        .range(from, from + BROWSE_PAGE_SIZE - 1);

      if (category && category !== "all") {
        query = query.eq("category", category);
      }

      if (listingType && listingType !== "all") {
        if (listingType === "rent" || listingType === "sale") {
          query = query.or(`listing_type.eq.${listingType},listing_type.eq.both`);
        }
      }

      if (city) {
        query = query.eq("city", city);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === BROWSE_PAGE_SIZE ? pages.length : undefined,
    staleTime: 2 * 60 * 1000,
  });
};

// Fetch single product by ID
export const useProduct = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId) throw new Error("Product ID is required");
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .single();

      if (error) throw error;
      return data as Product;
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
};

// Fetch all bookings for availability checking
export const useAllBookings = () => {
  return useQuery({
    queryKey: ["bookings", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("product_id, start_date, end_date, booking_status")
        .in("booking_status", ["confirmed", "payment_submitted", "pending_payment"]);

      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};
