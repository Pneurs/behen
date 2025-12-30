import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Upload, MessageCircle, LogIn, Heart, CalendarDays, LogOut, Shield, Wallet, User, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HeaderSearchPopup } from "./HeaderSearchPopup";
import { NotificationBell } from "./NotificationBell";
import { useChatEnabled } from "@/hooks/useChatEnabled";
import { useAuth } from "@/contexts/AuthContext";
import { useEarnings } from "@/hooks/useEarnings";
import { useBranding } from "@/hooks/useBranding";

export const EnhancedHeader = () => {
  const navigate = useNavigate();
  const { user, userRole, isAdmin, signOut } = useAuth();
  const { earnings } = useEarnings();
  const { data: branding } = useBranding();

  const [userName, setUserName] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const { chatEnabled } = useChatEnabled();

  useEffect(() => {
    if (!user) {
      setUserName("");
      setUnreadCount(0);
      setWishlistCount(0);
      return;
    }

    const userId = user.id;

    // Defer any DB calls (avoid doing them in auth callbacks)
    const t = setTimeout(() => {
      Promise.all([
        fetchUnreadCount(userId),
        fetchWishlistCount(userId),
        fetchUserName(userId),
      ]);
    }, 0);

    return () => clearTimeout(t);
  }, [user]);

  const fetchUserName = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("name")
        .eq("user_id", userId)
        .single();
      setUserName(data?.name || "");
    } catch (error) {
      console.error("Error fetching user name:", error);
    }
  };

  // Subscribe to new messages for unread count
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('header-unread-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          // If the message is not from the current user, increment unread count
          if ((payload as any).new?.sender_id !== user.id) {
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchUnreadCount = async (userId: string) => {
    try {
      // Get conversations where user is participant
      const { data: conversations } = await supabase
        .from("chat_conversations")
        .select("id, owner_id, renter_id")
        .or(`renter_id.eq.${userId},owner_id.eq.${userId}`);

      if (!conversations || conversations.length === 0) {
        setUnreadCount(0);
        return;
      }

      // Get messages from others in these conversations from the last 24 hours
      const convIds = conversations.map(c => c.id);
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .neq("sender_id", userId)
        .gte("created_at", oneDayAgo);

      setUnreadCount(count || 0);
    } catch (error) {
      console.error("Error fetching unread count:", error);
    }
  };

  const fetchWishlistCount = async (userId: string) => {
    try {
      const { count } = await supabase
        .from("wishlists")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      setWishlistCount(count || 0);
    } catch (error) {
      console.error("Error fetching wishlist count:", error);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
    navigate("/");
    setMobileOpen(false);
  };

  const categories = [
    { name: "Bridal", value: "bridal" },
    { name: "Barat", value: "barat" },
    { name: "Walima", value: "walima" },
    { name: "Formal", value: "formal" },
    { name: "Party Wear", value: "party_wear" },
    { name: "Footwear", value: "footwear" },
    { name: "Accessories", value: "accessories" },
    { name: "Jewelry", value: "jewelry" },
    { name: "Bags", value: "bags" },
  ];

  const handleCategoryClick = (category: string) => {
    navigate(`/browse?category=${category}`);
    setMobileOpen(false);
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 relative z-50">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex flex-col items-start">
          {branding?.logoType === 'image' && branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="h-10 object-contain" />
          ) : (
            <>
              <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
                Behen.pk
              </span>
              <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>بہنیں تو سب شیئر کرتی ہیں</span>
            </>
          )}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-3">
          <HeaderSearchPopup />
          <Button onClick={() => navigate("/earn-money")} variant="ghost" size="sm" className="text-primary">
            <Wallet className="mr-2 h-4 w-4" />
            Earn Money
          </Button>
          
          {user ? (
            <>
              <NotificationBell userId={user.id} />
              <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="relative gap-2">
                  <User className="h-4 w-4" />
                  <span className="max-w-[100px] truncate">
                    {userName || user.email?.split('@')[0] || "Account"}
                  </span>
                  <ChevronDown className="h-3 w-3" />
                  {(unreadCount > 0 || wishlistCount > 0) && (
                    <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs bg-primary text-primary-foreground">
                      {(unreadCount + wishlistCount) > 99 ? "99+" : unreadCount + wishlistCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background border shadow-lg z-50">
                <DropdownMenuItem onClick={() => navigate("/profile")} className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  View Profile
                </DropdownMenuItem>
                {userRole === "bari" && (
                  <DropdownMenuItem 
                    onClick={() => navigate("/dashboard")} 
                    className="cursor-pointer bg-gradient-to-r from-primary/10 to-primary/5"
                  >
                    <Wallet className="mr-2 h-4 w-4 text-primary" />
                    <span className="flex-1">Your Balance</span>
                    <span className="font-semibold text-primary">
                      PKR {earnings?.balance?.toLocaleString() || 0}
                    </span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {userRole === "bari" && (
                  <>
                    <DropdownMenuItem onClick={() => navigate("/list-dress")} className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Product
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")} className="cursor-pointer">
                      My Products
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate("/my-bookings")} className="cursor-pointer">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  My Bookings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/wishlist")} className="cursor-pointer">
                  <Heart className="mr-2 h-4 w-4" />
                  Wishlist
                  {wishlistCount > 0 && (
                    <Badge className="ml-auto h-5 min-w-5 px-1 text-xs bg-primary text-primary-foreground">
                      {wishlistCount > 99 ? "99+" : wishlistCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
                {chatEnabled && (
                  <DropdownMenuItem onClick={() => { navigate("/chats"); setUnreadCount(0); }} className="cursor-pointer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Chats
                    {unreadCount > 0 && (
                      <Badge className="ml-auto h-5 min-w-5 px-1 text-xs bg-primary text-primary-foreground">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Badge>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")} className="cursor-pointer">
                    <Shield className="mr-2 h-4 w-4" />
                    Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </>
          ) : (
            <Button onClick={() => navigate("/auth")} variant="default" size="sm">
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          )}
        </div>
        {/* Mobile Navigation */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <div className="flex flex-col gap-4 mt-8">
              {/* User Info at top */}
              {user && (
                <div className="flex items-center gap-3 pb-4 border-b">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {userName || user.email?.split('@')[0] || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                {user && (
                  <Button
                    onClick={() => {
                      navigate("/profile");
                      setMobileOpen(false);
                    }}
                    variant="default"
                    className="w-full"
                  >
                    <User className="mr-2 h-4 w-4" />
                    View Profile
                  </Button>
                )}
                
                {user && userRole === "bari" && (
                  <Button
                    onClick={() => {
                      navigate("/dashboard");
                      setMobileOpen(false);
                    }}
                    variant="outline"
                    className="w-full bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20"
                  >
                    <Wallet className="mr-2 h-4 w-4 text-primary" />
                    <span className="flex-1 text-left">Your Balance</span>
                    <span className="font-semibold text-primary">
                      PKR {earnings?.balance?.toLocaleString() || 0}
                    </span>
                  </Button>
                )}
                
                <Button
                  onClick={() => {
                    navigate("/earn-money");
                    setMobileOpen(false);
                  }}
                  variant="ghost"
                  className="w-full justify-start text-primary"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Earn Money
                </Button>
                {user ? (
                  <>
                    {userRole === "bari" && (
                      <>
                        <Button
                          onClick={() => {
                            navigate("/list-dress");
                            setMobileOpen(false);
                          }}
                          className="w-full"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          Upload Product
                        </Button>
                        <Button
                          onClick={() => {
                            navigate("/dashboard");
                            setMobileOpen(false);
                          }}
                          variant="outline"
                          className="w-full"
                        >
                          My Products
                        </Button>
                      </>
                    )}
                    <Button
                      onClick={() => {
                        navigate("/my-bookings");
                        setMobileOpen(false);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <CalendarDays className="mr-2 h-4 w-4" />
                      My Bookings
                    </Button>
                    <Button
                      onClick={() => {
                        navigate("/wishlist");
                        setMobileOpen(false);
                      }}
                      variant="outline"
                      className="w-full relative"
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                      {wishlistCount > 0 && (
                        <Badge className="ml-2 h-5 min-w-5 px-1 text-xs bg-primary text-primary-foreground">
                          {wishlistCount > 99 ? "99+" : wishlistCount}
                        </Badge>
                      )}
                    </Button>
                    {chatEnabled && (
                      <Button
                        onClick={() => {
                          navigate("/chats");
                          setMobileOpen(false);
                          setUnreadCount(0);
                        }}
                        variant="outline"
                        className="w-full relative"
                      >
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Chats
                        {unreadCount > 0 && (
                          <Badge className="ml-2 h-5 min-w-5 px-1 text-xs bg-primary text-primary-foreground">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </Badge>
                        )}
                      </Button>
                    )}
                    {isAdmin && (
                      <Button
                        onClick={() => {
                          navigate("/admin");
                          setMobileOpen(false);
                        }}
                        variant="secondary"
                        className="w-full"
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        Admin
                      </Button>
                    )}
                    <Button
                      onClick={handleSignOut}
                      variant="outline"
                      className="w-full"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => {
                      navigate("/auth");
                      setMobileOpen(false);
                    }}
                    className="w-full"
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    Sign In
                  </Button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};