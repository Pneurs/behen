import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import { z } from "zod";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const otpSchema = z.string().length(6, "OTP must be 6 digits");
const emailSchema = z.string().email("Please enter a valid email address");

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [role, setRole] = useState<"bari" | "choti">(
    (searchParams.get("role") as "bari" | "choti") || "choti"
  );
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "verify-otp">(
    (searchParams.get("mode") as "login" | "signup" | "reset" | "verify-otp") || "login"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  useEffect(() => {
    // Check for password reset or email verification in URL hash
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const type = hashParams.get("type");
    
    if (type === "recovery") {
      setMode("reset");
      return;
    }

    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        handlePostLoginRedirect();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        handlePostLoginRedirect();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handlePostLoginRedirect = () => {
    const redirectTo = localStorage.getItem("auth_redirect");
    const redirectProductId = localStorage.getItem("auth_redirect_product");
    
    if (redirectTo && redirectProductId) {
      localStorage.removeItem("auth_redirect");
      localStorage.removeItem("auth_redirect_product");
      navigate(`${redirectTo}?product=${redirectProductId}`);
    } else if (redirectTo) {
      localStorage.removeItem("auth_redirect");
      navigate(redirectTo);
    } else {
      navigate("/browse");
    }
  };

  const [emailError, setEmailError] = useState("");

  // Helper function to send OTP via custom edge function
  const sendCustomOtpEmail = async (emailAddress: string) => {
    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in localStorage with expiry (for verification)
    const otpData = {
      otp,
      email: emailAddress,
      expiry: Date.now() + 3600000, // 1 hour expiry
    };
    localStorage.setItem("pending_otp", JSON.stringify(otpData));
    
    // Send OTP via custom edge function
    const { error } = await supabase.functions.invoke("send-otp-email", {
      body: { email: emailAddress, otp },
    });
    
    if (error) {
      console.error("Error sending OTP email:", error);
      throw new Error("Failed to send verification email");
    }
    
    return otp;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    
    // Validate email format
    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      setEmailError(emailValidation.error.errors[0].message);
      toast.error(emailValidation.error.errors[0].message);
      return;
    }

    // Validate password
    const passwordValidation = passwordSchema.safeParse(password);
    if (!passwordValidation.success) {
      toast.error(passwordValidation.error.errors[0].message);
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name,
            role,
          },
        },
      });

      // Check if user already exists but not confirmed
      if (signUpError) {
        // If user already registered, try to resend OTP
        if (signUpError.message?.includes("already registered") || 
            signUpError.message?.includes("already been registered")) {
          // Send custom OTP email
          try {
            await sendCustomOtpEmail(email);
            setPendingEmail(email);
            setMode("verify-otp");
            toast.success("Verification code resent! Please check your email.");
          } catch (err) {
            toast.error("This email is already registered. Please try logging in.");
          }
          return;
        }
        throw signUpError;
      }

      // Check if user exists but email not confirmed (identities array is empty)
      if (data?.user?.identities?.length === 0) {
        // Send custom OTP email for existing unverified user
        try {
          await sendCustomOtpEmail(email);
          setPendingEmail(email);
          setMode("verify-otp");
          toast.success("Verification code resent! Please check your email.");
        } catch (err) {
          toast.error("Failed to resend verification code. Please try again.");
        }
        return;
      }

      // Send custom OTP email for new user
      await sendCustomOtpEmail(email);
      setPendingEmail(email);
      setMode("verify-otp");
      toast.success("Signup successful! Please verify your email to continue.");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
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
      // First verify with our stored OTP
      const storedOtpData = localStorage.getItem("pending_otp");
      if (!storedOtpData) {
        toast.error("Verification session expired. Please sign up again.");
        setMode("signup");
        return;
      }

      const { otp: storedOtp, email: storedEmail, expiry } = JSON.parse(storedOtpData);
      
      if (Date.now() > expiry) {
        localStorage.removeItem("pending_otp");
        toast.error("Verification code expired. Please request a new one.");
        return;
      }

      if (storedEmail !== pendingEmail || storedOtp !== otp) {
        toast.error("Invalid verification code");
        return;
      }

      // OTP is valid, now verify with Supabase using the same token
      // Since we're using custom OTP, we need to sign in the user directly
      // The user account was created during signup, we just need to confirm it
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: storedOtp,
        type: "signup",
      });

      // If Supabase verification fails, try signing in directly
      // (the account might already be created but not verified)
      if (error) {
        // Try to get the session by signing in
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: pendingEmail,
          password: password,
        });

        if (signInError) {
          // If sign in also fails, show error
          toast.error("Verification failed. Please try signing up again.");
          return;
        }
      }

      localStorage.removeItem("pending_otp");
      toast.success("Email verified! Welcome to Behen.pk!");
    } catch (error: any) {
      toast.error(error.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      toast.success("Welcome back!");
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in");
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
      setMode("login");
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
      toast.error("Please enter your email address");
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
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
      await sendCustomOtpEmail(pendingEmail);
      toast.success("Verification code resent!");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  // Password Reset Mode
  if (mode === "reset") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={{ fontFamily: "'Playfair Display', serif" }}>
                Reset Password
              </CardTitle>
              <CardDescription>
                Enter your new password
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // OTP Verification Mode
  if (mode === "verify-otp") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={{ fontFamily: "'Playfair Display', serif" }}>
                Verify Email
              </CardTitle>
              <CardDescription>
                Enter the 6-digit code sent to {pendingEmail}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    required
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
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
                    className="text-sm text-muted-foreground"
                    onClick={handleResendOtp}
                    disabled={loading}
                  >
                    Didn't receive code? Resend
                  </Button>
                  <br />
                  <Button 
                    type="button" 
                    variant="link" 
                    className="text-sm text-muted-foreground"
                    onClick={() => setMode("login")}
                  >
                    ← Back to login
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent" style={{ fontFamily: "'Playfair Display', serif" }}>
            Behen.pk
          </CardTitle>
          <CardDescription>
            {mode === "login" ? "Welcome back!" : "Join our community"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(v) => setMode(v as "login" | "signup")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
                <Button 
                  type="button" 
                  variant="link" 
                  className="w-full text-sm text-muted-foreground"
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  Forgot password?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError("");
                    }}
                    required
                    className={emailError ? "border-destructive" : ""}
                  />
                  {emailError && (
                    <p className="text-sm text-destructive">{emailError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>I want to be a</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={role === "choti" ? "default" : "outline"}
                      onClick={() => setRole("choti")}
                      className="w-full"
                    >
                      Choti Behen<br/><span className="text-xs font-normal">(Browse products)</span>
                    </Button>
                    <Button
                      type="button"
                      variant={role === "bari" ? "default" : "outline"}
                      onClick={() => setRole("bari")}
                      className="w-full"
                    >
                      Bari Behen<br/><span className="text-xs font-normal">(List my products)</span>
                    </Button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default Auth;