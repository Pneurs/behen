import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Star, MessageSquare } from "lucide-react";
import { format } from "date-fns";

interface ReviewsListProps {
  productId: string;
}

export default function ReviewsList({ productId }: ReviewsListProps) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    setLoading(true);

    try {
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(reviewsData || []);

      // Calculate average
      if (reviewsData && reviewsData.length > 0) {
        const avg =
          reviewsData.reduce((sum, r) => sum + r.product_rating, 0) /
          reviewsData.length;
        setAverageRating(avg);
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const StarDisplay = ({ rating }: { rating: number }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  if (loading) return <div>Loading reviews...</div>;

  if (reviews.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No reviews yet. Be the first to review this product!
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
          <div>
            <StarDisplay rating={Math.round(averageRating)} />
            <p className="text-sm text-muted-foreground">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
            </p>
          </div>
        </div>
      </div>

      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Avatar>
                <AvatarFallback>
                  C
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Choti Behen</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(review.created_at), "MMM dd, yyyy")}
                    </p>
                  </div>
                  <StarDisplay rating={review.product_rating} />
                </div>

                {review.product_review && (
                  <p className="text-sm text-muted-foreground">
                    {review.product_review}
                  </p>
                )}

                {/* Owner Response */}
                {review.owner_response && (
                  <div className="mt-4 ml-4 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      <p className="font-semibold text-sm">Bari Behen's Response</p>
                      {review.owner_response_at && (
                        <p className="text-xs text-muted-foreground">
                          • {format(new Date(review.owner_response_at), "MMM dd, yyyy")}
                        </p>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {review.owner_response}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}