import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Tag, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    category: string;
    condition: string;
    listing_type: string;
    rental_price_per_day?: number;
    sale_price?: number;
    ai_cover_image?: string;
    real_images?: string[];
    city?: string;
    area?: string;
  };
  onClick?: () => void;
}

const ProductCard = ({ product, onClick }: ProductCardProps) => {
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);

  useEffect(() => {
    fetchRating();
  }, [product.id]);

  const fetchRating = async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("product_rating")
      .eq("product_id", product.id);

    if (data && data.length > 0) {
      const avg = data.reduce((sum, r) => sum + r.product_rating, 0) / data.length;
      setAverageRating(avg);
      setReviewCount(data.length);
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case "new":
        return "bg-green-100 text-green-800 border-green-200";
      case "like_new":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="aspect-[3/4] overflow-hidden bg-muted relative">
        {product.ai_cover_image ? (
          <>
            <img
              src={product.ai_cover_image}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-2 right-2">
              <Badge variant="secondary" className="text-xs bg-background/80 backdrop-blur-sm">
                AI Generated
              </Badge>
            </div>
          </>
        ) : product.real_images && product.real_images.length > 0 ? (
          <img
            src={product.real_images[0]}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
            <Tag className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
      </div>
      
      <CardContent className="p-4">
        <div className="flex gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {getCategoryLabel(product.category)}
          </Badge>
          <Badge variant="outline" className={`text-xs ${getConditionColor(product.condition)}`}>
            {product.condition.replace("_", " ")}
          </Badge>
        </div>
        
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
          {product.title}
        </h3>
        
        {(product.city || product.area) && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
            <MapPin className="h-3 w-3" />
            <span>{product.area ? `${product.area}, ` : ""}{product.city}</span>
          </div>
        )}

        {averageRating !== null && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{averageRating.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviewCount})</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <div>
          {product.listing_type === "rent" || product.listing_type === "both" ? (
            <div>
              <p className="text-sm text-muted-foreground">Rent</p>
              <p className="text-lg font-bold text-primary">
                PKR {product.rental_price_per_day?.toLocaleString()}/day
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">Sale</p>
              <p className="text-lg font-bold text-primary">
                PKR {product.sale_price?.toLocaleString()}
              </p>
            </div>
          )}
        </div>
        
        {product.listing_type === "both" && (
          <Badge variant="secondary" className="text-xs">
            Also for {product.listing_type === "both" && product.rental_price_per_day ? "Sale" : "Rent"}
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
};

export default ProductCard;
