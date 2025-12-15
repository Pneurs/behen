import { useState, useEffect, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, MapPin, Shield, Sparkles } from "lucide-react";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { HomeSearch } from "@/components/HomeSearch";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

// Lazy load non-critical components
const HomeProducts = lazy(() => import("@/components/HomeProducts").then(m => ({ default: m.HomeProducts })));
const EarningsPromoPopup = lazy(() => import("@/components/EarningsPromoPopup"));

const ProductsSkeleton = () => (
  <div className="flex gap-6 overflow-hidden px-12">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="space-y-3 min-w-[280px]">
        <Skeleton className="h-[300px] w-full rounded-xl" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    ))}
  </div>
);

const Index = () => {
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserRole(session.user.user_metadata?.role || "");
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <Suspense fallback={null}>
        <EarningsPromoPopup userRole={userRole} />
      </Suspense>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-card rounded-full shadow-sm mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Pakistan's Premier Bridal Marketplace</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-in fade-in slide-in-from-bottom-5 duration-700 delay-100" style={{ fontFamily: "'Playfair Display', serif" }}>
              Behen.pk
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200">
              Rent or buy stunning bridal and formal wear. Share your designer pieces with your Behen and make every celebration unforgettable.
            </p>
            
            <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-7 duration-700 delay-300">
              <HomeSearch />
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
              <Link to="/browse" className="w-full sm:w-auto">
                <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all">
                  <Search className="mr-2 h-5 w-5" />
                  Browse Collection
                </Button>
              </Link>
              <Link to="/auth?mode=signup&role=bari" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full border-2 hover:bg-secondary">
                  List Your Dress
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ fontFamily: "'Playfair Display', serif" }}>
            Featured Collection
          </h2>
          <Suspense fallback={<ProductsSkeleton />}>
            <HomeProducts />
          </Suspense>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12" style={{ fontFamily: "'Playfair Display', serif" }}>
            Why Choose Behen.pk?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Find Nearby</h3>
              <p className="text-muted-foreground">
                Discover beautiful dresses near you with our location-based search. Privacy-first approach keeps exact addresses hidden until booking.
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Secure & Private</h3>
              <p className="text-muted-foreground">
                Protected chat system, verified listings, and secure booking process. Your privacy and safety are our top priorities.
              </p>
            </div>
            
            <div className="bg-card p-8 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Quality Collection</h3>
              <p className="text-muted-foreground">
                From bridal lehengas to party wear, discover designer pieces at affordable rental prices or purchase pre-loved favorites.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
            Ready to Get Started?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of Behens sharing and discovering beautiful outfits across Pakistan
          </p>
          <Link to="/auth">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg">
              Sign Up Now
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">&copy; 2025 Behen.pk. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/return-policy" className="text-muted-foreground hover:text-primary transition-colors">
                Return Policy
              </Link>
              <Link to="/privacy-policy" className="text-muted-foreground hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">
                Terms & Conditions
              </Link>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border text-center text-xs text-muted-foreground">
            <p>2nd Floor Plot # 9، Lajna Chowk، College Road, Block 2 Sector C-1 Ahmed Avenue, Lahore, Pakistan | 0328 5913965</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
