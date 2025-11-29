import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Star } from "lucide-react";

interface ReviewFormProps {
  booking: any;
  onReviewSubmitted?: () => void;
}

export default function ReviewForm({ booking, onReviewSubmitted }: ReviewFormProps) {
  const { toast } = useToast();
  const [productRating, setProductRating] = useState(0);
  const [ownerRating, setOwnerRating] = useState(0);
  const [productReview, setProductReview] = useState("");
  const [ownerReview, setOwnerReview] = useState("");
  const [loading, setLoading] = useState(false);
  const [hoveredProductStar, setHoveredProductStar] = useState(0);
  const [hoveredOwnerStar, setHoveredOwnerStar] = useState(0);

  const handleSubmit = async () => {
    if (productRating === 0 || ownerRating === 0) {
      toast({
        title: "Error",
        description: "Please provide ratings for both product and seller",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.from("reviews").insert({
        booking_id: booking.id,
        product_id: booking.product_id,
        reviewer_id: booking.renter_id,
        owner_id: booking.owner_id,
        product_rating: productRating,
        owner_rating: ownerRating,
        product_review: productReview.trim() || null,
        owner_review: ownerReview.trim() || null,
      });

      if (error) throw error;

      toast({
        title: "Review Submitted!",
        description: "Thank you for your feedback",
      });

      if (onReviewSubmitted) onReviewSubmitted();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const StarRating = ({
    rating,
    setRating,
    hovered,
    setHovered,
    label,
  }: {
    rating: number;
    setRating: (n: number) => void;
    hovered: number;
    setHovered: (n: number) => void;
    label: string;
  }) => (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-1 mt-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hovered || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leave a Review</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <StarRating
            rating={productRating}
            setRating={setProductRating}
            hovered={hoveredProductStar}
            setHovered={setHoveredProductStar}
            label="Rate the Product"
          />

          <div>
            <Label htmlFor="product-review">Product Review (Optional)</Label>
            <Textarea
              id="product-review"
              value={productReview}
              onChange={(e) => setProductReview(e.target.value)}
              placeholder="Share your experience with this product..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <div className="space-y-4">
          <StarRating
            rating={ownerRating}
            setRating={setOwnerRating}
            hovered={hoveredOwnerStar}
            setHovered={setHoveredOwnerStar}
            label="Rate the Seller"
          />

          <div>
            <Label htmlFor="owner-review">Seller Review (Optional)</Label>
            <Textarea
              id="owner-review"
              value={ownerReview}
              onChange={(e) => setOwnerReview(e.target.value)}
              placeholder="How was your experience with the seller..."
              className="mt-2"
              rows={3}
            />
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Submitting..." : "Submit Review"}
        </Button>
      </CardContent>
    </Card>
  );
}