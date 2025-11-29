import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Plus } from "lucide-react";
import { toast } from "sonner";

const Browse = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
  };

  const userRole = user?.user_metadata?.role || "choti";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={{ fontFamily: "'Playfair Display', serif" }}>
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

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="text-center py-20">
          <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
            Welcome, {user?.user_metadata?.name || "Behen"}!
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            {userRole === "bari" 
              ? "Ready to list your beautiful dresses?" 
              : "Start browsing amazing bridal and formal wear"}
          </p>
          <div className="bg-card p-8 rounded-2xl shadow-sm max-w-2xl mx-auto">
            <p className="text-muted-foreground">
              The marketplace is coming soon! In the next steps, we'll add:
            </p>
            <ul className="mt-4 space-y-2 text-left">
              <li>✨ Browse dresses with filters and search</li>
              <li>📍 Map view with location-based search</li>
              <li>💬 Secure in-app chat</li>
              <li>📅 Availability calendar</li>
              <li>🤖 AI-generated cover images</li>
              <li>👗 Complete listing creation</li>
              <li>🛡️ Admin dashboard</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Browse;
