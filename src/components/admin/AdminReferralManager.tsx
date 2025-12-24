import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Users, 
  Gift, 
  TrendingUp, 
  ChevronRight, 
  Loader2,
  Calendar,
  Wallet,
  UserCheck
} from "lucide-react";
import { format } from "date-fns";

interface ReferralCode {
  user_id: string;
  referral_code: string;
  owner_name: string;
  owner_email: string | null;
  generated_at: string;
  times_used: number;
  total_earned: number;
}

interface ReferredUser {
  id: string;
  referred_user_id: string;
  referred_name: string;
  referred_email: string | null;
  signup_date: string;
  bonus_amount: number;
  bonus_credited: boolean;
}

export default function AdminReferralManager() {
  const [loading, setLoading] = useState(true);
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [selectedCode, setSelectedCode] = useState<ReferralCode | null>(null);
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [stats, setStats] = useState({
    totalCodes: 0,
    totalReferrals: 0,
    totalBonusesPaid: 0,
  });

  useEffect(() => {
    fetchReferralCodes();
  }, []);

  const fetchReferralCodes = async () => {
    setLoading(true);
    try {
      // Fetch all referral codes from user_earnings
      const { data: earnings, error: earningsError } = await supabase
        .from("user_earnings")
        .select("user_id, referral_code, created_at")
        .not("referral_code", "is", null);

      if (earningsError) throw earningsError;

      // Fetch referral signups to count usage
      const { data: signups, error: signupsError } = await supabase
        .from("referral_signups")
        .select("referrer_user_id, bonus_amount");

      if (signupsError) throw signupsError;

      // Count referrals per code
      const referralCounts: Record<string, { count: number; earned: number }> = {};
      (signups || []).forEach((signup) => {
        if (!referralCounts[signup.referrer_user_id]) {
          referralCounts[signup.referrer_user_id] = { count: 0, earned: 0 };
        }
        referralCounts[signup.referrer_user_id].count++;
        referralCounts[signup.referrer_user_id].earned += Number(signup.bonus_amount) || 150;
      });

      // Fetch profiles for names
      const userIds = (earnings || []).map((e) => e.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = p.name;
      });

      // Fetch emails via edge function
      let emailMap: Record<string, string> = {};
      try {
        const { data: session } = await supabase.auth.getSession();
        const response = await supabase.functions.invoke("admin-list-users", {
          headers: {
            Authorization: `Bearer ${session.session?.access_token}`,
          },
        });
        if (response.data?.userEmails) {
          emailMap = response.data.userEmails;
        }
      } catch (e) {
        console.log("Could not fetch user emails:", e);
      }

      const codes: ReferralCode[] = (earnings || []).map((e) => ({
        user_id: e.user_id,
        referral_code: e.referral_code!,
        owner_name: profileMap[e.user_id] || "Unknown",
        owner_email: emailMap[e.user_id] || null,
        generated_at: e.created_at,
        times_used: referralCounts[e.user_id]?.count || 0,
        total_earned: referralCounts[e.user_id]?.earned || 0,
      }));

      // Sort by times_used descending
      codes.sort((a, b) => b.times_used - a.times_used);

      setReferralCodes(codes);

      // Calculate stats
      const totalReferrals = Object.values(referralCounts).reduce((sum, r) => sum + r.count, 0);
      const totalBonuses = Object.values(referralCounts).reduce((sum, r) => sum + r.earned, 0);

      setStats({
        totalCodes: codes.length,
        totalReferrals,
        totalBonusesPaid: totalBonuses,
      });
    } catch (error) {
      console.error("Error fetching referral codes:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferredUsers = async (code: ReferralCode) => {
    setLoadingUsers(true);
    setSelectedCode(code);
    setReferredUsers([]);

    try {
      // Fetch signups for this referrer
      const { data: signups, error } = await supabase
        .from("referral_signups")
        .select("*")
        .eq("referrer_user_id", code.user_id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for referred users
      const referredIds = (signups || []).map((s) => s.referred_user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", referredIds);

      const profileMap: Record<string, string> = {};
      (profiles || []).forEach((p) => {
        profileMap[p.user_id] = p.name;
      });

      // Fetch emails
      let emailMap: Record<string, string> = {};
      try {
        const { data: session } = await supabase.auth.getSession();
        const response = await supabase.functions.invoke("admin-list-users", {
          headers: {
            Authorization: `Bearer ${session.session?.access_token}`,
          },
        });
        if (response.data?.userEmails) {
          emailMap = response.data.userEmails;
        }
      } catch (e) {
        console.log("Could not fetch user emails:", e);
      }

      const users: ReferredUser[] = (signups || []).map((s) => ({
        id: s.id,
        referred_user_id: s.referred_user_id,
        referred_name: profileMap[s.referred_user_id] || "Unknown",
        referred_email: emailMap[s.referred_user_id] || null,
        signup_date: s.created_at,
        bonus_amount: Number(s.bonus_amount) || 150,
        bonus_credited: s.bonus_credited,
      }));

      setReferredUsers(users);
    } catch (error) {
      console.error("Error fetching referred users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-purple-500/20">
                <Users className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Referral Codes</p>
                <p className="text-3xl font-bold text-white">{stats.totalCodes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-green-500/20">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Successful Referrals</p>
                <p className="text-3xl font-bold text-white">{stats.totalReferrals}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-amber-500/20">
                <Wallet className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Total Bonuses Paid</p>
                <p className="text-3xl font-bold text-white">
                  PKR {stats.totalBonusesPaid.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Referral Codes Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Gift className="h-5 w-5" />
            All Referral Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referralCodes.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No referral codes generated yet</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {referralCodes.map((code) => (
                  <Card
                    key={code.user_id}
                    className="bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 transition-colors cursor-pointer"
                    onClick={() => fetchReferredUsers(code)}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-full bg-purple-500/20">
                            <Users className="h-5 w-5 text-purple-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-mono text-purple-300 bg-purple-500/20 px-2 py-1 rounded">
                                {code.referral_code}
                              </code>
                            </div>
                            <p className="text-sm text-slate-300 mt-1">
                              {code.owner_name}
                              {code.owner_email && (
                                <span className="text-slate-500 ml-2">({code.owner_email})</span>
                              )}
                            </p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                              <Calendar className="h-3 w-3" />
                              Generated: {format(new Date(code.generated_at), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge
                              className={
                                code.times_used > 0
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-slate-600/50 text-slate-400 border-slate-500/30"
                              }
                            >
                              {code.times_used} {code.times_used === 1 ? "user" : "users"}
                            </Badge>
                            {code.total_earned > 0 && (
                              <p className="text-sm text-amber-400 mt-1">
                                PKR {code.total_earned.toLocaleString()}
                              </p>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-slate-500" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Referred Users Dialog */}
      <Dialog open={!!selectedCode} onOpenChange={() => setSelectedCode(null)}>
        <DialogContent className="max-w-2xl bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Gift className="h-5 w-5 text-purple-400" />
              Users referred by: {selectedCode?.owner_name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
              <code className="font-mono text-purple-300">{selectedCode?.referral_code}</code>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">{selectedCode?.times_used} referrals</span>
              <span className="text-slate-400">•</span>
              <span className="text-amber-400">PKR {selectedCode?.total_earned?.toLocaleString()}</span>
            </div>

            {loadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : referredUsers.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No users have used this referral code yet</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {referredUsers.map((user) => (
                    <Card key={user.id} className="bg-slate-700/50 border-slate-600">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-full bg-green-500/20">
                              <UserCheck className="h-4 w-4 text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{user.referred_name}</p>
                              {user.referred_email && (
                                <p className="text-xs text-slate-400">{user.referred_email}</p>
                              )}
                              <p className="text-xs text-slate-500 mt-1">
                                Signed up: {format(new Date(user.signup_date), "MMM dd, yyyy 'at' h:mm a")}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge
                              className={
                                user.bonus_credited
                                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                                  : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                              }
                            >
                              {user.bonus_credited ? "✓ Credited" : "⏳ Pending"}
                            </Badge>
                            <p className="text-xs text-slate-400 mt-1">
                              PKR {user.bonus_amount}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
