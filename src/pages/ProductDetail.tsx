import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ReviewsList from "@/components/ReviewsList";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import ProductAvailabilityCalendarFlatpickr from "@/components/ProductAvailabilityCalendarFlatpickr";
import RealImagesViewer from "@/components/RealImagesViewer";
import { 
  MapPin, 
  Calendar as CalendarIcon, 
  Tag, 
  Ruler, 
  Sparkles,
  MessageCircle,
  Loader2,
  Eye,
  Check,
  X,
  Shirt,
  Gem,
  Droplets,
  Share2
} from "lucide-react";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showRealImages, setShowRealImages] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);

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

      // Load bookings for this product
      const { data: bookingsData, error: bookingsError } = await supabase
        .from("bookings")
        .select("start_date, end_date, booking_status")
        .eq("product_id", id)
        .in("booking_status", ["confirmed", "payment_submitted", "pending_payment"]);

      if (!bookingsError && bookingsData) {
        setBookings(bookingsData);
      }
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
    const dates: Date[] = [];
    
    // Add blackout dates from product
    if (product?.availability_data?.blackout_dates) {
      dates.push(...product.availability_data.blackout_dates.map((d: string) => new Date(d)));
    }
    
    // Add booked dates
    bookings.forEach(booking => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      
      // Add all dates in the booking range
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    });
    
    return dates;
  };

  const getNextAvailableDate = () => {
    if (bookings.length === 0) return null;
    
    // Find the latest booking end date
    const latestBooking = bookings.reduce((latest, booking) => {
      const endDate = new Date(booking.end_date);
      return endDate > latest ? endDate : latest;
    }, new Date(bookings[0].end_date));
    
    // Next available is the day after
    const nextAvailable = new Date(latestBooking);
    nextAvailable.setDate(nextAvailable.getDate() + 1);
    
    return nextAvailable;
  };

  const handleContactSeller = () => {
    if (!currentUser) {
      // Store redirect info for after login
      localStorage.setItem("auth_redirect", "/chat");
      localStorage.setItem("auth_redirect_product", product.id);
      toast.info("Please sign in to contact seller");
      navigate("/auth");
      return;
    }
    
    if (currentUser.id === product.owner_id) {
      toast.error("This is your own listing");
      return;
    }

    navigate(`/chat?product=${product.id}`);
  };

  const handleViewRealImages = () => {
    if (!currentUser) {
      localStorage.setItem("auth_redirect", `/product/${product.id}`);
      toast.info("Please sign in to view real images");
      navigate("/auth");
      return;
    }
    setShowRealImages(true);
    setImageViewerOpen(true);
  };

  const handleWhatsAppShare = () => {
    const productUrl = `${window.location.origin}/product/${product.id}`;
    const message = `Check out this ${product.title} on Behen.pk!\n\n${productUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!product) return null;

  // Show AI cover first if available, determine which images to show
  const displayImages = product.ai_cover_image 
    ? [product.ai_cover_image]
    : (product.real_images || []);
  
  const hasRealImages = product.real_images && product.real_images.length > 0;
  const blackoutDates = getBlackoutDates();
  const isOwner = currentUser?.id === product.owner_id;

  // Parse included accessories
  const includedAccessories = product.included_accessories || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Meta tags for SEO - prevent indexing of real images */}
      <head>
        <meta name="robots" content="noindex, nofollow" data-image-protection="true" />
      </head>
      
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-muted relative">
              {displayImages.length > 0 ? (
                <img
                  src={displayImages[selectedImage]}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <Tag className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
              
              {/* AI Image Badge */}
              {product.ai_cover_image && (
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="bg-white/90 text-xs">
                    AI Image
                  </Badge>
                </div>
              )}
              
              {/* Discount Badge */}
              {product.original_price && (
                <>
                  {(product.listing_type === "sale" || product.listing_type === "both") && 
                   product.sale_price && 
                   product.original_price > product.sale_price && (
                    <div className="absolute top-4 left-4">
                      <Badge variant="destructive" className="text-lg font-bold px-4 py-2">
                        {Math.round(((product.original_price - product.sale_price) / product.original_price) * 100)}% OFF
                      </Badge>
                    </div>
                  )}
                  {product.listing_type === "rent" && 
                   product.rental_price_4days && 
                   product.original_price > product.rental_price_4days && (
                    <div className="absolute top-4 left-4">
                      <Badge variant="destructive" className="text-lg font-bold px-4 py-2">
                        {Math.round(((product.original_price - product.rental_price_4days) / product.original_price) * 100)}% OFF
                      </Badge>
                    </div>
                  )}
                </>
              )}
            </div>
            
            {/* View Real Images Button */}
            {hasRealImages && (
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleViewRealImages}
              >
                <Eye className="mr-2 h-4 w-4" />
                View Real Images ({product.real_images.length})
              </Button>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Title and Badges */}
            <div>
              <div className="flex gap-2 mb-3 flex-wrap">
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
                        PKR {product.rental_price_4days?.toLocaleString() || (product.rental_price_per_day * 4)?.toLocaleString()}
                        <span className="text-lg font-normal text-muted-foreground"> / 4 days</span>
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        + PKR {product.extra_day_rate?.toLocaleString() || product.rental_price_per_day?.toLocaleString()} per extra day
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
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <p className="text-3xl font-bold text-primary">
                          PKR {product.sale_price?.toLocaleString()}
                        </p>
                        {product.original_price && product.original_price > product.sale_price && (
                          <>
                            <p className="text-xl text-muted-foreground line-through">
                              PKR {product.original_price.toLocaleString()}
                            </p>
                            <Badge variant="destructive" className="text-sm font-bold">
                              {Math.round(((product.original_price - product.sale_price) / product.original_price) * 100)}% OFF
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                {!isOwner && (
                  <div className="flex gap-3 mt-6">
                    <Button 
                      size="lg" 
                      onClick={handleContactSeller}
                      className="flex-1"
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Contact Seller
                    </Button>
                    <Button 
                      size="lg" 
                      variant="outline"
                      onClick={handleWhatsAppShare}
                      className="bg-[#25D366] hover:bg-[#25D366]/90 text-white border-0"
                    >
                      <Share2 className="mr-2 h-5 w-5" />
                      Share
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
                <p className="text-muted-foreground whitespace-pre-line">{product.description || "No description provided."}</p>
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

            {/* Product Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shirt className="h-5 w-5" />
                  Product Details
                </CardTitle>
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
                  
                  {/* Dry Clean Only */}
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      Dry Clean Only
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      {product.dry_clean_only ? (
                        <><Check className="h-4 w-4 text-green-600" /> Yes</>
                      ) : (
                        <><X className="h-4 w-4 text-muted-foreground" /> No</>
                      )}
                    </p>
                  </div>

                  {/* Alteration Possible */}
                  <div>
                    <p className="text-sm text-muted-foreground">Alteration Possible</p>
                    <p className="font-medium flex items-center gap-1">
                      {product.alteration_possible ? (
                        <><Check className="h-4 w-4 text-green-600" /> Yes</>
                      ) : (
                        <><X className="h-4 w-4 text-muted-foreground" /> No</>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Included Accessories */}
            {includedAccessories.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gem className="h-5 w-5" />
                    Included Accessories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {includedAccessories.map((accessory: string, index: number) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {accessory}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

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
                    {product.weight_range && (
                      <div>
                        <p className="text-sm text-muted-foreground">Weight Range</p>
                        <p className="font-medium">{product.weight_range}</p>
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
                </CardContent>
              </Card>
            )}

            {/* Reviews Section */}
            <div>
              <h3 className="text-2xl font-semibold mb-4">Reviews & Ratings</h3>
              <ReviewsList productId={product.id} />
            </div>
          </div>

          {/* Availability Calendar */}
          {(product.listing_type === "rent" || product.listing_type === "both") && (
            <div>
              <ProductAvailabilityCalendarFlatpickr 
                blackoutDates={blackoutDates}
                nextAvailableDate={getNextAvailableDate()}
              />
            </div>
          )}
        </div>
      </main>

      {/* Real Images Viewer Modal */}
      <RealImagesViewer
        isOpen={imageViewerOpen}
        onClose={() => {
          setImageViewerOpen(false);
          setShowRealImages(false);
        }}
        images={product.real_images || []}
        aiCoverImage={showRealImages ? undefined : product.ai_cover_image}
        productTitle={product.title}
      />
    </div>
  );
};

export default ProductDetail;