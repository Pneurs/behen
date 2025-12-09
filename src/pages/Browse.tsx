import { useEffect, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";
import LocationFilter from "@/components/LocationFilter";
import AvailabilityCalendarFlatpickr from "@/components/AvailabilityCalendarFlatpickr";
import BrowseFilters from "@/components/BrowseFilters";
import MapView from "@/components/MapView";
import { format, isWithinInterval } from "date-fns";

interface DateRange {
  from?: Date;
  to?: Date;
}

const Browse = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get("category") || "all");
  const [listingTypeFilter, setListingTypeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState(searchParams.get("city") || "");
  const [areaFilter, setAreaFilter] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showMap, setShowMap] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      checkAdminRole();
    }
  }, [user]);

  const checkAdminRole = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "super_admin")
      .single();
    
    setIsAdmin(!!data);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    loadProducts();
    loadBookings();
  }, [categoryFilter, listingTypeFilter, cityFilter, areaFilter]);

  const loadBookings = async () => {
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("product_id, start_date, end_date, booking_status")
        .in("booking_status", ["confirmed", "payment_submitted", "pending_payment"]);

      if (error) throw error;
      setAllBookings(data || []);
    } catch (error: any) {
      console.error("Failed to load bookings:", error);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("products")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (categoryFilter !== "all") {
        query = query.eq("category", categoryFilter);
      }

      if (listingTypeFilter !== "all") {
        if (listingTypeFilter === "rent" || listingTypeFilter === "sale") {
          query = query.or(`listing_type.eq.${listingTypeFilter},listing_type.eq.both`);
        }
      }

      if (cityFilter) {
        query = query.eq("city", cityFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Failed to load products");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Area filter for query
  useEffect(() => {
    // If area filter changes, update products
  }, [areaFilter]);

  const isProductAvailableForDates = (product: any, dateRange: DateRange | undefined) => {
    if (!dateRange?.from || !dateRange?.to) return true;

    const selectedStart = dateRange.from;
    const selectedEnd = dateRange.to;

    // Check blackout dates from product availability_data
    if (product.availability_data?.blackout_dates) {
      const blackoutDates = product.availability_data.blackout_dates;

      for (const blackoutDate of blackoutDates) {
        const blackout = new Date(blackoutDate);
        if (isWithinInterval(blackout, { start: selectedStart, end: selectedEnd })) {
          return false;
        }
      }
    }

    // Check for overlapping bookings
    const productBookings = allBookings.filter((b) => b.product_id === product.id);

    for (const booking of productBookings) {
      const bookingStart = new Date(booking.start_date);
      const bookingEnd = new Date(booking.end_date);

      // Check for overlap: (booking_start <= selected_end) AND (booking_end >= selected_start)
      if (bookingStart <= selectedEnd && bookingEnd >= selectedStart) {
        return false; // Booking overlaps with selected dates
      }
    }

    return true;
  };

  const getProductBlackoutDates = (product: any): Date[] => {
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
  };

  // Get max price for filter
  const maxPrice = useMemo(() => {
    if (products.length === 0) return 500000;
    const prices = products.map(p => p.rental_price_4days || p.sale_price || 0);
    return Math.max(...prices, 500000);
  }, [products]);


  let filteredProducts = products.filter((product) => {
    // Search filter
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Availability filter
    const matchesAvailability = isProductAvailableForDates(product, dateRange);

    // Price filter
    const productPrice = product.rental_price_4days || product.sale_price || 0;
    const matchesPrice = productPrice >= priceRange[0] && productPrice <= priceRange[1];

    // Size filter - case insensitive comparison
    const matchesSize = selectedSizes.length === 0 || 
      selectedSizes.some(s => s.toLowerCase() === (product.size || "").toLowerCase());

    // Area filter
    const matchesArea = !areaFilter || 
      (product.area || "").toLowerCase().includes(areaFilter.toLowerCase());

    return matchesSearch && matchesAvailability && matchesPrice && matchesSize && matchesArea;
  });

  const hasActiveFilters = categoryFilter !== "all" || listingTypeFilter !== "all" || cityFilter || areaFilter || dateRange || priceRange[0] > 0 || priceRange[1] < maxPrice || selectedSizes.length > 0;

  const clearAllFilters = () => {
    setCategoryFilter("all");
    setListingTypeFilter("all");
    setCityFilter("");
    setAreaFilter("");
    setDateRange(undefined);
    setSearchQuery("");
    setPriceRange([0, maxPrice]);
    setSelectedSizes([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Page Title - Static */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
            Browse Collection
          </h1>
        </div>
      </div>

      {/* Filters - Static (not sticky) */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search dresses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Row */}
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
              priceRange={priceRange}
              onPriceRangeChange={setPriceRange}
              selectedSizes={selectedSizes}
              onSizesChange={setSelectedSizes}
              maxPrice={maxPrice}
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
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              <div className="mb-8">
                <MapView 
                  products={filteredProducts}
                  onProductClick={(id) => navigate(`/product/${id}`)}
                />
              </div>
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
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  blackoutDates={getProductBlackoutDates(product)}
                  onClick={() => navigate(`/product/${product.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Browse;