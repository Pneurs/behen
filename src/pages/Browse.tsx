import { useState, useMemo, useCallback, lazy, Suspense, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useParams, useLocation } from "react-router-dom";
import Seo from "@/components/Seo";
import SeoLinks from "@/components/SeoLinks";
import { SITE_URL, slugToCategory, slugToCity } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Loader2, X } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import LocationFilter from "@/components/LocationFilter";
import AvailabilityCalendarFlatpickr from "@/components/AvailabilityCalendarFlatpickr";
import BrowseFilters from "@/components/BrowseFilters";
import SEOBottomContent from "@/components/SEOBottomContent";
import { format, isWithinInterval } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useBrowseProducts, useAllBookings } from "@/hooks/useProducts";
import { useProductRatings } from "@/hooks/useProductRatings";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Lazy load heavy components
const MapView = lazy(() => import("@/components/MapView"));
const EarningsPromoPopup = lazy(() => import("@/components/EarningsPromoPopup"));

interface DateRange {
  from?: Date;
  to?: Date;
}

interface SEOContent {
  heading: string;
  description: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  bottom_content: string | null;
}

const CATEGORY_NAMES: Record<string, string> = {
  bridal: "Bridal Dresses",
  barat: "Barat Dresses",
  walima: "Walima Dresses",
  formal: "Formal Dresses",
  party_wear: "Party Wear",
  footwear: "Footwear",
  accessories: "Accessories",
  jewelry: "Jewelry",
  bags: "Bags",
};

