import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useHomeProducts } from "@/hooks/useProducts";
import { useProductRatings } from "@/hooks/useProductRatings";

export const HomeProducts = () => {
  const navigate = useNavigate();
  const { data: products, isLoading } = useHomeProducts();
  
  // Get all product IDs for batch rating fetch
  const productIds = useMemo(() => 
    products?.map(p => p.id) || [], 
    [products]
  );
  
  // Batch fetch all ratings in one query
  const { data: ratingsMap } = useProductRatings(productIds);

  if (isLoading) {
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

  if (!products || products.length === 0) {
    return null;
  }

  return (
    <div className="relative px-12">
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {products.map((product, index) => {
            const rating = ratingsMap?.[product.id];
            return (
              <CarouselItem 
                key={product.id} 
                className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4 animate-fade-in opacity-0"
                style={{ 
                  animationDelay: `${Math.min(index * 50, 300)}ms`,
                  animationFillMode: 'forwards'
                }}
              >
                <ProductCard 
                  product={product} 
                  onClick={() => navigate(`/product/${product.id}`)}
                  averageRating={rating?.averageRating}
                  reviewCount={rating?.reviewCount || 0}
                />
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="-left-4 md:-left-6" />
        <CarouselNext className="-right-4 md:-right-6" />
      </Carousel>
    </div>
  );
};

export default HomeProducts;
