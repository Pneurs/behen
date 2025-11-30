import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Browse from "./pages/Browse";
import ListDress from "./pages/ListDress";
import ProductDetail from "./pages/ProductDetail";
import Booking from "./pages/Booking";
import Chat from "./pages/Chat";
import AllChats from "./pages/AllChats";
import Admin from "./pages/Admin";
import MyBookings from "./pages/MyBookings";
import BariBehenDashboard from "./pages/BariBehenDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/list-dress" element={<ListDress />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/booking/:productId" element={<Booking />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chats" element={<AllChats />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/dashboard" element={<BariBehenDashboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
