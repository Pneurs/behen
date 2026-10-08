import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const otpSchema = z.string().length(6, "OTP must be 6 digits");

// Allowed admin email domains (woofe.org allowed internally but not shown to users)
const ALLOWED_ADMIN_DOMAINS = ["behen.pk", "woofe.org"];

const isAllowedAdminDomain = (email: string): boolean => {
  const domain = email.split("@")[1]?.toLowerCase();
  return ALLOWED_ADMIN_DOMAINS.includes(domain);
};

// User-facing domain restriction message (only shows behen.pk)
const ADMIN_DOMAIN_ERROR_MESSAGE = "Only @behen.pk email addresses can register as admin";

// Generate a random 6-digit OTP
const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send custom OTP email via edge function
const sendCustomOtpEmail = async (email: string, otp: string): Promise<boolean> => {
  try {
    const { error } = await supabase.functions.invoke("send-otp-email", {
      body: { email, otp },
    });

    if (error) {
      console.error("Error sending OTP email:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Error invoking send-otp-email function:", error);
    return false;
  }
};

const AdminAuth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [mode, setMode] = useState<"auth" | "reset" | "verify-otp">("auth");
  const [pendingEmail, setPendingEmail] = useState("");
  const [storedOtp, setStoredOtp] = useState("");

  useEffect(() => {
    // Check for password reset in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    
    if (type === "recovery") {
      setMode("reset");
      setCheckingAuth(false);
      return;
    }

    checkAdminSession();
  }, []);

  const checkAdminSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["super_admin", "admin", "manager", "social_media_manager"]);

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
        // Validate email domain for signup
        if (!isAllowedAdminDomain(email)) {
          toast.error(ADMIN_DOMAIN_ERROR_MESSAGE);
          setLoading(false);
          return;
        }

        // Create user with Supabase (email confirmation disabled, we use custom OTP)
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/admin/dashboard`
          }
        });

        if (signUpError) throw signUpError;

        // Generate and send custom OTP
        const newOtp = generateOtp();
        const emailSent = await sendCustomOtpEmail(email, newOtp);

        if (!emailSent) {
          toast.error("Failed to send verification code. Please try again.");
          setLoading(false);
          return;
        }

        // Store OTP locally for verification
        setStoredOtp(newOtp);
        setPendingEmail(email);
        setMode("verify-otp");
        toast.success("Verification code sent to your email!");
      } else {
        const { error: signInError, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

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
      // Handle "already registered" case - resend OTP
      if (error.message?.includes("already registered") || error.message?.includes("already been registered")) {
        const newOtp = generateOtp();
        const emailSent = await sendCustomOtpEmail(email, newOtp);
        
        if (emailSent) {
          setStoredOtp(newOtp);
          setPendingEmail(email);
          setMode("verify-otp");
          toast.success("Verification code resent to your email!");
        } else {
          toast.error("Failed to send verification code. Please try again.");
        }
      } else {
        toast.error(error.message || "Authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpValidation = otpSchema.safeParse(otp);
    if (!otpValidation.success) {
      toast.error(otpValidation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      // Verify OTP locally first
      if (otp !== storedOtp) {
        toast.error("Invalid verification code");
        setLoading(false);
        return;
      }

      // OTP is correct, now verify with Supabase
      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otp,
        type: "signup",
      });

      if (error) {
        // If Supabase OTP verification fails, try signing in directly
        // (user might already be verified)
        const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
          email: pendingEmail,
          password,
        });

        if (signInError) {
          toast.error("Verification failed. Please try again.");
          setLoading(false);
          return;
        }

        // Check admin role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", signInData.user.id)
          .in("role", ["super_admin", "admin", "manager"]);

        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          toast.error("Access denied. Only authorized emails can register as admin.");
          setMode("auth");
          return;
        }

        toast.success("Email verified! Welcome to Admin Panel!");
        navigate("/admin/dashboard");
        return;
      }
      
      if (data.user) {
        // Check if user has admin role
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id)
          .in("role", ["super_admin", "admin", "manager"]);

        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          toast.error(ADMIN_DOMAIN_ERROR_MESSAGE);
          setMode("auth");
          return;
        }

        toast.success("Email verified! Welcome to Admin Panel!");
        navigate("/admin/dashboard");
      }
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      toast.error(passwordValidation.error.errors[0].message);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;
      
      toast.success("Password updated successfully!");
      window.location.hash = "";
      setMode("auth");
      setPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      toast.error(error.message || "Failed to update password");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/admin`,
      });
      
      if (error) throw error;
      toast.success("Password reset link sent to your email!");
    } catch (error: any) {
      toast.error(error.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      // Generate and send new OTP via custom edge function
      const newOtp = generateOtp();
      const emailSent = await sendCustomOtpEmail(pendingEmail, newOtp);
      
      if (!emailSent) {
        toast.error("Failed to resend verification code");
        return;
      }
      
      setStoredOtp(newOtp);
      toast.success("Verification code resent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code");
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

  // Password Reset Mode
  if (mode === "reset") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Reset Password
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter your new password
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-slate-300">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
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
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-slate-300">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
            <div className="mt-4 text-center">
              <a href="/" className="text-sm text-slate-500 hover:text-slate-400">
                ← Back to Behen.pk
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // OTP Verification Mode
  if (mode === "verify-otp") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-slate-700 bg-slate-800/50 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-3xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif" }}>
              Verify Email
            </CardTitle>
            <CardDescription className="text-slate-400">
              Enter the 6-digit code sent to {pendingEmail}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-slate-300">Verification Code</Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  maxLength={6}
                  className="text-center text-2xl tracking-widest bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Verify Email
              </Button>
              <div className="text-center space-y-2">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-slate-400 hover:text-slate-300"
                  onClick={handleResendOtp}
                  disabled={loading}
                >
                  Didn't receive code? Resend
                </Button>
                <br />
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-slate-400 hover:text-slate-300"
                  onClick={() => { setMode("auth"); setIsSignUp(false); }}
                >
                  ← Back to login
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
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
              {isSignUp && (
                <p className="text-xs text-slate-500">
                  Only @behen.pk or @woofe.org emails can register
                </p>
              )}
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
            {!isSignUp && (
              <Button 
                type="button" 
                variant="link" 
                className="w-full text-sm text-slate-400 hover:text-slate-300"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot password?
              </Button>
            )}
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
