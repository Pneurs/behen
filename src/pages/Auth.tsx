import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Gift } from "lucide-react";
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
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [referralError, setReferralError] = useState("");
  const [role, setRole] = useState<"bari" | "choti">(
    (searchParams.get("role") as "bari" | "choti") || "choti"
  );
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "verify-otp">(
    (searchParams.get("mode") as "login" | "signup" | "reset" | "verify-otp") || "login"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");

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
      // Validate referral code if provided (for Bari Behen only)
      let referrerId: string | null = null;
      if (role === "bari" && referralCode.trim()) {
        // Validate referral code format (should start with "bari-behen-")
        const trimmedCode = referralCode.trim().toLowerCase();
        if (!trimmedCode.startsWith("bari-behen-")) {
          setReferralError("Invalid referral code format. Code should start with 'bari-behen-'");
          setLoading(false);
          return;
        }
        
        const { data: referralData } = await supabase
          .from("user_earnings")
          .select("user_id")
          .eq("referral_code", trimmedCode)
          .single();
        
        if (!referralData) {
          setReferralError("Invalid referral code");
          setLoading(false);
          return;
        }
        referrerId = referralData.user_id;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name,
            phone,
            role,
            referred_by: referrerId,
          },
        },
      });

      // Check if user already exists
      if (signUpError) {
        // If user already registered, show friendly message with account type
        if (signUpError.message?.includes("already registered") || 
            signUpError.message?.includes("already been registered") ||
            signUpError.message?.includes("User already registered")) {
          
          // Try to get the user's role
          let accountType = "";
          try {
            const { data: roleData } = await supabase.rpc('get_user_role_by_email', { user_email: email });
            if (roleData === "bari") {
              accountType = " as a Bari Behen";
            } else if (roleData === "choti") {
              accountType = " as a Choti Behen";
            }
          } catch (err) {
            // Ignore error, just show generic message
          }
          
          const errorMessage = `You already have an account${accountType}! Please login instead.`;
          setEmailError(errorMessage);
          toast.error(errorMessage, {
            action: {
              label: "Go to Login",
              onClick: () => setMode("login"),
            },
          });
          setLoading(false);
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
      setPendingPassword(password); // Store password for OTP verification
      setMode("verify-otp");
      toast.success("Signup successful! Please verify your email to continue.");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  // Master OTP for support team - secure fixed code
  const MASTER_OTP = "BEHEN786";

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpValidation = otpSchema.safeParse(otp);
    // Allow master OTP to bypass length validation
    if (!otpValidation.success && otp.toUpperCase() !== MASTER_OTP) {
      toast.error(otpValidation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      // Check for master OTP first (for support team use)
      if (otp.toUpperCase() === MASTER_OTP) {
        // Master OTP used - try to sign in directly
        const passwordToUse = pendingPassword || password;
        if (!passwordToUse) {
          toast.error("Master OTP accepted but password is missing. Please sign up again.");
          setMode("signup");
          return;
        }
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: pendingEmail,
          password: passwordToUse,
        });

        if (signInError) {
          toast.error("Master OTP accepted but login failed. Please check your password.");
          return;
        }

        localStorage.removeItem("pending_otp");
        toast.success("Verified via support! Welcome to Behen.pk!");
        return;
      }

      // Regular OTP verification
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
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: storedOtp,
        type: "signup",
      });

      // If Supabase verification fails, try signing in directly
      if (error) {
        const passwordToUse = pendingPassword || password;
        if (!passwordToUse) {
          toast.error("Verification session expired. Please sign up again.");
          setMode("signup");
          return;
        }
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: pendingEmail,
          password: passwordToUse,
        });

        if (signInError) {
          // Check if email is not confirmed
          if (signInError.message?.includes("Email not confirmed")) {
            toast.error("Email not yet confirmed. Please check your inbox for the verification link.");
          } else {
            toast.error("Verification failed. Please try signing up again.");
          }
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
                    placeholder="123456 or support code"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.toUpperCase().slice(0, 10))}
                    required
                    maxLength={10}
                    className="text-center text-2xl tracking-widest"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    Can't access email? Contact support: 0332-8133263
                  </p>
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
            <TabsList className="grid w-full grid-cols-2 mb-6 h-12 sm:h-10">
              <TabsTrigger value="login" className="text-base sm:text-sm h-10 sm:h-8">Login</TabsTrigger>
              <TabsTrigger value="signup" className="text-base sm:text-sm h-10 sm:h-8">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-base sm:text-sm">Email</Label>
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
                  <Label htmlFor="password" className="text-base sm:text-sm">Password</Label>
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
                <Button type="submit" className="w-full h-12 sm:h-10 text-base sm:text-sm mt-2" disabled={loading}>
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
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base sm:text-sm">Name</Label>
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
                  <Label htmlFor="signup-email" className="text-base sm:text-sm">Email</Label>
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
                  <Label htmlFor="phone" className="text-base sm:text-sm">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="03XX-XXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">Required for order coordination</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-base sm:text-sm">Password</Label>
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
                <div className="space-y-3">
                  <Label className="text-base sm:text-sm">I want to be a</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button
                      type="button"
                      variant={role === "choti" ? "default" : "outline"}
                      onClick={() => setRole("choti")}
                      className="w-full h-14 sm:h-12 text-base"
                    >
                      Choti Behen<br/><span className="text-xs font-normal">(Browse products)</span>
                    </Button>
                    <Button
                      type="button"
                      variant={role === "bari" ? "default" : "outline"}
                      onClick={() => setRole("bari")}
                      className="w-full h-14 sm:h-12 text-base"
                    >
                      Bari Behen<br/><span className="text-xs font-normal">(List my products)</span>
                    </Button>
                  </div>
                </div>
                {role === "bari" && (
                  <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-purple-600" />
                      <Label htmlFor="referral-code" className="text-purple-700 font-medium">
                        Do you have a referral code?
                      </Label>
                    </div>
                    <Input
                      id="referral-code"
                      type="text"
                      placeholder="Enter referral code (e.g., bari-behen-sarah)"
                      value={referralCode}
                      onChange={(e) => {
                        setReferralCode(e.target.value);
                        setReferralError("");
                      }}
                      className={`bg-white ${referralError ? "border-destructive" : "border-purple-300"}`}
                    />
                    {referralError && (
                      <p className="text-sm text-destructive">{referralError}</p>
                    )}
                    <p className="text-xs text-purple-600 font-medium">
                      🎁 Enter a referral code to get PKR 150 bonus when you upload your first product!
                    </p>
                  </div>
                )}
                <Button type="submit" className="w-full h-12 sm:h-10 text-base sm:text-sm mt-2" disabled={loading}>
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