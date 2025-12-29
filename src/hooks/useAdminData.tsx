import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Types for admin data
export interface AdminStats {
  users: number;
  products: number;
  bookings: number;
  revenue: number;
  activeRentals: number;
  soldProducts: number;
  totalRentals: number;
}

export interface AdminBooking {
  id: string;
  product_id: string;
  renter_id: string;
  owner_id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  daily_rate: number;
  total_price: number;
  security_deposit: number;
  booking_status: string;
  payment_status: string;
  payment_proof_url: string | null;
  payment_notes: string | null;
  admin_notes: string | null;
  order_stage: string | null;
  created_at: string;
  updated_at: string;
  product_title: string;
  product_image: string | null;
  owner_name: string;
  owner_phone: string | null;
  renter_name: string;
  renter_phone: string | null;
}

export interface AdminProduct {
  id: string;
  title: string;
  category: string;
  subcategory: string | null;
  status: string;
  listing_type: string;
  owner_id: string;
  owner_name: string;
  ai_cover_image: string | null;
  city: string;
  area: string;
  size: string;
  rental_price_4days: number | null;
  sale_price: number | null;
  security_deposit: number | null;
  created_at: string;
}

export interface AdminUser {
  id: string;
  user_id: string;
  name: string;
  role: string;
  phone: string | null;
  city: string | null;
  area: string | null;
  email: string | null;
  created_at: string;
  roles: string[];
  product_count: number;
}

export interface AdminReview {
  id: string;
  booking_id: string;
  product_id: string;
  reviewer_id: string;
  owner_id: string;
  product_rating: number;
  owner_rating: number;
  product_review: string | null;
  owner_review: string | null;
  owner_response: string | null;
  owner_response_at: string | null;
  created_at: string;
  product_title: string;
  reviewer_name: string;
  owner_name: string;
}

export interface AdminChat {
  id: string;
  product_id: string;
  renter_id: string;
  owner_id: string;
  is_booking_confirmed: boolean;
  updated_at: string;
  product_title: string;
  product_image: string | null;
  owner_name: string;
  renter_name: string;
  messages: any[];
}

// Fetch admin stats - lightweight query for initial load
async function fetchAdminStats(): Promise<AdminStats> {
  const [
    { count: userCount },
    { count: productCount },
    { count: bookingCount },
    { data: completedBookings },
    { count: activeRentals },
    { count: totalRentals },
    { count: soldProducts },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("*", { count: "exact", head: true }),
    supabase.from("bookings").select("total_price").eq("booking_status", "completed"),
    supabase.from("bookings").select("*", { count: "exact", head: true }).in("booking_status", ["confirmed", "pending_payment", "payment_submitted"]),
    supabase.from("bookings").select("*", { count: "exact", head: true }).eq("booking_status", "completed"),
    supabase.from("products").select("*", { count: "exact", head: true }).eq("listing_type", "sale").eq("inventory_status", "unavailable"),
  ]);

  const revenue = completedBookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0;

  return {
    users: userCount || 0,
    products: productCount || 0,
    bookings: bookingCount || 0,
    revenue,
    activeRentals: activeRentals || 0,
    soldProducts: soldProducts || 0,
    totalRentals: totalRentals || 0,
  };
}

// Fetch pending bookings using the database view
async function fetchPendingBookings(): Promise<AdminBooking[]> {
  const { data, error } = await supabase
    .from("admin_bookings_view" as any)
    .select("*")
    .eq("payment_status", "submitted")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending bookings:", error);
    return [];
  }

  return (data || []) as unknown as AdminBooking[];
}

// Fetch all bookings using the database view
async function fetchAllBookings(): Promise<AdminBooking[]> {
  const { data, error } = await supabase
    .from("admin_bookings_view" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all bookings:", error);
    return [];
  }

  return (data || []) as unknown as AdminBooking[];
}

// Fetch pending products using the database view
async function fetchPendingProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("admin_products_view" as any)
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending products:", error);
    return [];
  }

  return (data || []) as unknown as AdminProduct[];
}

// Fetch all products using the database view
async function fetchAllProducts(): Promise<AdminProduct[]> {
  const { data, error } = await supabase
    .from("admin_products_view" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching all products:", error);
    return [];
  }

  return (data || []) as unknown as AdminProduct[];
}

