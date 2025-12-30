import { lazy, Suspense, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Lazy load all pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Browse = lazy(() => import("./pages/Browse"));
const ListDress = lazy(() => import("./pages/ListDress"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Chat = lazy(() => import("./pages/Chat"));
const AllChats = lazy(() => import("./pages/AllChats"));
const AdminAuth = lazy(() => import("./pages/AdminAuth"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const MyBookings = lazy(() => import("./pages/MyBookings"));
const BariBehenDashboard = lazy(() => import("./pages/BariBehenDashboard"));
const Wishlist = lazy(() => import("./pages/Wishlist"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ReturnPolicy = lazy(() => import("./pages/ReturnPolicy"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsAndConditions = lazy(() => import("./pages/TermsAndConditions"));
const EarnMoney = lazy(() => import("./pages/EarnMoney"));
const Profile = lazy(() => import("./pages/Profile"));
const Sitemap = lazy(() => import("./pages/Sitemap"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

// Configure QueryClient with caching optimizations
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache retention
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only retry once on failure
      refetchOnMount: false, // Don't refetch if data exists
    },
  },
});

// Dynamic favicon component
const DynamicFavicon = () => {
  const { data: faviconUrl } = useQuery({
    queryKey: ['branding-favicon'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'branding_favicon_url')
        .single();
      
      const value = data?.value as { url?: string } | null;
      return value?.url || null;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  useEffect(() => {
    if (faviconUrl) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (link) {
        link.href = faviconUrl;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = faviconUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [faviconUrl]);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <DynamicFavicon />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/browse" element={<Browse />} />
              <Route path="/list-dress" element={<ListDress />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart/:productId" element={<Cart />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chats" element={<AllChats />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/admin" element={<AdminAuth />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/dashboard" element={<BariBehenDashboard />} />
              <Route path="/return-policy" element={<ReturnPolicy />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsAndConditions />} />
              <Route path="/earn-money" element={<EarnMoney />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/sitemap.xml" element={<Sitemap />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
