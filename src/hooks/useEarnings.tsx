import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface UserEarnings {
  id: string;
  user_id: string;
  balance: number;
  pending_balance: number;
  referral_code: string | null;
  referred_by: string | null;
  first_product_bonus_claimed: boolean;
  first_order_completed: boolean;
}

interface EarningTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
}

export const useEarnings = () => {
  const [earnings, setEarnings] = useState<UserEarnings | null>(null);
  const [transactions, setTransactions] = useState<EarningTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEarnings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_earnings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching earnings:", error);
      }
      
      setEarnings(data);

      // Fetch transactions
      const { data: txData } = await supabase
        .from("earning_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setTransactions(txData || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const generateReferralCode = async (userName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Generate unique code: bari-behen-username format
      const cleanName = userName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
      const referralCode = `bari-behen-${cleanName}`;

      // Check if user already has earnings record
      if (earnings) {
        const { error } = await supabase
          .from("user_earnings")
          .update({ referral_code: referralCode })
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_earnings")
          .insert({
            user_id: user.id,
            referral_code: referralCode,
            balance: 0,
            pending_balance: 0
          });

        if (error) throw error;
      }

      toast({
        title: "Referral Code Generated!",
        description: `Your code is: ${referralCode}`,
      });

      await fetchEarnings();
      return referralCode;
    } catch (error: any) {
      console.error("Error generating referral code:", error);
      toast({
        title: "Error",
        description: "Could not generate referral code",
        variant: "destructive",
      });
      return null;
    }
  };

  const validateReferralCode = async (code: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("user_earnings")
        .select("user_id")
        .eq("referral_code", code)
        .single();

      if (error || !data) return false;
      return true;
    } catch {
      return false;
    }
  };

  const claimFirstProductBonus = async (productId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if already claimed
      if (earnings?.first_product_bonus_claimed) {
        return false;
      }

      // Create or update earnings record
      if (earnings) {
        await supabase
          .from("user_earnings")
          .update({
            pending_balance: (earnings.pending_balance || 0) + 250,
            first_product_bonus_claimed: true
          })
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("user_earnings")
          .insert({
            user_id: user.id,
            pending_balance: 250,
            first_product_bonus_claimed: true
          });
      }

      // Record transaction
      await supabase
        .from("earning_transactions")
        .insert({
          user_id: user.id,
          amount: 250,
          type: "first_product",
          status: "pending",
          reference_id: productId,
          notes: "First product upload bonus"
        });

      toast({
        title: "🎉 Congratulations!",
        description: "PKR 250 bonus added to your pending balance!",
      });

      await fetchEarnings();
      return true;
    } catch (error) {
      console.error("Error claiming bonus:", error);
      return false;
    }
  };

  const processReferralBonus = async (referrerUserId: string, newUserId: string) => {
    try {
      // Add 150 to referrer's pending balance
      const { data: referrerEarnings } = await supabase
        .from("user_earnings")
        .select("*")
        .eq("user_id", referrerUserId)
        .single();

      if (referrerEarnings) {
        await supabase
          .from("user_earnings")
          .update({
            pending_balance: (referrerEarnings.pending_balance || 0) + 150
          })
          .eq("user_id", referrerUserId);

        await supabase
          .from("earning_transactions")
          .insert({
            user_id: referrerUserId,
            amount: 150,
            type: "referral_bonus",
            status: "pending",
            reference_id: newUserId,
            notes: "Referral bonus - new user first product"
          });
      }

      // Add 150 to new user's pending balance
      const { data: newUserEarnings } = await supabase
        .from("user_earnings")
        .select("*")
        .eq("user_id", newUserId)
        .single();

      if (newUserEarnings) {
        await supabase
          .from("user_earnings")
          .update({
            pending_balance: (newUserEarnings.pending_balance || 0) + 150
          })
          .eq("user_id", newUserId);

        await supabase
          .from("earning_transactions")
          .insert({
            user_id: newUserId,
            amount: 150,
            type: "referral_bonus",
            status: "pending",
            notes: "Referral signup bonus"
          });
      }

      return true;
    } catch (error) {
      console.error("Error processing referral bonus:", error);
      return false;
    }
  };

  return {
    earnings,
    transactions,
    loading,
    generateReferralCode,
    validateReferralCode,
    claimFirstProductBonus,
    processReferralBonus,
    refetch: fetchEarnings
  };
};
