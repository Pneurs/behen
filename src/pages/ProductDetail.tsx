import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar as CalendarIcon, 
  Tag, 
  Ruler, 
  Sparkles,
  Heart,
  Share2,
  MessageCircle,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUser(session.user);
      }
    });
    
    loadProduct();
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    try {
      // Load product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (productError) throw productError;
      setProduct(productData);

      // Load owner profile
      const { data: ownerData, error: ownerError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", productData.owner_id)
        .single();

      if (ownerError) throw ownerError;
      setOwner(ownerData);
    } catch (error: any) {
      toast.error("Failed to load product");
      console.error(error);
      navigate("/browse");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    return category.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getBlackoutDates = () => {
    if (!product?.availability_data?.blackout_dates) return [];
    return product.availability_data.blackout_dates.map((d: string) => new Date(d));
  };

  const handleContactSeller = () => {
    if (!currentUser) {
      toast.error("Please sign in to contact seller");
      navigate("/auth");
      return;
    }
    
    if (currentUser.id === product.owner_id) {
      toast.error("This is your own listing");
      return;
    }

    // TODO: Implement chat system
    toast.success("Chat feature coming soon!");
  };

  const handleBookNow = () => {
    if (!currentUser) {
      toast.error("Please sign in to book");
      navigate("/auth");
      return;
    }
    
    if (currentUser.id === product.owner_id) {
      toast.error("You cannot book your own listing");
      return;
    }

    // TODO: Implement booking system
    toast.success("Booking feature coming soon!");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) return null;

  // Show AI cover first if available, then real images
  const images = product.ai_cover_image 
    ? [product.ai_cover_image, ...(product.real_images || [])]
    : (product.real_images || []);
  const blackoutDates = getBlackoutDates();
  const isOwner = currentUser?.id === product.owner_id;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/browse")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Heart className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Share2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-muted">
              {images.length > 0 ? (
                <img
                  src={images[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <Tag className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
            </div>
            
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((img: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Badges */}
            <div>
              <div className="flex gap-2 mb-3">
                <Badge variant="outline">{getCategoryLabel(product.category)}</Badge>
                <Badge variant="outline">{product.condition.replace("_", " ")}</Badge>
                {product.product_type !== "dress" && (
                  <Badge variant="secondary">{product.product_type}</Badge>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
                {product.title}
              </h1>
              {(product.city || product.area) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{product.area ? `${product.area}, ` : ""}{product.city}</span>
                </div>
              )}
            </div>

            {/* Pricing */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {(product.listing_type === "rent" || product.listing_type === "both") && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Rental Price</p>
                      <p className="text-3xl font-bold text-primary">
                        PKR {product.rental_price_per_day?.toLocaleString()}
                        <span className="text-lg font-normal text-muted-foreground">/day</span>
                      </p>
                      {product.security_deposit && (
                        <p className="text-sm text-muted-foreground mt-1">
                          + PKR {product.security_deposit.toLocaleString()} security deposit
                        </p>
                      )}
                    </div>
                  )}
                  {(product.listing_type === "sale" || product.listing_type === "both") && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Sale Price</p>
                      <p className="text-3xl font-bold text-primary">
                        PKR {product.sale_price?.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
                
                {!isOwner && (
                  <div className="flex gap-3 mt-6">
                    {(product.listing_type === "rent" || product.listing_type === "both") && (
                      <Button 
                        className="flex-1" 
                        size="lg" 
                        onClick={() => navigate(`/booking/${product.id}`)}
                      >
                        <CalendarIcon className="mr-2 h-5 w-5" />
                        Book Now
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="lg" 
                      onClick={() => navigate(`/chat?product=${product.id}`)}
                      className="flex-1"
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Contact
                    </Button>
                  </div>
                )}
                {isOwner && (
                  <div className="mt-6">
                    <Badge variant="secondary" className="w-full justify-center py-2">
                      This is your listing
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Owner Info */}
            {owner && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
                      {owner.name?.[0]?.toUpperCase() || "B"}
                    </div>
                    <div>
                      <p className="font-semibold">{owner.name || "Bari Behen"}</p>
                      <p className="text-sm text-muted-foreground">
                        {owner.role === "bari" ? "Verified Seller" : "Member"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Details Section */}
        <div className="mt-12 grid lg:grid-cols-3 gap-8">
          {/* Description */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
              </CardContent>
            </Card>

            {/* Style Tips */}
            {product.style_tips && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    Style Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-line">{product.style_tips}</p>
                </CardContent>
              </Card>
            )}

            {/* Details */}
            <Card>
              <CardHeader>
                <CardTitle>Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {product.fabric && (
                    <div>
                      <p className="text-sm text-muted-foreground">Fabric</p>
                      <p className="font-medium">{product.fabric}</p>
                    </div>
                  )}
                  {product.color && (
                    <div>
                      <p className="text-sm text-muted-foreground">Color</p>
                      <p className="font-medium">{product.color}</p>
                    </div>
                  )}
                  {product.work_type && (
                    <div>
                      <p className="text-sm text-muted-foreground">Work Type</p>
                      <p className="font-medium">{product.work_type}</p>
                    </div>
                  )}
                  {product.designer && (
                    <div>
                      <p className="text-sm text-muted-foreground">Designer</p>
                      <p className="font-medium">{product.designer}</p>
                    </div>
                  )}
                  {product.times_rented > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground">Times Rented</p>
                      <p className="font-medium">{product.times_rented}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Size & Fit */}
            {(product.product_type === "dress" || product.product_type === "footwear") && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Ruler className="h-5 w-5" />
                    Size & Fit
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-4">
                    {product.size && (
                      <div>
                        <p className="text-sm text-muted-foreground">Size</p>
                        <p className="font-medium">{product.size}</p>
                      </div>
                    )}
                    {product.height_range && (
                      <div>
                        <p className="text-sm text-muted-foreground">Height Range</p>
                        <p className="font-medium">{product.height_range}</p>
                      </div>
                    )}
                    {product.chest_size && (
                      <div>
                        <p className="text-sm text-muted-foreground">Chest</p>
                        <p className="font-medium">{product.chest_size}</p>
                      </div>
                    )}
                    {product.waist_size && (
                      <div>
                        <p className="text-sm text-muted-foreground">Waist</p>
                        <p className="font-medium">{product.waist_size}</p>
                      </div>
                    )}
                    {product.hips_size && (
                      <div>
                        <p className="text-sm text-muted-foreground">Hips</p>
                        <p className="font-medium">{product.hips_size}</p>
                      </div>
                    )}
                  </div>
                  {product.alteration_possible && (
                    <Badge variant="secondary" className="mt-4">
                      Alteration Available
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Availability Calendar */}
          {(product.listing_type === "rent" || product.listing_type === "both") && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Availability</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <Calendar
                      mode="single"
                      selected={undefined}
                      disabled={(date) => {
                        if (date < new Date()) return true;
                        return blackoutDates.some(
                          (blocked) => blocked.toDateString() === date.toDateString()
                        );
                      }}
                      className="pointer-events-auto rounded-md border"
                      modifiers={{
                        blocked: blackoutDates,
                      }}
                      modifiersStyles={{
                        blocked: {
                          backgroundColor: "hsl(var(--destructive))",
                          color: "hsl(var(--destructive-foreground))",
                          textDecoration: "line-through",
                        },
                      }}
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-background border"></div>
                      <span className="text-sm">Available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-destructive"></div>
                      <span className="text-sm">Not Available</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProductDetail;
