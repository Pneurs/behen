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
  const [referralCode, setReferralCode] = useState("");
  const [referralError, setReferralError] = useState("");
  const [role, setRole] = useState<"bari" | "choti">(
    (searchParams.get("role") as "bari" | "choti") || "choti"
  );
  const [mode, setMode] = useState<"login" | "signup" | "reset" | "check-email">(
    (searchParams.get("mode") as "login" | "signup" | "reset" | "check-email") || "login"
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  const [pendingPassword, setPendingPassword] = useState("");
  const [verifying, setVerifying] = useState(false);

  // Generate random token for email verification
  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Simple hash function for password storage in verification table
  const simpleHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  };

  // Send custom verification email via our edge function (uses no-reply@behen.pk)
  const sendVerificationEmail = async (emailAddress: string, token: string, type: "signup" | "recovery" = "signup") => {
    const response = await supabase.functions.invoke("send-otp-email", {
      body: {
        email: emailAddress,
        token,
        redirectUrl: `${window.location.origin}/auth`,
        type,
      },
    });

    if (response.error) {
      console.error("Error sending verification email:", response.error);
      throw new Error("Failed to send verification email");
    }
    return response.data;
  };

  // Handle verification link from email - uses database tokens (works across devices)
  const handleVerifyFromLink = async () => {
    const urlToken = searchParams.get("token");
    const urlEmail = searchParams.get("email");

    if (!urlToken || !urlEmail || verifying) return;

    setVerifying(true);
    setLoading(true);

    try {
      // Look up token in database
      const { data: tokenData, error: tokenError } = await supabase
        .from("email_verification_tokens")
        .select("*")
        .eq("email", urlEmail)
        .eq("token", urlToken)
        .gt("expires_at", new Date().toISOString())
        .single();

      if (tokenError || !tokenData) {
        toast.error("Invalid or expired verification link. Please sign up again.");
        setMode("signup");
        setLoading(false);
        setVerifying(false);
        return;
      }

      // Token is valid - sign in the user
      const userData = tokenData.user_data as { password: string; name: string; phone: string; role: string; referred_by: string | null } | null;
      
      if (!userData?.password) {
        toast.error("Verification data is incomplete. Please sign up again.");
        setMode("signup");
        setLoading(false);
        setVerifying(false);
        return;
      }

      // Sign in with the stored credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: urlEmail,
        password: userData.password,
      });

      if (signInError) {
        toast.error("Verification failed. Please sign up again.");
        setMode("signup");
        setLoading(false);
        setVerifying(false);
        return;
      }

      // Mark email as verified in profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ email_verified: true })
          .eq("user_id", user.id);
      }

      // Delete the used token
      await supabase
        .from("email_verification_tokens")
        .delete()
        .eq("email", urlEmail);

      toast.success("Email verified! Welcome to Behen.pk!");
      handlePostLoginRedirect();
    } catch (error: any) {
      console.error("Verification error:", error);
      toast.error(error.message || "Verification failed");
      setMode("signup");
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  useEffect(() => {
    // Check for verification token in URL
    const urlToken = searchParams.get("token");
    const urlEmail = searchParams.get("email");
    
    if (urlToken && urlEmail) {
      handleVerifyFromLink();
      return;
    }

    // Check for password reset in URL hash
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
  }, [navigate, searchParams]);
  
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
        // Resend verification email for existing unverified user
        try {
          const token = generateToken();
          
          // Delete old tokens for this email
          await supabase
            .from("email_verification_tokens")
            .delete()
            .eq("email", email);
          
          // Store new token in database with user data
          await supabase
            .from("email_verification_tokens")
            .insert({
              email,
              token,
              password_hash: simpleHash(password),
              user_data: { password, name, phone, role, referred_by: referrerId },
            });
          
          await sendVerificationEmail(email, token, "signup");
          setPendingEmail(email);
          setMode("check-email");
          toast.success("Verification email resent! Please check your email.");
        } catch (err) {
          toast.error("Failed to resend verification email. Please try again.");
        }
        setLoading(false);
        return;
      }

      // For new users, generate token and store in database (works across devices)
      const token = generateToken();
      
      // Delete any existing tokens for this email
      await supabase
        .from("email_verification_tokens")
        .delete()
        .eq("email", email);
      
      // Store token in database with user credentials
      await supabase
        .from("email_verification_tokens")
        .insert({
          email,
          token,
          password_hash: simpleHash(password),
          user_data: { password, name, phone, role, referred_by: referrerId },
        });
      
      await sendVerificationEmail(email, token, "signup");
      
      setPendingEmail(email);
      setMode("check-email");
      toast.success("Signup successful! Please check your email for the verification link.");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    const emailToResend = pendingEmail;
    
    if (!emailToResend) {
      toast.error("Please sign up again.");
      setMode("signup");
      return;
    }
    
    setLoading(true);
    try {
      // Get existing token data from database
      const { data: existingToken } = await supabase
        .from("email_verification_tokens")
        .select("user_data")
        .eq("email", emailToResend)
        .single();
      
      if (!existingToken) {
        toast.error("Please sign up again.");
        setMode("signup");
        setLoading(false);
        return;
      }
      
      // Generate new token
      const token = generateToken();
      
      // Update token in database
      await supabase
        .from("email_verification_tokens")
        .update({ token, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() })
        .eq("email", emailToResend);
      
      await sendVerificationEmail(emailToResend, token, "signup");
      toast.success("Verification email resent! Check your inbox and spam folder.");
    } catch (error: any) {
      toast.error(error.message || "Failed to resend email");
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
      
      // Check if email is verified in profile
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email_verified")
          .eq("user_id", data.user.id)
          .single();
        
        if (profile && !profile.email_verified) {
          // Sign out user and prompt to verify email
          await supabase.auth.signOut();
          toast.error("Please verify your email first. Check your inbox for the verification link.");
          setLoading(false);
          return;
        }
      }
      
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

  // Check Email Mode (after signup)
  if (mode === "check-email") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <CardTitle className="text-2xl font-bold" style={{ fontFamily: "'Playfair Display', serif" }}>
                Check Your Email
              </CardTitle>
              <CardDescription className="mt-2">
                We've sent a verification link to<br/>
                <span className="font-medium text-foreground">{pendingEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Click the link in the email to verify your account and start using Behen.pk.
              </p>
              <div className="text-center space-y-2">
                <Button 
                  type="button" 
                  variant="outline"
                  className="w-full"
                  onClick={handleResendEmail}
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Resend Email
                </Button>
                <p className="text-xs text-muted-foreground">
                  Can't access email? Contact support: 0332-8133263
                </p>
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-muted-foreground"
                  onClick={() => setMode("login")}
                >
                  ← Back to login
                </Button>
              </div>
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