import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ReferralStats {
  referredCount: number;
  totalEarned: number;
  referredUsers: {
    id: string;
    name: string;
    signupDate: string;
    bonusAmount: number;
  }[];
}

export const useReferralStats = () => {
  const [stats, setStats] = useState<ReferralStats>({
    referredCount: 0,
    totalEarned: 0,
    referredUsers: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch referral signups where current user is the referrer
      const { data: signups, error } = await supabase
        .from("referral_signups")
        .select("*")
        .eq("referrer_user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching referral stats:", error);
        setLoading(false);
        return;
      }

      if (!signups || signups.length === 0) {
        setStats({ referredCount: 0, totalEarned: 0, referredUsers: [] });
        setLoading(false);
        return;
      }

      // Fetch profile names for referred users
      const referredIds = signups.map((s) => s.referred_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", referredIds);

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = p.name;
      });

      const referredUsers = signups.map((s) => ({
        id: s.id,
        name: profileMap[s.referred_user_id] || "User",
        signupDate: s.created_at,
        bonusAmount: Number(s.bonus_amount) || 150,
      }));

      const totalEarned = referredUsers.reduce((sum, u) => sum + u.bonusAmount, 0);

      setStats({
        referredCount: signups.length,
        totalEarned,
        referredUsers,
      });
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return { stats, loading, refetch: fetchStats };
};