const Browse = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const routeParams = useParams<{ city?: string; category?: string }>();
  const location = useLocation();
  const routeType = location.pathname.startsWith("/rent") ? "rent" : location.pathname.startsWith("/buy") ? "sale" : null;
  // Supports /rent/:city/:category and /rent/:category style paths
  const routeCategory = slugToCategory(routeParams.category) || slugToCategory(routeParams.city);
  const routeCity = routeParams.city && !slugToCategory(routeParams.city) ? slugToCity(routeParams.city) : undefined;
  const pCity = routeCity || searchParams.get("city") || null;
  const pArea = searchParams.get("area") || null;
  const pCategory = routeCategory || searchParams.get("category") || null;
  const { user, userRole } = useAuth();
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [categoryFilter, setCategoryFilter] = useState(pCategory || "all");
  const [listingTypeFilter, setListingTypeFilter] = useState<string>(routeType || "all");
  const [cityFilter, setCityFilter] = useState(pCity || "");
  const [areaFilter, setAreaFilter] = useState(searchParams.get("area") || "");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showMap, setShowMap] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [alterationFilter, setAlterationFilter] = useState(false);

  // React Query for products
  const {
    data: productPages,
    isLoading: loading,
    isError: productsError,
    refetch: refetchProducts,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useBrowseProducts({
    category: categoryFilter,
    listingType: listingTypeFilter,
    city: cityFilter,
  });
  const products = useMemo(() => productPages?.pages.flat() ?? [], [productPages]);

  // Auto-load the next batch when the user scrolls near the bottom
  const loadMoreRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const [slowLoad, setSlowLoad] = useState(false);
  useEffect(() => {
    if (!loading) {
      setSlowLoad(false);
      return;
    }

    const t = setTimeout(() => setSlowLoad(true), 8000);
    return () => clearTimeout(t);
  }, [loading]);

  // React Query for bookings
  const { data: allBookings = [] } = useAllBookings();

  // Batch fetch ratings for all products
  const productIds = useMemo(() => products.map(p => p.id), [products]);
  const { data: ratingsMap } = useProductRatings(productIds);

  // SEO Content query
  const { data: seoContent } = useQuery({
    queryKey: ["seo-content", pCity, pArea, pCategory],
    queryFn: async () => {
      const city = pCity;
      const area = pArea;
      const category = pCategory;

      const queries = [
        { city, area, category },
        { city, area: null, category },
        { city, area, category: null },
        { city, area: null, category: null },
        { city: null, area: null, category },
      ];

      for (const q of queries) {
        let query = supabase.from("page_seo_content").select("heading, description, meta_description, meta_keywords, bottom_content");
        
        if (q.city) query = query.eq("city", q.city);
        else query = query.is("city", null);
        
        if (q.area) query = query.eq("area", q.area);
        else query = query.is("area", null);
        
        if (q.category) query = query.eq("category", q.category);
        else query = query.is("category", null);

        const { data } = await query.maybeSingle();
        
        if (data) {
          return data as SEOContent;
        }
      }
      return null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Memoized page heading
  const getPageHeading = useCallback(() => {
    if (seoContent?.heading) return seoContent.heading;
    
    const category = categoryFilter !== "all" ? CATEGORY_NAMES[categoryFilter] || categoryFilter : null;
    const city = cityFilter || null;
    const area = areaFilter || null;

    const verb = listingTypeFilter === "rent" ? "on Rent" : listingTypeFilter === "sale" ? "for Sale" : "for Rent & Sale";
    if (city && category) {
      return `${category} ${verb} in ${area ? area + ", " : ""}${city}`;
    }
    if (city) {
      return `Dresses ${verb} in ${area ? area + ", " : ""}${city}`;
    }
    if (category) {
      return `${category} Collection`;
    }
    return "Browse Collection";
  }, [seoContent, categoryFilter, cityFilter, areaFilter, listingTypeFilter]);

  // Memoized availability check
  const isProductAvailableForDates = useCallback((product: any, dateRange: DateRange | undefined) => {
    if (!dateRange?.from || !dateRange?.to) return true;

    const selectedStart = dateRange.from;
    const selectedEnd = dateRange.to;

    if (product.availability_data?.blackout_dates) {
      const blackoutDates = product.availability_data.blackout_dates;
      for (const blackoutDate of blackoutDates) {
        const blackout = new Date(blackoutDate);
        if (isWithinInterval(blackout, { start: selectedStart, end: selectedEnd })) {
          return false;
        }
      }
    }

    const productBookings = allBookings.filter((b) => b.product_id === product.id);
    for (const booking of productBookings) {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);
      if (bookingStart <= selectedEnd && bookingEnd >= selectedStart) {
        return false;
      }
    }
    return true;
  }, [allBookings]);

  // Memoized blackout dates calculation
  const getProductBlackoutDates = useCallback((product: any): Date[] => {
    const dates: Date[] = [];

    if (product.availability_data?.blackout_dates) {
      for (const blackoutDate of product.availability_data.blackout_dates) {
        const parsed = new Date(blackoutDate);
        if (!isNaN(parsed.getTime())) {
          dates.push(parsed);
        }
      }
    }

    const productBookings = allBookings.filter((b) => b.product_id === product.id);
    productBookings.forEach((booking) => {
      const start = new Date(booking.start_date);
      const end = new Date(booking.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d));
      }
    });

    return dates;
  }, [allBookings]);

  // Memoized max price
  const maxPrice = useMemo(() => {
    if (products.length === 0) return 500000;
    const prices = products.map(p => p.rental_price_4days || p.sale_price || 0);
    return Math.max(...prices, 500000);
  }, [products]);

  // Memoized filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const q = searchQuery.trim().toLowerCase();
      const normalizedQ = q.replace(/[^a-z0-9]/g, "");
      const code = (product.product_code || "").toLowerCase();
      const normalizedCode = code.replace(/[^a-z0-9]/g, "");
      const matchesSearch =
        !q ||
        product.title.toLowerCase().includes(q) ||
        product.description?.toLowerCase().includes(q) ||
        (!!normalizedQ &&
          (normalizedCode === normalizedQ ||
            normalizedCode === `bp${normalizedQ}` ||
            normalizedCode.includes(normalizedQ)));

      const matchesAvailability = isProductAvailableForDates(product, dateRange);

      const productPrice = product.rental_price_4days || product.sale_price || 0;
      const matchesPrice = !priceRange || (productPrice >= priceRange[0] && productPrice <= priceRange[1]);

      const matchesSize = selectedSizes.length === 0 || 
        selectedSizes.some(s => s.toLowerCase() === (product.size || "").toLowerCase());

      const matchesArea = !areaFilter || 
        (product.area || "").toLowerCase().includes(areaFilter.toLowerCase());

      const matchesAlteration = !alterationFilter || product.alteration_possible === true;

      return matchesSearch && matchesAvailability && matchesPrice && matchesSize && matchesArea && matchesAlteration;
    });
  }, [products, searchQuery, dateRange, priceRange, selectedSizes, areaFilter, alterationFilter, isProductAvailableForDates]);

  const hasActiveFilters = categoryFilter !== "all" || listingTypeFilter !== "all" || cityFilter || areaFilter || dateRange || (priceRange && (priceRange[0] > 0 || priceRange[1] < maxPrice)) || selectedSizes.length > 0 || alterationFilter;

  const clearAllFilters = useCallback(() => {
    setCategoryFilter("all");
    setListingTypeFilter("all");
    setCityFilter("");
    setAreaFilter("");
    setDateRange(undefined);
    setSearchQuery("");
    setPriceRange(null);
    setSelectedSizes([]);
    setAlterationFilter(false);
  }, []);

  const handleProductClick = useCallback((productId: string) => {
    navigate(`/product/${productId}`);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title={`${getPageHeading()} | Behen.pk`}
        description={seoContent?.meta_description || `Browse ${getPageHeading().toLowerCase()} on Behen.pk — designer bridal, barat, walima and party wear from trusted sellers, at a fraction of the price.`}
        path={location.pathname === "/browse" ? `/browse${pCity || pCategory ? `?${new URLSearchParams({ ...(pCity ? { city: pCity } : {}), ...(pCategory ? { category: pCategory } : {}) }).toString()}` : ""}` : location.pathname}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL + "/" },
            { "@type": "ListItem", position: 2, name: getPageHeading(), item: SITE_URL + location.pathname },
          ],
        }}
      />
      <Header />
      <Suspense fallback={null}>
        <EarningsPromoPopup userRole={userRole} />
      </Suspense>
      
      {/* Page Title - Dynamic SEO */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            {getPageHeading()}
          </h1>
          {seoContent?.description && (
            <p className="text-muted-foreground mt-2 max-w-3xl">
              {seoContent.description}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dresses or code (BP-1001)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <LocationFilter
              selectedCity={cityFilter}
              selectedArea={areaFilter}
              onCityChange={setCityFilter}
              onAreaChange={setAreaFilter}
            />
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="bridal">Bridal</SelectItem>
                <SelectItem value="barat">Barat</SelectItem>
                <SelectItem value="walima">Walima</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="party_wear">Party Wear</SelectItem>
                <SelectItem value="footwear">Footwear</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
                <SelectItem value="jewelry">Jewelry</SelectItem>
                <SelectItem value="bags">Bags</SelectItem>
              </SelectContent>
            </Select>

            <Select value={listingTypeFilter} onValueChange={setListingTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="rent">For Rent</SelectItem>
                <SelectItem value="sale">For Sale</SelectItem>
              </SelectContent>
            </Select>

            <AvailabilityCalendarFlatpickr
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />

            <BrowseFilters
              priceRange={priceRange || [0, maxPrice]}
              onPriceRangeChange={setPriceRange}
              selectedSizes={selectedSizes}
              onSizesChange={setSelectedSizes}
              maxPrice={maxPrice}
              alterationFilter={alterationFilter}
              onAlterationFilterChange={setAlterationFilter}
            />

            {hasActiveFilters && (
              <Button variant="ghost" onClick={clearAllFilters} className="w-full md:w-auto">
                <X className="mr-2 h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            {slowLoad && (
              <div className="mt-4 text-center space-y-3">
                <p className="text-sm text-muted-foreground">Still loading dresses…</p>
                <Button variant="outline" onClick={() => refetchProducts()}>
                  Retry
                </Button>
              </div>
            )}
          </div>
        ) : productsError ? (
          <div className="text-center py-20">
            <h3 className="text-2xl font-semibold mb-4">Couldn’t load dresses</h3>
            <p className="text-muted-foreground mb-8">Please check your connection and try again.</p>
            <Button onClick={() => refetchProducts()}>Retry</Button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <h3 className="text-2xl font-semibold mb-4">No dresses found</h3>
            <p className="text-muted-foreground mb-8">
              {hasActiveFilters
                ? "Try adjusting your filters to see more results"
                : "Check back later for new listings"}
            </p>
            {hasActiveFilters && (
              <Button onClick={clearAllFilters}>Clear Filters</Button>
            )}
          </div>
        ) : (
          <>
            {showMap && (
              <Suspense fallback={<div className="h-[400px] bg-muted animate-pulse rounded-lg mb-8" />}>
                <div className="mb-8">
                  <MapView 
                    products={filteredProducts}
                    onProductClick={handleProductClick}
                  />
                </div>
              </Suspense>
            )}

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-semibold">
                {filteredProducts.length} {filteredProducts.length === 1 ? "dress" : "dresses"} available
                {cityFilter && ` in ${cityFilter}`}
                {areaFilter && `, ${areaFilter}`}
                {dateRange?.from && dateRange?.to && (
                  <span className="text-muted-foreground text-base font-normal ml-2">
                    for {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                  </span>
                )}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((product) => {
                const rating = ratingsMap?.[product.id];
                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    blackoutDates={getProductBlackoutDates(product)}
                    onClick={() => handleProductClick(product.id)}
                    averageRating={rating?.averageRating}
                    reviewCount={rating?.reviewCount || 0}
                  />
                );
              })}
            </div>
            {hasNextPage && (
              <div ref={loadMoreRef} className="flex justify-center py-8">
                <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? "Loading more dresses…" : "Load more dresses"}
                </Button>
              </div>
            )}
          </>
        )}

        {seoContent?.bottom_content && (
          <SEOBottomContent content={seoContent.bottom_content} />
        )}
        <SeoLinks city={pCity || undefined} />
      </main>
    </div>
  );
};

export default Browse;
