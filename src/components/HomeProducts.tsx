import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Product {
  id: string;
  title: string;
  category: string;
  condition: string;
  rental_price_per_day: number;
  rental_price_4days: number;
  sale_price: number;
  listing_type: string;
  ai_cover_image: string;
  city: string;
  area: string;
  original_price?: number;
}

export const HomeProducts = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .limit(8)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex gap-6 overflow-hidden">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-3 min-w-[280px]">
            <Skeleton className="h-[300px] w-full rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <Carousel
      opts={{
        align: "start",
        loop: false,
      }}
      className="w-full"
    >
      <CarouselContent className="-ml-4">
        {products.map((product) => (
          <CarouselItem key={product.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
            <ProductCard 
              product={product} 
              onClick={() => navigate(`/product/${product.id}`)}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious className="hidden md:flex" />
      <CarouselNext className="hidden md:flex" />
    </Carousel>
  );
};
