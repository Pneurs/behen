import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Upload, MessageCircle, LogIn, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

export const EnhancedHeader = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setUserRole(session.user.user_metadata?.role || "choti");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        setUserRole(session.user.user_metadata?.role || "choti");
      } else {
        setUser(null);
        setUserRole("");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

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
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
            Behen.pk
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Categories</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                    {categories.map((category) => (
                      <li key={category.value}>
                        <NavigationMenuLink asChild>
                          <button
                            onClick={() => handleCategoryClick(category.value)}
                            className={cn(
                              "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground w-full text-left"
                            )}
                          >
                            <div className="text-sm font-medium leading-none">{category.name}</div>
                          </button>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {userRole === "bari" && (
                  <>
                    <Button onClick={() => navigate("/list-dress")} variant="default" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Product
                    </Button>
                    <Button onClick={() => navigate("/dashboard")} variant="outline" size="sm">
                      My Products
                    </Button>
                  </>
                )}
                <Button onClick={() => navigate("/wishlist")} variant="ghost" size="sm">
                  <Heart className="mr-2 h-4 w-4" />
                  Wishlist
                </Button>
                <Button onClick={() => navigate("/chats")} variant="ghost" size="sm">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Chats
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/auth")} variant="default" size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
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
              <div className="space-y-2">
                <h3 className="font-semibold mb-3">Categories</h3>
                {categories.map((category) => (
                  <Button
                    key={category.value}
                    variant="ghost"
                    onClick={() => handleCategoryClick(category.value)}
                    className="w-full justify-start"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2">
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
                        navigate("/wishlist");
                        setMobileOpen(false);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      Wishlist
                    </Button>
                    <Button
                      onClick={() => {
                        navigate("/chats");
                        setMobileOpen(false);
                      }}
                      variant="outline"
                      className="w-full"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Chats
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
