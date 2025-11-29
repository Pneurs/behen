import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/Header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Plus, Search, Filter, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";
import LocationFilter from "@/components/LocationFilter";
import AvailabilityFilter from "@/components/AvailabilityFilter";
import MapView from "@/components/MapView";
import { DateRange } from "react-day-picker";
import { format, isWithinInterval } from "date-fns";

const Browse = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [listingTypeFilter, setListingTypeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [isNearMe, setIsNearMe] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      loadProducts();
    }
  }, [user, categoryFilter, listingTypeFilter, cityFilter]);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const handleNearMe = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setIsNearMe(true);
          setCityFilter("");
          toast.success("Location detected! Showing nearby dresses");
        },
        (error) => {
          toast.error("Could not get your location. Please enable location access.");
          setIsNearMe(false);
        }
      );
    } else {
      toast.error("Location services not available");
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const isProductAvailableForDates = (product: any, dateRange: DateRange | undefined) => {
    if (!dateRange?.from || !dateRange?.to) return true;

    // If no availability data, assume available
    if (!product.availability_data) return true;

    const blackoutDates = product.availability_data.blackout_dates || [];
    
    // Check if any blackout date falls within the selected range
    for (const blackoutDate of blackoutDates) {
      const blackout = new Date(blackoutDate);
      if (isWithinInterval(blackout, { start: dateRange.from, end: dateRange.to })) {
        return false;
      }
    }

    return true;
  };

  const userRole = user?.user_metadata?.role || "choti";

  let filteredProducts = products.filter((product) => {
    // Search filter
    const matchesSearch =
      product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());

    // Availability filter
    const matchesAvailability = isProductAvailableForDates(product, dateRange);

    return matchesSearch && matchesAvailability;
  });

  // Sort by distance if "Near Me" is active
  if (isNearMe && userLocation) {
    filteredProducts = filteredProducts
      .map((product) => ({
        ...product,
        distance: product.latitude && product.longitude
          ? calculateDistance(userLocation.lat, userLocation.lng, product.latitude, product.longitude)
          : Infinity,
      }))
      .sort((a, b) => a.distance - b.distance)
      .filter((p) => p.distance < 50); // Only show within 50km
  }

  const hasActiveFilters = categoryFilter !== "all" || listingTypeFilter !== "all" || cityFilter || dateRange || isNearMe;

  const clearAllFilters = () => {
    setCategoryFilter("all");
    setListingTypeFilter("all");
    setCityFilter("");
    setDateRange(undefined);
    setIsNearMe(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="border-b bg-card sticky top-16 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
              Browse Collection
            </h1>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate("/my-bookings")}>
              My Bookings
            </Button>
            {isAdmin && (
              <Button variant="secondary" onClick={() => navigate("/admin")}>
                Admin
              </Button>
            )}
            {userRole === "bari" && (
              <Button onClick={() => navigate("/list-dress")}>
                <Plus className="mr-2 h-4 w-4" />
                List Dress
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-card/50 sticky top-32 z-10">
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
              onCityChange={setCityFilter}
              onNearMeClick={handleNearMe}
              isNearMe={isNearMe}
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

            <AvailabilityFilter
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />

            <Button
              variant={showMap ? "default" : "outline"}
              onClick={() => setShowMap(!showMap)}
              className="w-full md:w-auto"
            >
              {showMap ? "Hide Map" : "Show Map"}
            </Button>

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
                : userRole === "bari"
                ? "Start by listing your first dress!"
                : "Check back later for new listings"}
            </p>
            {hasActiveFilters ? (
              <Button onClick={clearAllFilters}>Clear Filters</Button>
            ) : userRole === "bari" ? (
              <Button onClick={() => navigate("/list-dress")}>
                <Plus className="mr-2 h-4 w-4" />
                List Your First Dress
              </Button>
            ) : null}
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
                {isNearMe && " near you"}
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
