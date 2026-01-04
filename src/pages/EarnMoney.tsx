import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Gift, Users, Upload, ArrowRight, Wallet, CheckCircle2, Copy, Share2 } from "lucide-react";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { supabase } from "@/integrations/supabase/client";
import { useEarnings } from "@/hooks/useEarnings";
import { useEarningsPromoSettings } from "@/hooks/useEarningsPromoSettings";
import { toast } from "sonner";

const EarnMoney = () => {
  const navigate = useNavigate();
  const [isBariBehenLoggedIn, setIsBariBehenLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const { earnings, generateReferralCode, loading } = useEarnings();
  const { data: settings } = useEarningsPromoSettings();

  const productBonusAmount = settings?.productBonusAmount ?? 250;
  const referralBonusAmount = settings?.referralBonusAmount ?? 150;

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role, name")
          .eq("user_id", user.id)
          .single();
        
        if (profile?.role === "bari") {
          setIsBariBehenLoggedIn(true);
          setUserName(profile.name || "");
        }
      }
    };
    checkUser();
  }, []);

  const handleCopyReferralCode = () => {
    if (earnings?.referral_code) {
      navigator.clipboard.writeText(earnings.referral_code);
      toast.success("Referral code copied!");
    }
  };

  const handleShareWhatsApp = () => {
    if (earnings?.referral_code) {
      const message = `🎉 Join Behen.pk and earn PKR ${referralBonusAmount}! Use my referral code: ${earnings.referral_code}\n\nSign up here: ${window.location.origin}/auth?role=bari`;
      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank");
    }
  };

  const handleGenerateCode = async () => {
    if (userName) {
      await generateReferralCode(userName);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      
      {/* Hero Section */}
      <section className="relative py-16 px-4 bg-gradient-to-br from-primary/20 via-primary/10 to-background overflow-hidden">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full mb-6">
            <Wallet className="h-5 w-5" />
            <span className="font-medium">کمائیں بہنوں کے ساتھ</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Earn Money with <span className="text-primary">Behen.pk</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Upload your products, share with friends, and earn real money!
          </p>
        </div>
      </section>

      {/* Section 1: First Product Bonus */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full mb-4">
                <Gift className="h-4 w-4" />
                <span className="text-sm font-medium">New User Bonus</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Upload Your First Product & Get <span className="text-primary">PKR {productBonusAmount}</span> Instantly!
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                As a new Bari Behen, when you upload your first product on Behen.pk, you'll receive PKR {productBonusAmount} in your account immediately!
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Upload your first dress or accessory</p>
                    <p className="text-sm text-muted-foreground">List any bridal, formal, or party wear item</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Get PKR {productBonusAmount} credited to your account</p>
                    <p className="text-sm text-muted-foreground">Amount will be in pending balance initially</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Transfer after your first order</p>
                    <p className="text-sm text-muted-foreground">Once you complete your first rental/sale order, the amount becomes withdrawable</p>
                  </div>
                </div>
              </div>

              <Button 
                size="lg" 
                onClick={() => navigate("/list-dress")}
                className="gap-2"
              >
                <Upload className="h-5 w-5" />
                Upload Your First Product
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Gift className="h-12 w-12 text-primary" />
                </div>
                <p className="text-6xl font-bold text-primary mb-2">{productBonusAmount}</p>
                <p className="text-2xl font-semibold mb-4">PKR Bonus</p>
                <p className="text-muted-foreground">On your first product upload</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Section 2: Brand Ambassador */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <Card className="bg-gradient-to-br from-purple-100 to-pink-100 border-purple-200 order-2 md:order-1">
              <CardContent className="p-8 text-center">
                <div className="w-24 h-24 bg-purple-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Users className="h-12 w-12 text-purple-600" />
                </div>
                <p className="text-6xl font-bold text-purple-600 mb-2">{referralBonusAmount} + {referralBonusAmount}</p>
                <p className="text-2xl font-semibold mb-4">PKR Each</p>
                <p className="text-muted-foreground">You earn + Your friend earns</p>
              </CardContent>
            </Card>

            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full mb-4">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">Referral Program</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Become a <span className="text-primary">Brand Ambassador</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-6">
                Share your unique referral code with friends. When they sign up as Bari Behen and upload their first product, you BOTH get PKR {referralBonusAmount}!
              </p>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Sign up as a Bari Behen</p>
                    <p className="text-sm text-muted-foreground">Create your account to start selling/renting</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Generate your referral code</p>
                    <p className="text-sm text-muted-foreground">Click "Become Brand Ambassador" in your dashboard</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Share with friends</p>
                    <p className="text-sm text-muted-foreground">They enter your code during signup</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                    4
                  </div>
                  <div>
                    <p className="font-medium">Earn together!</p>
                    <p className="text-sm text-muted-foreground">Both of you get PKR {referralBonusAmount} when they upload first product</p>
                  </div>
                </div>
              </div>

              {/* Conditional: Show share section for logged-in Bari Behens with referral code */}
              {isBariBehenLoggedIn && earnings?.referral_code ? (
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
                  <CardContent className="p-6">
                    <h3 className="font-semibold mb-3 text-purple-700">Share Your Referral Code with Your Behens!</h3>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="flex-1 bg-white border-2 border-purple-300 rounded-lg px-4 py-3 font-mono text-lg font-bold text-purple-600">
                        {earnings.referral_code}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopyReferralCode}
                        className="border-purple-300 hover:bg-purple-100"
                      >
                        <Copy className="h-5 w-5 text-purple-600" />
                      </Button>
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleShareWhatsApp}
                        className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                      >
                        <Share2 className="h-5 w-5" />
                        Share on WhatsApp
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : isBariBehenLoggedIn && !earnings?.referral_code ? (
                <Button 
                  size="lg" 
                  onClick={handleGenerateCode}
                  disabled={loading}
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <Users className="h-5 w-5" />
                  Generate Your Referral Code
                  <ArrowRight className="h-5 w-5" />
                </Button>
              ) : (
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate("/auth?role=bari")}
                  className="gap-2 border-purple-300 text-purple-600 hover:bg-purple-50"
                >
                  <Users className="h-5 w-5" />
                  Sign Up as Bari Behen
                  <ArrowRight className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-12">How Withdrawals Work</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Wallet className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Pending Balance</h3>
                <p className="text-sm text-muted-foreground">
                  All bonuses are first credited to your pending balance
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="font-semibold mb-2">Complete First Order</h3>
                <p className="text-sm text-muted-foreground">
                  Once you complete your first rental or sale order
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Withdraw to Bank</h3>
                <p className="text-sm text-muted-foreground">
                  Transfer your available balance to your bank account
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-primary/10">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Earning?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of Bari Behens who are earning money on Behen.pk
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth?role=bari")}>
              Sign Up Now
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/")}>
              Browse Products
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default EarnMoney;
