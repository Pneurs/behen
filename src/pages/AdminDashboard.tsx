import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { 
  Users, Package, Calendar, TrendingUp, Check, X, Eye, CreditCard, Loader2, 
  Shield, LogOut, UserCog, MessageSquare, Star, DollarSign, ShoppingBag, 
  Send, Trash2, Pencil, ExternalLink, Mail, RefreshCw, Settings, Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { sendEmailNotification } from "@/lib/emailNotifications";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentRole, setCurrentRole] = useState<string>("");
  const [stats, setStats] = useState({ 
    users: 0, products: 0, bookings: 0, revenue: 0, 
    activeRentals: 0, soldProducts: 0, totalRentals: 0 
  });
  const [pendingBookings, setPendingBookings] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [allChats, setAllChats] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProof, setSelectedProof] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userProducts, setUserProducts] = useState<any[]>([]);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [securityDepositDialog, setSecurityDepositDialog] = useState<{
    open: boolean;
    booking: any;
    recipient: 'owner' | 'renter';
    amount: string;
    notes: string;
  }>({ open: false, booking: null, recipient: 'renter', amount: '', notes: '' });
  const [reviewResponseDialog, setReviewResponseDialog] = useState<{
    open: boolean;
    review: any;
    response: string;
  }>({ open: false, review: null, response: '' });
  const [aiModelSetting, setAiModelSetting] = useState<{
    provider: "lovable" | "openai";
    model: string;
    loading: boolean;
  }>({ provider: "lovable", model: "google/gemini-2.5-flash-image-preview", loading: true });
  const [updatingAIModel, setUpdatingAIModel] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/admin");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["super_admin", "admin", "manager"]);

    if (!roles || roles.length === 0) {
      toast({
        title: "Access Denied",
        description: "You don't have admin permissions",
        variant: "destructive",
      });
      navigate("/admin");
      return;
    }

    setCurrentUser(user);
    setCurrentRole(roles[0].role);
    fetchData();
  };

  const fetchData = async () => {
    setLoading(true);

    // Fetch stats
    const { count: userCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const { count: productCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    const { count: bookingCount } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true });

    const { data: completedBookings } = await supabase
      .from("bookings")
      .select("total_price")
      .eq("booking_status", "completed");

    const revenue = completedBookings?.reduce((sum, b) => sum + Number(b.total_price), 0) || 0;

    // Count active rentals (not completed/cancelled)
    const { count: activeRentals } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .in("booking_status", ["confirmed", "pending_payment", "payment_submitted"]);

    // Count total completed rentals
    const { count: totalRentals } = await supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("booking_status", "completed");

    // Count products that were sold (listing_type = 'sale')
    const { count: soldProducts } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("listing_type", "sale")
      .eq("inventory_status", "unavailable");

    setStats({
      users: userCount || 0,
      products: productCount || 0,
      bookings: bookingCount || 0,
      revenue,
      activeRentals: activeRentals || 0,
      soldProducts: soldProducts || 0,
      totalRentals: totalRentals || 0,
    });

    // Fetch pending bookings with owner and renter info
    const { data: bookings } = await supabase
      .from("bookings")
      .select(`*, products (title, ai_cover_image)`)
      .eq("payment_status", "submitted")
      .order("created_at", { ascending: false });

    const bookingsWithNames = await Promise.all((bookings || []).map(async (booking) => {
      const [ownerProfile, renterProfile] = await Promise.all([
        supabase.from("profiles").select("name, phone").eq("user_id", booking.owner_id).maybeSingle(),
        supabase.from("profiles").select("name, phone").eq("user_id", booking.renter_id).maybeSingle(),
      ]);
      
      return {
        ...booking,
        owner_name: ownerProfile.data?.name || "Bari Behen",
        owner_phone: ownerProfile.data?.phone || null,
        renter_name: renterProfile.data?.name || "Choti Behen",
        renter_phone: renterProfile.data?.phone || null,
      };
    }));

    setPendingBookings(bookingsWithNames);

    // Fetch ALL bookings for rental holdings view
    const { data: allBookingsData } = await supabase
      .from("bookings")
      .select(`*, products (title, ai_cover_image)`)
      .order("created_at", { ascending: false });

    const allBookingsWithNames = await Promise.all((allBookingsData || []).map(async (booking) => {
      const [ownerProfile, renterProfile] = await Promise.all([
        supabase.from("profiles").select("name, phone").eq("user_id", booking.owner_id).maybeSingle(),
        supabase.from("profiles").select("name, phone").eq("user_id", booking.renter_id).maybeSingle(),
      ]);
      
      return {
        ...booking,
        owner_name: ownerProfile.data?.name || "Bari Behen",
        owner_phone: ownerProfile.data?.phone || null,
        renter_name: renterProfile.data?.name || "Choti Behen",
        renter_phone: renterProfile.data?.phone || null,
      };
    }));

    setAllBookings(allBookingsWithNames);

    // Fetch pending products
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    const productsWithNames = await Promise.all((products || []).map(async (product) => {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", product.owner_id)
        .maybeSingle();
      
      return {
        ...product,
        owner_name: ownerProfile?.name || "Unknown",
      };
    }));

    setPendingProducts(productsWithNames);

    // Fetch ALL products for super admin
    const { data: allProductsData } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    const allProductsWithNames = await Promise.all((allProductsData || []).map(async (product) => {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", product.owner_id)
        .maybeSingle();
      
      return {
        ...product,
        owner_name: ownerProfile?.name || "Unknown",
      };
    }));

    setAllProducts(allProductsWithNames);

    // Fetch users with their roles and emails
    const { data: allUsers } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    // Fetch auth users to get emails (super admin can see this)
    const usersWithRolesAndEmails = await Promise.all((allUsers || []).map(async (user) => {
      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.user_id);
      
      return {
        ...user,
        roles: userRoles?.map(r => r.role) || [],
        email: null as string | null,
      };
    }));

    // Fetch emails for all users via edge function
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('admin-list-users', {
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });
      
      if (response.data?.userEmails) {
        const emailMap = response.data.userEmails as Record<string, string>;
        usersWithRolesAndEmails.forEach(user => {
          user.email = emailMap[user.user_id] || null;
        });
      }
    } catch (e) {
      console.log("Could not fetch user emails via edge function:", e);
    }

    setUsers(usersWithRolesAndEmails);

    // Fetch all chats with messages
    const { data: conversations } = await supabase
      .from("chat_conversations")
      .select(`
        *,
        products (title, ai_cover_image)
      `)
      .order("updated_at", { ascending: false });

    const chatsWithDetails = await Promise.all((conversations || []).map(async (conv) => {
      const [ownerProfile, renterProfile, messages] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", conv.owner_id).maybeSingle(),
        supabase.from("profiles").select("name").eq("user_id", conv.renter_id).maybeSingle(),
        supabase.from("chat_messages").select("*").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(20),
      ]);

      return {
        ...conv,
        owner_name: ownerProfile.data?.name || "Bari Behen",
        renter_name: renterProfile.data?.name || "Choti Behen",
        messages: messages.data || [],
      };
    }));

    setAllChats(chatsWithDetails);

    // Fetch all reviews
    const { data: reviews } = await supabase
      .from("reviews")
      .select(`*, products (title)`)
      .order("created_at", { ascending: false });

    const reviewsWithDetails = await Promise.all((reviews || []).map(async (review) => {
      const [reviewerProfile, ownerProfile] = await Promise.all([
        supabase.from("profiles").select("name").eq("user_id", review.reviewer_id).maybeSingle(),
        supabase.from("profiles").select("name").eq("user_id", review.owner_id).maybeSingle(),
      ]);

      return {
        ...review,
        reviewer_name: reviewerProfile.data?.name || "Choti Behen",
        owner_name: ownerProfile.data?.name || "Bari Behen",
      };
    }));

    setAllReviews(reviewsWithDetails);

    // Fetch AI model setting
    try {
      const { data: aiSetting } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "ai_image_model")
        .single();
      
      if (aiSetting?.value) {
        const settingValue = aiSetting.value as { provider?: string; model?: string };
        setAiModelSetting({
          provider: (settingValue.provider as "lovable" | "openai") || "lovable",
          model: settingValue.model || "google/gemini-2.5-flash-image-preview",
          loading: false,
        });
      } else {
        setAiModelSetting(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.log("Could not fetch AI model setting:", error);
      setAiModelSetting(prev => ({ ...prev, loading: false }));
    }

    setLoading(false);
  };

  const handleVerifyPayment = async (booking: any, approved: boolean) => {
    const updateData = approved 
      ? {
          payment_status: "verified" as const,
          booking_status: "confirmed" as const,
          order_stage: "pending_packing_video" as const,
        }
      : {
          payment_status: "rejected" as const,
        };

    const { error } = await supabase
      .from("bookings")
      .update(updateData)
      .eq("id", booking.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update booking", variant: "destructive" });
      return;
    }

    // Get both profiles with phone numbers
    const [renterProfileRes, ownerProfileRes] = await Promise.all([
      supabase.from("profiles").select("name, phone").eq("user_id", booking.renter_id).maybeSingle(),
      supabase.from("profiles").select("name, phone").eq("user_id", booking.owner_id).maybeSingle(),
    ]);

    const renterProfile = renterProfileRes.data;
    const ownerProfile = ownerProfileRes.data;

    if (approved) {
      // Find or create chat conversation for this booking
      let conversationId: string;
      
      const { data: existingConv } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("product_id", booking.product_id)
        .eq("owner_id", booking.owner_id)
        .eq("renter_id", booking.renter_id)
        .single();

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv, error: convError } = await supabase
          .from("chat_conversations")
          .insert({
            product_id: booking.product_id,
            owner_id: booking.owner_id,
            renter_id: booking.renter_id,
            is_booking_confirmed: true,
            booking_id: booking.id,
          })
          .select()
          .single();

        if (convError) {
          console.error("Error creating conversation:", convError);
        } else {
          conversationId = newConv.id;
        }
      }

      // Update conversation to mark booking confirmed
      if (conversationId!) {
        await supabase
          .from("chat_conversations")
          .update({ is_booking_confirmed: true, booking_id: booking.id })
          .eq("id", conversationId);

        // Send system message with contact details to both users
        const contactMessage = `✅ **Payment Verified by Behen.pk!**\n\n👩 **Bari Behen Details:**\nName: ${ownerProfile?.name || 'N/A'}\nPhone: ${ownerProfile?.phone || 'Contact via app'}\n\n👧 **Choti Behen Details:**\nName: ${renterProfile?.name || 'N/A'}\nPhone: ${renterProfile?.phone || 'Contact via app'}\n\n📦 You both can now decide where and how to pick/deliver the dress.\n\n🔗 Check your chat on behen.pk for updates!`;

        await supabase.from("chat_messages").insert({
          conversation_id: conversationId,
          sender_id: booking.owner_id,
          message: contactMessage,
        });
      }

      // Send email to both users
      await sendEmailNotification({
        type: "payment_verification",
        recipientEmail: `renter-${booking.renter_id}@behen.pk`,
        recipientName: renterProfile?.name || "Choti Behen",
        data: {
          productTitle: booking.products?.title,
          verified: true,
        },
      });

      await sendEmailNotification({
        type: "payment_verification",
        recipientEmail: `owner-${booking.owner_id}@behen.pk`,
        recipientName: ownerProfile?.name || "Bari Behen",
        data: {
          productTitle: booking.products?.title,
          verified: true,
        },
      });
    } else {
      // Send rejection email to renter
      await sendEmailNotification({
        type: "payment_verification",
        recipientEmail: `renter-${booking.renter_id}@behen.pk`,
        recipientName: renterProfile?.name || "Choti Behen",
        data: {
          productTitle: booking.products?.title,
          verified: false,
        },
      });
    }

    toast({
      title: approved ? "Payment Verified" : "Payment Rejected",
      description: approved 
        ? "Contact details unlocked and shared in chat. Both users notified."
        : "Choti Behen will be notified to upload correct payment proof.",
    });

    fetchData();
  };

  const handleApproveProduct = async (productId: string, approved: boolean) => {
    const { error } = await supabase
      .from("products")
      .update({ status: approved ? "published" : "rejected" })
      .eq("id", productId);

    if (error) {
      toast({ title: "Error", description: "Failed to update product", variant: "destructive" });
      return;
    }

    toast({
      title: approved ? "Product Approved" : "Product Rejected",
      description: `Product has been ${approved ? "published" : "rejected"}`,
    });

    fetchData();
  };

  const handleAssignRole = async (userId: string, role: string) => {
    if (currentRole !== "super_admin") {
      toast({ title: "Access Denied", description: "Only super admins can assign roles", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: role as any });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Role Exists", description: "User already has this role", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Failed to assign role", variant: "destructive" });
      }
      return;
    }

    toast({ title: "Role Assigned", description: `Successfully assigned ${role} role` });
    fetchData();
  };

  const handleRemoveRole = async (userId: string, role: string) => {
    if (currentRole !== "super_admin") {
      toast({ title: "Access Denied", description: "Only super admins can remove roles", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", role as any);

    if (error) {
      toast({ title: "Error", description: "Failed to remove role", variant: "destructive" });
      return;
    }

    toast({ title: "Role Removed", description: `Successfully removed ${role} role` });
    fetchData();
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user "${userName}"? This will delete ALL their data including products, bookings, chats, and reviews. This action cannot be undone.`)) return;

    if (currentRole !== "super_admin") {
      toast({ title: "Access Denied", description: "Only super admins can delete users", variant: "destructive" });
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('admin-delete-user', {
        body: { userId },
      });

      if (response.error) {
        toast({ title: "Error", description: response.error.message || "Failed to delete user", variant: "destructive" });
        return;
      }

      toast({ title: "User Deleted", description: `User "${userName}" and all their data has been deleted` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete user", variant: "destructive" });
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    if (currentRole !== "super_admin") {
      toast({ title: "Access Denied", description: "Only super admins can change user roles", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast({ title: "Error", description: "Failed to change user role", variant: "destructive" });
      return;
    }

    toast({ title: "Role Changed", description: `User role changed to ${newRole === 'bari' ? 'Bari Behen' : 'Choti Behen'}` });
    fetchData();
  };

  const handleViewUserProfile = async (user: any) => {
    setSelectedUser(user);
    
    // Fetch user's products
    const { data: products } = await supabase
      .from("products")
      .select("*")
      .eq("owner_id", user.user_id)
      .order("created_at", { ascending: false });
    
    setUserProducts(products || []);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete product", variant: "destructive" });
      return;
    }

    toast({ title: "Product Deleted", description: "Product has been removed" });
    
    // Refresh user products
    if (selectedUser) {
      handleViewUserProfile(selectedUser);
    }
    fetchData();
  };

  const handleEditProduct = async (productId: string) => {
    navigate(`/list-dress?edit=${productId}`);
  };

  const handleSendSecurityDeposit = async () => {
    const { booking, recipient, amount, notes } = securityDepositDialog;
    if (!booking || !amount) return;

    const recipientId = recipient === 'owner' ? booking.owner_id : booking.renter_id;
    const recipientName = recipient === 'owner' ? booking.owner_name : booking.renter_name;

    // Update booking with security deposit info
    const { error } = await supabase
      .from("bookings")
      .update({
        admin_notes: `Security deposit of PKR ${amount} sent to ${recipient}. Notes: ${notes || 'N/A'}`,
        booking_status: "completed" as const,
      })
      .eq("id", booking.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update booking", variant: "destructive" });
      return;
    }

    // Send notification
    await sendEmailNotification({
      type: "security_deposit",
      recipientEmail: `user-${recipientId}@behen.pk`,
      recipientName: recipientName,
      data: {
        action: "sent",
        productTitle: booking.products?.title,
        amount: amount,
        notes: notes,
        message: `Your security deposit of PKR ${amount} has been processed.`,
      },
    });

    toast({ title: "Security Deposit Sent", description: `PKR ${amount} sent to ${recipientName}` });
    setSecurityDepositDialog({ open: false, booking: null, recipient: 'renter', amount: '', notes: '' });
    fetchData();
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;

    const { error } = await supabase
      .from("reviews")
      .delete()
      .eq("id", reviewId);

    if (error) {
      toast({ title: "Error", description: "Failed to delete review", variant: "destructive" });
      return;
    }

    toast({ title: "Review Deleted", description: "Review has been removed" });
    fetchData();
  };

  const handleRespondToReview = async () => {
    const { review, response } = reviewResponseDialog;
    if (!review || !response.trim()) return;

    const { error } = await supabase
      .from("reviews")
      .update({
        owner_response: response.trim(),
        owner_response_at: new Date().toISOString(),
      })
      .eq("id", review.id);

    if (error) {
      toast({ title: "Error", description: "Failed to submit response", variant: "destructive" });
      return;
    }

    toast({ title: "Response Submitted", description: "Review response has been added" });
    setReviewResponseDialog({ open: false, review: null, response: '' });
    fetchData();
  };

  const handleToggleAIModel = async (newProvider: "lovable" | "openai") => {
    if (currentRole !== "super_admin") {
      toast({ title: "Access Denied", description: "Only super admins can change AI settings", variant: "destructive" });
      return;
    }

    setUpdatingAIModel(true);
    const newModel = newProvider === "lovable" 
      ? "google/gemini-2.5-flash-image-preview" 
      : "gpt-image-1";

    try {
      const { error } = await supabase
        .from("app_settings")
        .update({ 
          value: { provider: newProvider, model: newModel },
          updated_at: new Date().toISOString(),
          updated_by: currentUser?.id
        })
        .eq("key", "ai_image_model");

      if (error) throw error;

      setAiModelSetting({
        provider: newProvider,
        model: newModel,
        loading: false
      });

      toast({ 
        title: "AI Model Updated", 
        description: `Now using ${newProvider === "lovable" ? "Lovable AI" : "OpenAI"} for image generation` 
      });
    } catch (error: any) {
      console.error("Error updating AI model:", error);
      toast({ title: "Error", description: "Failed to update AI model", variant: "destructive" });
    } finally {
      setUpdatingAIModel(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/admin");
  };

  const getBookingStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-500/20 text-green-400";
      case "confirmed": return "bg-blue-500/20 text-blue-400";
      case "pending_payment": return "bg-yellow-500/20 text-yellow-400";
      case "cancelled": return "bg-red-500/20 text-red-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Admin Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold text-white">Behen.pk Admin</h1>
              <p className="text-xs text-slate-400">Role: {currentRole.replace("_", " ").toUpperCase()}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="border-primary text-primary">
              {currentUser?.email}
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-400 hover:text-white">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Stats Cards */}
          <div className="grid md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-300">Users</CardTitle>
                <Users className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.users}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-300">Products</CardTitle>
                <Package className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.products}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-300">Total Bookings</CardTitle>
                <Calendar className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.bookings}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-300">Active Rentals</CardTitle>
                <ShoppingBag className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-400">{stats.activeRentals}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-300">Completed</CardTitle>
                <Check className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{stats.totalRentals}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-300">Sold</CardTitle>
                <DollarSign className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">{stats.soldProducts}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-slate-300">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-slate-500" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-white">PKR {stats.revenue.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          {/* Management Tabs */}
          <Tabs defaultValue="bookings" className="space-y-4">
            <TabsList className="bg-slate-800 border-slate-700 flex-wrap h-auto gap-1">
              <TabsTrigger value="bookings" className="data-[state=active]:bg-primary">
                Payments ({pendingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="rentals" className="data-[state=active]:bg-primary">
                Rentals ({allBookings.length})
              </TabsTrigger>
              <TabsTrigger value="products" className="data-[state=active]:bg-primary">
                Pending ({pendingProducts.length})
              </TabsTrigger>
              {currentRole === "super_admin" && (
                <TabsTrigger value="all-products" className="data-[state=active]:bg-primary">
                  All Products ({allProducts.length})
                </TabsTrigger>
              )}
              <TabsTrigger value="users" className="data-[state=active]:bg-primary">
                Users ({users.length})
              </TabsTrigger>
              <TabsTrigger value="reviews" className="data-[state=active]:bg-primary">
                Reviews ({allReviews.length})
              </TabsTrigger>
              <TabsTrigger value="chats" className="data-[state=active]:bg-primary">
                Chats ({allChats.length})
              </TabsTrigger>
              {currentRole === "super_admin" && (
                <TabsTrigger value="roles" className="data-[state=active]:bg-primary">
                  <UserCog className="h-4 w-4 mr-1" />
                  Roles
                </TabsTrigger>
              )}
              {currentRole === "super_admin" && (
                <TabsTrigger value="settings" className="data-[state=active]:bg-primary">
                  <Settings className="h-4 w-4 mr-1" />
                  Settings
                </TabsTrigger>
              )}
            </TabsList>

            {/* Pending Payments Tab */}
            <TabsContent value="bookings">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <CreditCard className="h-5 w-5" />
                    Pending Payment Verifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {pendingBookings.map((booking) => (
                        <Card key={booking.id} className="border-amber-500/30 bg-slate-700/50">
                          <CardContent className="pt-6">
                            <div className="flex flex-col lg:flex-row gap-4">
                              {booking.products?.ai_cover_image && (
                                <img
                                  src={booking.products.ai_cover_image}
                                  alt={booking.products.title}
                                  className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                                />
                              )}
                              
                              <div className="flex-1 space-y-2">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="font-semibold text-lg text-white">{booking.products?.title}</h3>
                                    <Badge variant="outline" className="mt-1 border-slate-600 text-slate-300">
                                      Order #{booking.id.slice(0, 8)}
                                    </Badge>
                                  </div>
                                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Payment Submitted</Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-slate-400">Bari Behen</p>
                                    <p className="font-medium text-white">{booking.owner_name}</p>
                                    {booking.owner_phone && <p className="text-xs text-slate-500">{booking.owner_phone}</p>}
                                  </div>
                                  <div>
                                    <p className="text-slate-400">Choti Behen</p>
                                    <p className="font-medium text-white">{booking.renter_name}</p>
                                    {booking.renter_phone && <p className="text-xs text-slate-500">{booking.renter_phone}</p>}
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                                  <div>
                                    <span className="text-slate-500">Dates: </span>
                                    {format(new Date(booking.start_date), "MMM dd")} - {format(new Date(booking.end_date), "MMM dd, yyyy")}
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Rent: </span>
                                    <span className="font-semibold">PKR {Number(booking.total_price).toLocaleString()}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-500">Security: </span>
                                    <span className="font-semibold">PKR {Number(booking.security_deposit).toLocaleString()}</span>
                                  </div>
                                </div>
                                
                                {booking.payment_notes && (
                                  <p className="text-sm bg-slate-600/50 p-2 rounded text-slate-300">
                                    <span className="font-medium">Note: </span>{booking.payment_notes}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex flex-col gap-2 lg:w-32">
                                {booking.payment_proof_url && (
                                  <Button variant="outline" size="sm" onClick={() => setSelectedProof(booking.payment_proof_url)} className="w-full border-slate-600 text-slate-300">
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Proof
                                  </Button>
                                )}
                                <Button size="sm" onClick={() => handleVerifyPayment(booking, true)} className="w-full">
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleVerifyPayment(booking, false)} className="w-full">
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {pendingBookings.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No pending payment verifications</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Rentals Tab */}
            <TabsContent value="rentals">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <ShoppingBag className="h-5 w-5" />
                    Rental Holdings & Completed Rentals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {allBookings.map((booking) => (
                        <Card key={booking.id} className="bg-slate-700/50 border-slate-600">
                          <CardContent className="py-4">
                            <div className="flex items-center gap-4">
                              {booking.products?.ai_cover_image && (
                                <img src={booking.products.ai_cover_image} alt="" className="w-16 h-16 object-cover rounded" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate">{booking.products?.title}</p>
                                <p className="text-sm text-slate-400">{booking.renter_name} ← {booking.owner_name}</p>
                                <p className="text-xs text-slate-500">
                                  {format(new Date(booking.start_date), "MMM dd")} - {format(new Date(booking.end_date), "MMM dd")}
                                </p>
                              </div>
                              <div className="text-right">
                                <Badge className={getBookingStatusColor(booking.booking_status)}>
                                  {booking.booking_status.replace("_", " ")}
                                </Badge>
                                <p className="text-sm text-white mt-1">PKR {Number(booking.total_price).toLocaleString()}</p>
                                <p className="text-xs text-slate-400">+ PKR {Number(booking.security_deposit).toLocaleString()} security</p>
                              </div>
                              {booking.booking_status === "completed" && currentRole === "super_admin" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSecurityDepositDialog({
                                    open: true,
                                    booking,
                                    recipient: 'renter',
                                    amount: String(booking.security_deposit),
                                    notes: '',
                                  })}
                                  className="border-green-500/50 text-green-400"
                                >
                                  <DollarSign className="h-4 w-4 mr-1" />
                                  Send Security
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Products Tab */}
            <TabsContent value="products">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Pending Product Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-4">
                      {pendingProducts.map((product) => (
                        <Card key={product.id} className="bg-slate-700/50 border-slate-600">
                          <CardContent className="pt-6">
                            <div className="flex items-start gap-4">
                              {product.ai_cover_image && (
                                <img src={product.ai_cover_image} alt={product.title} className="w-24 h-24 object-cover rounded" />
                              )}
                              <div className="flex-1">
                                <h3 className="font-semibold text-white">{product.title}</h3>
                                <p className="text-sm text-slate-400">Owner: {product.owner_name}</p>
                                <p className="text-sm text-slate-300">Category: {product.category}</p>
                                <p className="text-sm text-slate-300">Price: PKR {product.rental_price_4days}/4 days</p>
                              </div>
                              <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleApproveProduct(product.id, true)}>
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleApproveProduct(product.id, false)}>
                                  <X className="h-4 w-4 mr-2" />
                                  Reject
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {pendingProducts.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No pending product approvals</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* All Products Tab (Super Admin) */}
            {currentRole === "super_admin" && (
              <TabsContent value="all-products">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Package className="h-5 w-5" />
                      All Products ({allProducts.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-3">
                        {allProducts.map((product) => (
                          <Card key={product.id} className="bg-slate-700/50 border-slate-600">
                            <CardContent className="py-4">
                              <div className="flex items-center gap-4">
                                {product.ai_cover_image && (
                                  <img src={product.ai_cover_image} alt={product.title} className="w-20 h-20 object-cover rounded" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-white truncate">{product.title}</h3>
                                    <Badge variant="outline" className={
                                      product.status === "published" ? "border-green-500/50 text-green-400" :
                                      product.status === "pending" ? "border-yellow-500/50 text-yellow-400" :
                                      "border-red-500/50 text-red-400"
                                    }>
                                      {product.status}
                                    </Badge>
                                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                                      {product.listing_type}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-slate-400">Owner: {product.owner_name}</p>
                                  <div className="flex gap-4 text-sm text-slate-300 mt-1">
                                    <span>Category: {product.category}</span>
                                    <span>Size: {product.size}</span>
                                    <span>Location: {product.city}, {product.area}</span>
                                  </div>
                                  <div className="flex gap-4 text-sm text-slate-400 mt-1">
                                    {product.rental_price_4days && <span>Rent: PKR {product.rental_price_4days}/4 days</span>}
                                    {product.sale_price && <span>Sale: PKR {product.sale_price}</span>}
                                    {product.security_deposit && <span>Security: PKR {product.security_deposit}</span>}
                                  </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => window.open(`/product/${product.id}`, '_blank')}
                                    className="border-slate-600 text-slate-300"
                                  >
                                    <ExternalLink className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleEditProduct(product.id)}
                                    className="border-blue-500/50 text-blue-400"
                                  >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => handleDeleteProduct(product.id)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {allProducts.length === 0 && (
                          <div className="text-center py-12 text-slate-500">
                            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                            <p>No products found</p>
                          </div>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Users Tab */}
            <TabsContent value="users">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    All Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {users.map((user) => (
                        <Card key={user.id} className="bg-slate-700/50 border-slate-600">
                          <CardContent className="py-4">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-white">{user.name}</p>
                                  <Badge variant="outline" className={`border-slate-600 ${user.role === 'bari' ? 'text-pink-400 border-pink-400/50' : 'text-blue-400 border-blue-400/50'}`}>
                                    {user.role === 'bari' ? 'Bari Behen' : 'Choti Behen'}
                                  </Badge>
                                  {user.roles?.map((role: string) => (
                                    <Badge key={role} className="bg-primary/20 text-primary border-primary/30">{role.replace("_", " ")}</Badge>
                                  ))}
                                </div>
                                {user.email && (
                                  <p className="text-sm text-slate-300 flex items-center gap-1 mt-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                  </p>
                                )}
                                <p className="text-sm text-slate-400">{user.phone || "No phone"} • {user.city || "No city"}</p>
                                <p className="text-xs text-slate-500">Joined: {format(new Date(user.created_at), "MMM dd, yyyy")}</p>
                              </div>
                              
                              {currentRole === "super_admin" && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  {/* Role Switch */}
                                  <Select 
                                    value={user.role} 
                                    onValueChange={(value) => handleChangeUserRole(user.user_id, value)}
                                  >
                                    <SelectTrigger className="w-32 bg-slate-600 border-slate-500 text-white text-xs">
                                      <RefreshCw className="h-3 w-3 mr-1" />
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-700 border-slate-600">
                                      <SelectItem value="bari" className="text-white">Bari Behen</SelectItem>
                                      <SelectItem value="choti" className="text-white">Choti Behen</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Button size="sm" variant="ghost" onClick={() => handleViewUserProfile(user)} className="text-slate-300">
                                    <Eye className="h-4 w-4 mr-1" />
                                    View
                                  </Button>
                                  
                                  <Button 
                                    size="sm" 
                                    variant="destructive" 
                                    onClick={() => handleDeleteUser(user.user_id, user.name)}
                                    className="bg-red-500/20 text-red-400 hover:bg-red-500/40"
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" />
                                    Delete
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {users.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No users found</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Star className="h-5 w-5" />
                    All Reviews
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {allReviews.map((review) => (
                        <Card key={review.id} className="bg-slate-700/50 border-slate-600">
                          <CardContent className="py-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-white">{review.products?.title}</p>
                                  <p className="text-sm text-slate-400">By: Choti Behen • To: {review.owner_name}</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star key={star} className={`h-4 w-4 ${star <= review.product_rating ? "fill-yellow-400 text-yellow-400" : "text-slate-600"}`} />
                                    ))}
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="ghost" onClick={() => setReviewResponseDialog({ open: true, review, response: review.owner_response || '' })} className="text-slate-300">
                                    <MessageSquare className="h-4 w-4" />
                                  </Button>
                                  {currentRole === "super_admin" && (
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteReview(review.id)} className="text-red-400">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {review.product_review && (
                                <p className="text-sm text-slate-300 bg-slate-600/30 p-2 rounded">"{review.product_review}"</p>
                              )}
                              {review.owner_response && (
                                <div className="ml-4 p-3 bg-primary/10 border-l-2 border-primary rounded">
                                  <p className="text-xs text-slate-400 mb-1">Bari Behen's Response:</p>
                                  <p className="text-sm text-slate-200">"{review.owner_response}"</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {allReviews.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No reviews yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Chats Tab */}
            <TabsContent value="chats">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <MessageSquare className="h-5 w-5" />
                    All Chats (Recent First)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {allChats.map((chat) => (
                        <Card key={chat.id} className="bg-slate-700/50 border-slate-600">
                          <CardContent className="py-4">
                            <div className="space-y-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-medium text-white">{chat.products?.title || "Direct Chat"}</p>
                                  <p className="text-sm text-slate-400">{chat.renter_name} ↔ {chat.owner_name}</p>
                                  <p className="text-xs text-slate-500">Last active: {format(new Date(chat.updated_at), "MMM dd, hh:mm a")}</p>
                                </div>
                                <Badge variant={chat.is_booking_confirmed ? "default" : "outline"} className={chat.is_booking_confirmed ? "bg-green-500/20 text-green-400" : ""}>
                                  {chat.is_booking_confirmed ? "Booking Confirmed" : "Negotiating"}
                                </Badge>
                              </div>
                              
                              {chat.messages?.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-800/50 rounded p-2">
                                  {chat.messages.slice(0, 5).map((msg: any) => (
                                    <div key={msg.id} className="text-sm">
                                      <span className="text-slate-400">{msg.sender_id === chat.owner_id ? chat.owner_name : chat.renter_name}: </span>
                                      <span className={`${msg.is_moderated ? "text-red-400 line-through" : "text-slate-200"}`}>
                                        {msg.is_moderated ? "[Moderated]" : msg.message}
                                      </span>
                                    </div>
                                  ))}
                                  {chat.messages.length > 5 && (
                                    <p className="text-xs text-slate-500">+ {chat.messages.length - 5} more messages</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {allChats.length === 0 && (
                        <div className="text-center py-12 text-slate-500">
                          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No chats yet</p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Role Management Tab */}
            {currentRole === "super_admin" && (
              <TabsContent value="roles">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <UserCog className="h-5 w-5" />
                      Role Management
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[500px]">
                      <div className="space-y-2">
                        {users.map((user) => (
                          <Card key={user.id} className="bg-slate-700/50 border-slate-600">
                            <CardContent className="py-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium text-white">{user.name}</p>
                                  <p className="text-sm text-slate-400">{user.user_id.slice(0, 8)}...</p>
                                  <div className="flex gap-1 mt-2">
                                    {user.roles?.map((role: string) => (
                                      <Badge 
                                        key={role} 
                                        className="bg-primary/20 text-primary border-primary/30 cursor-pointer hover:bg-red-500/20 hover:text-red-400"
                                        onClick={() => handleRemoveRole(user.user_id, role)}
                                      >
                                        {role.replace("_", " ")} ×
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <Select onValueChange={(value) => handleAssignRole(user.user_id, value)}>
                                  <SelectTrigger className="w-40 bg-slate-600 border-slate-500 text-white">
                                    <SelectValue placeholder="Add Role" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-700 border-slate-600">
                                    <SelectItem value="super_admin" className="text-white">Super Admin</SelectItem>
                                    <SelectItem value="admin" className="text-white">Admin</SelectItem>
                                    <SelectItem value="manager" className="text-white">Manager</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {/* Settings Tab - Super Admin Only */}
            {currentRole === "super_admin" && (
              <TabsContent value="settings">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <Settings className="h-5 w-5" />
                      AI Image Generation Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aiModelSetting.loading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-300">Current Model:</span>
                          <Badge className={aiModelSetting.provider === "lovable" 
                            ? "bg-green-500/20 text-green-400 border-green-500/30" 
                            : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }>
                            {aiModelSetting.provider === "lovable" ? "✨ Lovable AI" : "🔶 OpenAI"}
                          </Badge>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          {/* Lovable AI Card */}
                          <Card className={`border-2 transition-colors cursor-pointer ${
                            aiModelSetting.provider === "lovable" 
                              ? "border-green-500 bg-green-500/10" 
                              : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                          }`}
                          onClick={() => !updatingAIModel && handleToggleAIModel("lovable")}
                          >
                            <CardContent className="py-6">
                              <div className="flex items-center gap-3 mb-3">
                                <Sparkles className="h-8 w-8 text-green-400" />
                                <div>
                                  <h3 className="font-semibold text-white">Lovable AI</h3>
                                  <p className="text-xs text-slate-400">google/gemini-2.5-flash-image-preview</p>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <p className="text-green-400 font-medium">✓ Included in plan</p>
                                <p className="text-slate-300">Cost-efficient image generation</p>
                                <p className="text-slate-400">Best for budget optimization</p>
                              </div>
                              {aiModelSetting.provider === "lovable" && (
                                <Badge className="mt-3 bg-green-500 text-white">Active</Badge>
                              )}
                            </CardContent>
                          </Card>

                          {/* OpenAI Card */}
                          <Card className={`border-2 transition-colors cursor-pointer ${
                            aiModelSetting.provider === "openai" 
                              ? "border-amber-500 bg-amber-500/10" 
                              : "border-slate-600 bg-slate-700/50 hover:border-slate-500"
                          }`}
                          onClick={() => !updatingAIModel && handleToggleAIModel("openai")}
                          >
                            <CardContent className="py-6">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-8 w-8 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                                  AI
                                </div>
                                <div>
                                  <h3 className="font-semibold text-white">OpenAI</h3>
                                  <p className="text-xs text-slate-400">gpt-image-1</p>
                                </div>
                              </div>
                              <div className="space-y-2 text-sm">
                                <p className="text-amber-400 font-medium">~$0.05/image (medium)</p>
                                <p className="text-slate-300">Higher quality output</p>
                                <p className="text-slate-400">Best for premium results</p>
                              </div>
                              {aiModelSetting.provider === "openai" && (
                                <Badge className="mt-3 bg-amber-500 text-white">Active</Badge>
                              )}
                            </CardContent>
                          </Card>
                        </div>

                        {updatingAIModel && (
                          <div className="flex items-center justify-center gap-2 text-slate-300">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Updating AI model...</span>
                          </div>
                        )}

                        <div className="bg-slate-700/50 rounded-lg p-4 mt-4">
                          <h4 className="font-medium text-white mb-2">ℹ️ About AI Image Generation</h4>
                          <p className="text-sm text-slate-400">
                            AI Image Generation creates professional mannequin displays from uploaded dress photos. 
                            Lovable AI (default) is cost-efficient and included in your plan. OpenAI provides 
                            higher quality results at ~$0.05 per image. Switch anytime based on your needs.
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Payment Proof Modal */}
      <Dialog open={!!selectedProof} onOpenChange={() => setSelectedProof(null)}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Payment Proof</DialogTitle>
          </DialogHeader>
          {selectedProof && <img src={selectedProof} alt="Payment Proof" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* User Profile Modal */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">User Profile: {selectedUser?.name}</DialogTitle>
            <DialogDescription className="text-slate-400">
              <div className="space-y-1 mt-1">
                {selectedUser?.email && (
                  <p className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {selectedUser.email}
                  </p>
                )}
                <p>{selectedUser?.phone || "No phone"} • {selectedUser?.city || "N/A"}, {selectedUser?.area || "N/A"}</p>
                <p className="flex items-center gap-2">
                  Role: <Badge variant="outline" className={`${selectedUser?.role === 'bari' ? 'text-pink-400 border-pink-400/50' : 'text-blue-400 border-blue-400/50'}`}>
                    {selectedUser?.role === 'bari' ? 'Bari Behen' : 'Choti Behen'}
                  </Badge>
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <h4 className="font-semibold text-white">Products ({userProducts.length})</h4>
            <div className="grid gap-3">
              {userProducts.map((product) => (
                <Card key={product.id} className="bg-slate-700/50 border-slate-600">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      {product.ai_cover_image && (
                        <img src={product.ai_cover_image} alt="" className="w-16 h-16 object-cover rounded" />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-white">{product.title}</p>
                        <p className="text-sm text-slate-400">{product.category} • {product.status}</p>
                        <p className="text-sm text-slate-300">PKR {product.rental_price_4days}/4 days</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => navigate(`/product/${product.id}`)} className="text-slate-300">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEditProduct(product.id)} className="text-slate-300">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDeleteProduct(product.id)} className="text-red-400">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {userProducts.length === 0 && (
                <p className="text-slate-500 text-center py-4">No products</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Security Deposit Dialog */}
      <Dialog open={securityDepositDialog.open} onOpenChange={(open) => !open && setSecurityDepositDialog({ open: false, booking: null, recipient: 'renter', amount: '', notes: '' })}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Send Security Deposit</DialogTitle>
            <DialogDescription className="text-slate-400">
              Order: {securityDepositDialog.booking?.products?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-slate-300">Send To</label>
              <Select 
                value={securityDepositDialog.recipient} 
                onValueChange={(value: 'owner' | 'renter') => setSecurityDepositDialog(prev => ({ ...prev, recipient: value }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="renter" className="text-white">
                    Choti Behen ({securityDepositDialog.booking?.renter_name})
                  </SelectItem>
                  <SelectItem value="owner" className="text-white">
                    Bari Behen ({securityDepositDialog.booking?.owner_name})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm text-slate-300">Amount (PKR)</label>
              <Input
                type="number"
                value={securityDepositDialog.amount}
                onChange={(e) => setSecurityDepositDialog(prev => ({ ...prev, amount: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            
            <div>
              <label className="text-sm text-slate-300">Notes (optional)</label>
              <Textarea
                value={securityDepositDialog.notes}
                onChange={(e) => setSecurityDepositDialog(prev => ({ ...prev, notes: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Any notes about the deposit..."
              />
            </div>
            
            <Button onClick={handleSendSecurityDeposit} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Send Security Deposit
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Response Dialog */}
      <Dialog open={reviewResponseDialog.open} onOpenChange={(open) => !open && setReviewResponseDialog({ open: false, review: null, response: '' })}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Respond to Review</DialogTitle>
            <DialogDescription className="text-slate-400">
              Product: {reviewResponseDialog.review?.products?.title}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {reviewResponseDialog.review?.product_review && (
              <div className="bg-slate-700/50 p-3 rounded">
                <p className="text-xs text-slate-400 mb-1">Original Review:</p>
                <p className="text-sm text-slate-200">"{reviewResponseDialog.review.product_review}"</p>
              </div>
            )}
            
            <div>
              <label className="text-sm text-slate-300">Your Response</label>
              <Textarea
                value={reviewResponseDialog.response}
                onChange={(e) => setReviewResponseDialog(prev => ({ ...prev, response: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="Write a polite response..."
                rows={4}
              />
            </div>
            
            <Button onClick={handleRespondToReview} className="w-full" disabled={!reviewResponseDialog.response.trim()}>
              <Send className="h-4 w-4 mr-2" />
              Submit Response
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
