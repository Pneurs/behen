import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogOut, Plus, Search, Filter, Loader2 } from "lucide-react";
import { toast } from "sonner";
import ProductCard from "@/components/ProductCard";

const Browse = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [listingTypeFilter, setListingTypeFilter] = useState("all");

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
  }, [user, categoryFilter, listingTypeFilter]);

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

  const userRole = user?.user_metadata?.role || "choti";

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 
            className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent cursor-pointer" 
            style={{ fontFamily: "'Playfair Display', serif" }}
            onClick={() => navigate("/browse")}
          >
            Behen.pk
          </h1>
          <div className="flex items-center gap-3">
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
      </header>

      {/* Filters */}
      <div className="border-b bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search dresses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
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
              {userRole === "bari"
                ? "Start by listing your first dress!"
                : "Check back later for new listings"}
            </p>
            {userRole === "bari" && (
              <Button onClick={() => navigate("/list-dress")}>
                <Plus className="mr-2 h-4 w-4" />
                List Your First Dress
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-2xl font-semibold">
                {filteredProducts.length} {filteredProducts.length === 1 ? "dress" : "dresses"} available
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
