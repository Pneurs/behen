import Seo from "@/components/Seo";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ReviewsList from "@/components/ReviewsList";
import ProductCard from "@/components/ProductCard";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import ProductAvailabilityCalendarFlatpickr from "@/components/ProductAvailabilityCalendarFlatpickr";
import RealImagesViewer from "@/components/RealImagesViewer";
import OwnerContactCard from "@/components/OwnerContactCard";
import { useWishlist } from "@/hooks/useWishlist";
import { useChatEnabled } from "@/hooks/useChatEnabled";
import { useBuyRentEnabled } from "@/hooks/useBuyRentEnabled";
import { useAiImageEnabled } from "@/hooks/useAiImageEnabled";
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
  Share2,
  Heart,
  ShoppingBag,
  Video,
  ExternalLink,
  Download,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const galleryScrollRef = useRef<HTMLDivElement | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showRealImages, setShowRealImages] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [isAdminOrSuperAdmin, setIsAdminOrSuperAdmin] = useState(false);
  const [protectedImages, setProtectedImages] = useState<string[]>([]);
  const [protectedVideoUrl, setProtectedVideoUrl] = useState<string | null>(null);
  const { isInWishlist, loading: wishlistLoading, toggleWishlist } = useWishlist(id);
  const { chatEnabled } = useChatEnabled();
  const { buyEnabled, rentEnabled } = useBuyRentEnabled();
  const { aiImageEnabled } = useAiImageEnabled();

  // Check if current user is admin or super_admin
  useEffect(() => {
    const checkAdminRole = async () => {
      if (!currentUser) {
        setIsAdminOrSuperAdmin(false);
        return;
      }
      
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUser.id)
        .in("role", ["admin", "super_admin"]);
      
      setIsAdminOrSuperAdmin(roleData && roleData.length > 0);
    };
    
    checkAdminRole();
  }, [currentUser]);
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
      const { data: { session } } = await supabase.auth.getSession();
      const productResult = session
        ? await supabase.from("products").select("*").eq("id", id).single()
        : await supabase.rpc("get_public_product", { _product_id: id });
      const productData = productResult.data as any;
      const productError = productResult.error;

      if (productError) throw productError;
      setProduct(productData);

      if (session && productData.private_image_paths?.length) {
        const { data: signedImages } = await supabase.storage
          .from("product-private-media")
          .createSignedUrls(productData.private_image_paths, 600);
        setProtectedImages((signedImages || []).flatMap((item) => item.signedUrl ? [item.signedUrl] : []));
      }
      if (session && productData.uploaded_video_path) {
        const { data: signedVideo } = await supabase.storage
          .from("product-private-media")
          .createSignedUrl(productData.uploaded_video_path, 600);
        setProtectedVideoUrl(signedVideo?.signedUrl || null);
      }

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
      // Load related products (same category or city)
      const { data: relatedData } = await supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .neq("id", id)
        .or(`category.eq.${productData.category},city.eq.${productData.city}`)
        .limit(4);

      if (relatedData) {
        setRelatedProducts(relatedData);
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
  const displayImages = product.public_images?.length
    ? product.public_images
    : product.ai_cover_image
      ? [product.ai_cover_image]
      : (product.real_images || []).slice(0, 3);
  
  const legacyRealImages: string[] = currentUser ? (product.real_images || []) : [];
  const galleryImages: string[] = Array.from(
    new Set([...displayImages, ...(currentUser ? protectedImages : []), ...legacyRealImages].filter(Boolean))
  );
  const hasRealImages = protectedImages.length > 0;
  const blackoutDates = getBlackoutDates();
  const isOwner = currentUser?.id === product.owner_id;

  // Parse included accessories - handle "other:text" format
  const rawAccessories = product.included_accessories || [];
  const includedAccessories = rawAccessories.map((acc: string) => {
    if (acc.startsWith("other:")) {
      return acc.replace("other:", "");
    }
    // Convert IDs to readable labels
    const labelMap: Record<string, string> = {
      jewelry: "Jewelry",
      matching_footwear: "Matching Footwear",
      dupatta: "Dupatta",
      bag: "Bag/Clutch",
      belt: "Belt",
      other: "Other Accessories",
    };
    return labelMap[acc] || acc;
  });

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${product.title} — ${product.listing_type === "sale" ? "for Sale" : product.listing_type === "rent" ? "on Rent" : "Rent or Buy"}${product.city ? ` in ${product.city}` : ""} | Behen.pk`}
        description={`${product.title}${product.city ? ` in ${product.city}` : ""}. ${product.rental_price_4days ? `Rent for PKR ${Number(product.rental_price_4days).toLocaleString()} (4 days). ` : ""}${product.sale_price ? `Buy for PKR ${Number(product.sale_price).toLocaleString()}. ` : ""}${(product.description || "").slice(0, 90)}`}
        path={`/product/${product.id}`}
        image={displayImages[0]}
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.title,
            description: product.description || product.title,
            image: displayImages.slice(0, 3),
            category: product.category,
            ...(product.designer ? { brand: { "@type": "Brand", name: product.designer } } : {}),
            offers: {
              "@type": "Offer",
              priceCurrency: "PKR",
              price: Number(product.sale_price || product.rental_price_4days || product.rental_price_per_day || 0),
              availability: "https://schema.org/InStock",
              itemCondition: product.condition === "new" ? "https://schema.org/NewCondition" : "https://schema.org/UsedCondition",
              url: `https://behen.pk/product/${product.id}`,
            },
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://behen.pk/" },
              ...(product.city ? [{ "@type": "ListItem", position: 2, name: `Dresses in ${product.city}`, item: `https://behen.pk/rent/${product.city.toLowerCase().replace(/\s+/g, "-")}` }] : []),
              { "@type": "ListItem", position: product.city ? 3 : 2, name: product.title, item: `https://behen.pk/product/${product.id}` },
            ],
          },
        ]}
      />
      <Header />

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-muted relative">
              {galleryImages.length > 0 ? (
                <>
                  <div
                    ref={galleryScrollRef}
                    onScroll={(e) => {
                      const el = e.currentTarget;
                      setSelectedImage(Math.round(el.scrollLeft / el.clientWidth));
                    }}
                    className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {galleryImages.map((img, index) => (
                      <img
                        key={`${img}-${index}`}
                        src={img}
                        alt={`${product.title} photo ${index + 1}`}
                        loading={index === 0 ? "eager" : "lazy"}
                        className="h-full w-full flex-shrink-0 snap-center object-cover"
                      />
                    ))}
                  </div>

                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        aria-label="Previous photo"
                        onClick={() => scrollGalleryTo(selectedImage - 1)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-md hover:bg-background"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Next photo"
                        onClick={() => scrollGalleryTo(selectedImage + 1)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow-md hover:bg-background"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                        {galleryImages.map((_, index) => (
                          <span
                            key={index}
                            className={`h-1.5 rounded-full transition-all ${
                              selectedImage === index ? "w-4 bg-primary" : "w-1.5 bg-background/70"
                            }`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
                  <Tag className="h-24 w-24 text-muted-foreground" />
                </div>
              )}
              
              {/* AI Image Badge */}
              {aiImageEnabled && product.ai_cover_image && (
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
            
            {galleryImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {galleryImages.map((img, index) => (
                  <button
                    key={img}
                    type="button"
                    onClick={() => scrollGalleryTo(index)}
                    className={`h-20 w-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? "border-primary" : "border-transparent"}`}
                    aria-label={`Show photo ${index + 1}`}
                  >
                    <img src={img} alt={`${product.title} photo ${index + 1}`} loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
            {!currentUser && (
              <p className="text-xs text-muted-foreground">Sign in to see more original photos of this dress.</p>
            )}

            {/* Real Images Section */}
            {hasRealImages && (
              <Card className="border-dashed">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Eye className="h-5 w-5" />
                    Real Product Images
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {protectedImages.slice(0, 6).map((img: string, index: number) => (
                      <div 
                        key={index}
                        className="aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={handleViewRealImages}
                      >
                        <img
                          src={img}
                          alt={`Real image ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                  {protectedImages.length > 6 && (
                    <Button 
                      variant="ghost" 
                      className="w-full mt-2"
                      onClick={handleViewRealImages}
                    >
                      View All {protectedImages.length} Images
                    </Button>
                  )}
                  {protectedImages.length <= 6 && (
                    <Button 
                      variant="ghost" 
                      className="w-full mt-2"
                      onClick={handleViewRealImages}
                    >
                      View Full Size Images
                    </Button>
                  )}
                </CardContent>
              </Card>
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
                      <div className="flex items-baseline gap-3 flex-wrap">
                        <p className="text-3xl font-bold text-primary">
                          PKR {product.rental_price_4days?.toLocaleString() || (product.rental_price_per_day * 4)?.toLocaleString()}
                          <span className="text-lg font-normal text-muted-foreground"> / 4 days</span>
                        </p>
                        {product.original_price && product.original_price > (product.rental_price_4days || 0) && (
                          <>
                            <p className="text-xl text-muted-foreground line-through">
                              PKR {product.original_price.toLocaleString()}
                            </p>
                            <Badge variant="destructive" className="text-sm font-bold">
                              {Math.round(((product.original_price - (product.rental_price_4days || 0)) / product.original_price) * 100)}% OFF
                            </Badge>
                          </>
                        )}
                      </div>
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
                  <div className="space-y-3 mt-6">
                    {/* Main Action Buttons */}
                    <div className="flex gap-3">
                      {buyEnabled && (product.listing_type === "sale" || product.listing_type === "both") && (
                        <Button 
                          size="lg" 
                          onClick={() => {
                            if (!currentUser) {
                              localStorage.setItem("auth_redirect", `/cart/${product.id}?type=buy`);
                              toast.info("Please sign in to continue");
                              navigate("/auth");
                              return;
                            }
                            navigate(`/cart/${product.id}?type=buy`);
                          }}
                          className="flex-1 bg-primary hover:bg-primary/90"
                        >
                          <ShoppingBag className="mr-2 h-5 w-5" />
                          Buy Now
                        </Button>
                      )}
                      {rentEnabled && (product.listing_type === "rent" || product.listing_type === "both") && (
                        <Button 
                          size="lg" 
                          onClick={() => {
                            if (!currentUser) {
                              localStorage.setItem("auth_redirect", `/cart/${product.id}?type=rent`);
                              toast.info("Please sign in to continue");
                              navigate("/auth");
                              return;
                            }
                            navigate(`/cart/${product.id}?type=rent`);
                          }}
                          className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          <CalendarIcon className="mr-2 h-5 w-5" />
                          Rent Now
                        </Button>
                      )}
                    </div>
                    
                    {/* Contact Seller */}
                    {/* Show Contact Details Button - Above Chat */}
                    {owner && (
                      <OwnerContactCard 
                        owner={{ ...owner, phone: owner.phone || product.contact_phone || null }} 
                        currentUser={currentUser}
                        productId={product.id}
                        onLoginClick={() => {
                          localStorage.setItem("auth_redirect", `/product/${product.id}`);
                          toast.info("Please sign in to view contact details");
                          navigate("/auth");
                        }}
                      />
                    )}

                    {chatEnabled && product.negotiation_allowed && (
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={handleContactSeller}
                        className="w-full"
                      >
                        <MessageCircle className="mr-2 h-5 w-5" />
                        Chat to Negotiate
                      </Button>
                    )}
                    
                    {/* Fixed Price Badge */}
                    {!product.negotiation_allowed && (
                      <Badge variant="secondary" className="w-full justify-center py-3 text-sm">
                        🏷️ Fixed Price - No Negotiation
                      </Badge>
                    )}
                    
                    {/* Secondary Action Buttons */}
                    <div className="flex gap-3">
                      <Button 
                        size="lg" 
                        variant="outline"
                        onClick={toggleWishlist}
                        disabled={wishlistLoading}
                        className={`flex-1 ${isInWishlist ? "border-primary text-primary" : ""}`}
                      >
                        <Heart className={`mr-2 h-5 w-5 ${isInWishlist ? "fill-primary" : ""}`} />
                        {isInWishlist ? "In Wishlist" : "Add to Wishlist"}
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

            {/* Product Video - Only visible to Admin/Super Admin */}
            {(product.video_url || protectedVideoUrl) && (currentUser || isAdminOrSuperAdmin) && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-primary" />
                    Product Video
                    <Badge variant="outline" className="ml-2 text-xs">Admin Only</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    This video is only visible to admins for verification purposes.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(protectedVideoUrl || product.video_url, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open Video Link
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(protectedVideoUrl || product.video_url);
                        toast.success("Video URL copied to clipboard");
                      }}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Copy Link
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground break-all bg-muted p-2 rounded">
                    {protectedVideoUrl || product.video_url}
                  </p>
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
                  
                  {/* Dry Clean Required */}
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Droplets className="h-3 w-3" />
                      Requires Dry Cleaning
                    </p>
                    <p className="font-medium flex items-center gap-1">
                      {product.dry_clean_only ? (
                        <><Check className="h-4 w-4 text-green-600" /> Yes - Must be dry cleaned after use</>
                      ) : (
                        <><X className="h-4 w-4 text-muted-foreground" /> No - Regular wash is fine</>
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

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
              You May Also Like
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  product={relatedProduct}
                  onClick={() => navigate(`/product/${relatedProduct.id}`)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Real Images Viewer Modal */}
      <RealImagesViewer
        isOpen={imageViewerOpen}
        onClose={() => {
          setImageViewerOpen(false);
          setShowRealImages(false);
        }}
        images={galleryImages}
        productTitle={product.title}
      />
    </div>
  );
};

export default ProductDetail;