import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Shield } from "lucide-react";

const AdminAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if user has admin role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["super_admin", "admin", "manager"]);

      if (roles && roles.length > 0) {
        navigate("/admin/dashboard");
        return;
      }
    }
    
    setCheckingAuth(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error: signUpError, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin/dashboard`
          }
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          // Check if user has admin role (auto-assigned for ghunvtazeen@gmail.com)
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .in("role", ["super_admin", "admin", "manager"]);

          if (!roles || roles.length === 0) {
            await supabase.auth.signOut();
            toast.error("Access denied. Only authorized emails can register as admin.");
            setLoading(false);
            return;
          }

          toast.success("Admin account created! Welcome to the Admin Panel.");
          navigate("/admin/dashboard");
        }
      } else {
        const { error: signInError, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        // Check if user has admin role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .in("role", ["super_admin", "admin", "manager"]);

        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          toast.error("Access denied. Admin privileges required.");
          setLoading(false);
          return;
        }

        toast.success("Welcome to Admin Panel!");
        navigate("/admin/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
            Admin Panel
          </CardTitle>
          <CardDescription className="text-slate-400">
            Behen.pk Administration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@behen.pk"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pr-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSignUp ? "Create Admin Account" : "Sign In to Admin"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? "Already have an account? Sign In" : "New admin? Create Account"}
            </button>
          </div>
          <div className="mt-4 text-center">
            <a href="/" className="text-sm text-slate-500 hover:text-slate-400">
              ← Back to Behen.pk
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuth;