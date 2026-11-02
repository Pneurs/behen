import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Gift, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import { z } from "zod";
import { useReferralSystemEnabled } from "@/hooks/useReferralSystemEnabled";

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
  const [pendingAccessToken, setPendingAccessToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verifyEmailRequired, setVerifyEmailRequired] = useState(false);
  const { data: referralSettings } = useReferralSystemEnabled();

  // Email verification runs on the server: no passwords are stored in our tables
  const callVerification = async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("email-verification", {
      body: { ...body, redirectUrl: `${window.location.origin}/auth` },
    });
    if (error) {
      let message = "Something went wrong. Please try again.";
      try {
        const ctx = await (error as any).context?.json?.();
        if (ctx?.error) message = ctx.error;
      } catch { /* ignore */ }
      throw new Error(message);
    }
    return data as any;
  };

  // Handle verification link from email - confirms the account and signs the user in
  const handleVerifyFromLink = async () => {
    const urlToken = searchParams.get("token");
    const urlEmail = searchParams.get("email");

    if (!urlToken || !urlEmail || verifying) return;

    setVerifying(true);
    setLoading(true);

    try {
      let result: any;
      try {
        result = await callVerification({ action: "verify", email: urlEmail, token: urlToken });
      } catch {
        toast.error("Invalid or expired verification link. Please sign up again or log in to resend it.");
        setMode("login");
        return;
      }

      if (result?.token_hash) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          token_hash: result.token_hash,
          type: "magiclink",
        });
        if (otpError) {
          toast.success("Email verified! Please log in with your password.");
          setEmail(urlEmail);
          setMode("login");
          return;
        }
      } else {
        toast.success("Email verified! Please log in with your password.");
        setEmail(urlEmail);
        setMode("login");
        return;
      }

      if (result?.referral_bonus) toast.success("🎉 PKR 150 bonus credited to your account!");
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
      // Referral code format check (the server checks the code itself)
      const trimmedCode = role === "bari" ? referralCode.trim().toLowerCase() : "";
      if (trimmedCode && !trimmedCode.startsWith("bari-behen-")) {
        setReferralError("Invalid referral code format. Code should start with 'bari-behen-'");
        setLoading(false);
        return;
      }

      let result: any;
      try {
        result = await callVerification({
          action: "signup",
          email,
          password,
          name,
          phone,
          role,
          referralCode: trimmedCode || undefined,
        });
      } catch (err: any) {
        if (err?.message === "invalid_referral") {
          setReferralError("Invalid referral code");
          setLoading(false);
          return;
        }
        throw err;
      }

      if (result?.status === "exists") {
        let accountType = "";
        if (result.role === "bari") {
          accountType = " as a Bari Behen";
        } else if (result.role === "choti") {
          accountType = " as a Choti Behen";
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

      setPendingEmail(email);
      setMode("check-email");
      toast.success("Please check your email to verify your account.");
    } catch (error: any) {
      toast.error(error.message || "Failed to process signup");
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
      await callVerification({ action: "resend", email: emailToResend });
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
    setVerifyEmailRequired(false);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        const msg = (signInError.message || "").toLowerCase();
        if ((signInError as any).code === "email_not_confirmed" || msg.includes("not confirmed")) {
          setPendingEmail(email);
          setPendingAccessToken("");
          setVerifyEmailRequired(true);
          toast.error("Please verify your email first.");
          setLoading(false);
          return;
        }
        throw signInError;
      }

      // Check if email is verified in profile
      if (data.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email_verified")
          .eq("user_id", data.user.id)
          .single();

        if (profile && !profile.email_verified) {
          // Keep a short-lived proof of sign-in so we can resend the link, then sign out on this device
          setPendingAccessToken(data.session?.access_token || "");
          await supabase.auth.signOut({ scope: "local" });
          setPendingEmail(email);
          setVerifyEmailRequired(true);
          toast.error("Please verify your email first.");
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

  // Handle resend verification for existing users who haven't verified yet
  const handleResendVerificationForExistingUser = async () => {
    if (!pendingEmail) {
      toast.error("Please enter your email and try logging in again.");
      setVerifyEmailRequired(false);
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("email-verification", {
        body: { action: "resend", email: pendingEmail, redirectUrl: `${window.location.origin}/auth` },
        ...(pendingAccessToken ? { headers: { Authorization: `Bearer ${pendingAccessToken}` } } : {}),
      });
      if (error) throw new Error("Failed to resend verification email");
      toast.success("Verification email sent! Please check your inbox.");
    } catch (error: any) {
      console.error("Error resending verification:", error);
      toast.error(error.message || "Failed to resend verification email");
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
              {verifyEmailRequired ? (
                <div className="space-y-4">
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <h3 className="font-semibold text-amber-800">Email Verification Required</h3>
                    </div>
                    <p className="text-sm text-amber-700 mb-2">
                      Please verify your email to continue. We'll send a verification link to:
                    </p>
                    <p className="font-medium text-amber-900">{pendingEmail}</p>
                  </div>
                  <Button 
                    type="button"
                    className="w-full"
                    onClick={handleResendVerificationForExistingUser}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Resend Verification Email
                  </Button>
                  <Button 
                    type="button" 
                    variant="link" 
                    className="w-full text-sm text-muted-foreground"
                    onClick={() => {
                      setVerifyEmailRequired(false);
                      setPendingEmail("");
                    }}
                  >
                    ← Back to login
                  </Button>
                </div>
              ) : (
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
              )}
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-base sm:text-sm">Name <span className="text-destructive">*</span></Label>
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
                  <Label htmlFor="signup-email" className="text-base sm:text-sm">Email <span className="text-destructive">*</span></Label>
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
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="phone" className="text-base sm:text-sm">Phone Number <span className="text-destructive">*</span></Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[250px] text-center">
                          <p>Preferably your WhatsApp number. This will be public and customers will contact you on this number.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="03XX-XXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    minLength={11}
                  />
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
                {role === "bari" && referralSettings?.referralSystemEnabled && (
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