// Fetch users with roles and product counts - optimized with batch fetching
async function fetchUsers(): Promise<AdminUser[]> {
  // Fetch all profiles, all products (for count), and all user_roles in parallel
  const [profilesRes, productsRes, rolesRes] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase.from("products").select("owner_id"),
    supabase.from("user_roles").select("user_id, role"),
  ]);

  const profiles = profilesRes.data || [];
  const products = productsRes.data || [];
  const roles = rolesRes.data || [];

  // Create lookup maps
  const productCountMap: Record<string, number> = {};
  products.forEach((p) => {
    productCountMap[p.owner_id] = (productCountMap[p.owner_id] || 0) + 1;
  });

  const rolesMap: Record<string, string[]> = {};
  roles.forEach((r) => {
    if (!rolesMap[r.user_id]) rolesMap[r.user_id] = [];
    rolesMap[r.user_id].push(r.role);
  });

  // Try to fetch emails via edge function
  let emailMap: Record<string, string> = {};
  try {
    const { data: session } = await supabase.auth.getSession();
    const response = await supabase.functions.invoke("admin-list-users", {
      headers: {
        Authorization: `Bearer ${session.session?.access_token}`,
      },
    });

    if (response.data?.userEmails) {
      emailMap = response.data.userEmails as Record<string, string>;
    }
  } catch (e) {
    console.log("Could not fetch user emails via edge function:", e);
  }

  return profiles.map((user) => ({
    ...user,
    roles: rolesMap[user.user_id] || [],
    email: emailMap[user.user_id] || null,
    product_count: productCountMap[user.user_id] || 0,
  }));
}

// Fetch reviews using the database view
async function fetchReviews(): Promise<AdminReview[]> {
  const { data, error } = await supabase
    .from("admin_reviews_view" as any)
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }

  return (data || []) as unknown as AdminReview[];
}

// Fetch chats using the database view + messages
async function fetchChats(): Promise<AdminChat[]> {
  const { data: conversations, error } = await supabase
    .from("admin_conversations_view" as any)
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching conversations:", error);
    return [];
  }

  // Batch fetch messages for all conversations
  const conversationIds = (conversations || []).map((c: any) => c.id);
  
  if (conversationIds.length === 0) return [];

  const { data: allMessages } = await supabase
    .from("chat_messages")
    .select("*")
    .in("conversation_id", conversationIds)
    .order("created_at", { ascending: false });

  // Group messages by conversation
  const messagesMap: Record<string, any[]> = {};
  (allMessages || []).forEach((msg) => {
    if (!messagesMap[msg.conversation_id]) messagesMap[msg.conversation_id] = [];
    if (messagesMap[msg.conversation_id].length < 20) {
      messagesMap[msg.conversation_id].push(msg);
    }
  });

  return (conversations || []).map((conv: any) => ({
    ...conv,
    messages: messagesMap[conv.id] || [],
  })) as AdminChat[];
}

// Fetch app settings
async function fetchAppSettings() {
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["ai_image_model", "chat_system_enabled", "bari_behen_commission", "choti_behen_commission"]);

  if (error) {
    console.error("Error fetching app settings:", error);
    return null;
  }

  const settingsMap: Record<string, any> = {};
  (data || []).forEach((s) => {
    settingsMap[s.key] = s.value;
  });

  return settingsMap;
}

// Custom hooks with caching and stale time

export function useAdminStats() {
  return useQuery({
    queryKey: ["admin-stats"],
    queryFn: fetchAdminStats,
    staleTime: 30000, // 30 seconds
  });
}

export function useAdminPendingBookings() {
  return useQuery({
    queryKey: ["admin-pending-bookings"],
    queryFn: fetchPendingBookings,
    staleTime: 15000, // 15 seconds - more frequent for pending items
  });
}

export function useAdminAllBookings(enabled = true) {
  return useQuery({
    queryKey: ["admin-all-bookings"],
    queryFn: fetchAllBookings,
    staleTime: 30000,
    enabled,
  });
}

export function useAdminPendingProducts() {
  return useQuery({
    queryKey: ["admin-pending-products"],
    queryFn: fetchPendingProducts,
    staleTime: 15000,
  });
}

export function useAdminAllProducts(enabled = true) {
  return useQuery({
    queryKey: ["admin-all-products"],
    queryFn: fetchAllProducts,
    staleTime: 30000,
    enabled,
  });
}

export function useAdminUsers(enabled = true) {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchUsers,
    staleTime: 60000, // 1 minute - users don't change often
    enabled,
  });
}

export function useAdminReviews(enabled = true) {
  return useQuery({
    queryKey: ["admin-reviews"],
    queryFn: fetchReviews,
    staleTime: 60000,
    enabled,
  });
}

export function useAdminChats(enabled = true) {
  return useQuery({
    queryKey: ["admin-chats"],
    queryFn: fetchChats,
    staleTime: 30000,
    enabled,
  });
}

export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: fetchAppSettings,
    staleTime: 60000,
  });
}

// Hook to invalidate all admin data
export function useInvalidateAdminData() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pending-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-all-bookings"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pending-products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-all-products"] });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
    queryClient.invalidateQueries({ queryKey: ["admin-chats"] });
    queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
  };
}
