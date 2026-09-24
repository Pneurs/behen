import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CreditPackage {
  credits: number;
  price: number;
  originalPrice?: number;
}

export interface CreditSettings {
  enabled: boolean;
  costPerUnlock: number;
  signupGrant: number;
  packages: CreditPackage[];
}

const DEFAULTS: CreditSettings = {
  enabled: true,
  costPerUnlock: 1,
  signupGrant: 0,
  packages: [
    { credits: 3, price: 300, originalPrice: 600 },
    { credits: 5, price: 450, originalPrice: 1000 },
  ],
};

export const useCreditSettings = () => {
  return useQuery({
    queryKey: ["credit-settings"],
    queryFn: async (): Promise<CreditSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .in("key", [
          "credit_system_enabled",
          "credit_cost_per_unlock",
          "credit_signup_grant",
          "credit_packages",
        ]);

      if (error) return DEFAULTS;

      const result = { ...DEFAULTS };
      (data || []).forEach((row) => {
        const value = row.value as any;
        if (row.key === "credit_system_enabled") result.enabled = value?.enabled !== false;
        if (row.key === "credit_cost_per_unlock") result.costPerUnlock = Number(value?.cost ?? 1) || 1;
        if (row.key === "credit_signup_grant") result.signupGrant = Number(value?.credits ?? 0) || 0;
        if (row.key === "credit_packages" && Array.isArray(value)) {
          result.packages = value
            .map((p: any) => ({
              credits: Number(p?.credits) || 0,
              price: Number(p?.price) || 0,
              originalPrice: Number(p?.originalPrice) || undefined,
            }))
            .filter((p: CreditPackage) => p.credits > 0);
        }
      });
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreditBalance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["credit-balance", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data: approved } = await supabase.rpc("auto_approve_due_credit_purchases");
      if (approved && Number(approved) > 0) {
        supabase.functions.invoke("send-notifications", { body: { type: "credit_email_sweep" } }).catch(() => {});
      }
      const { data, error } = await supabase
        .from("user_credits")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) return 0;
      return data?.balance ?? 0;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
};

export const useContactUnlocked = (productId: string | undefined) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["contact-unlock", user?.id, productId],
    queryFn: async () => {
      if (!user || !productId) return false;
      const { data } = await supabase
        .from("contact_unlocks")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && !!productId,
    staleTime: 60 * 1000,
  });
};

export const useCreditTransactions = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["credit-transactions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("credit_transactions")
        .select("id, amount, type, notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
};

export const useUnlockContact = () => {
  const queryClient = useQueryClient();

  const unlock = async (productId: string) => {
    const { data, error } = await supabase.rpc("unlock_contact", { _product_id: productId });
    if (error) throw error;
    const result = data as { success: boolean; reason?: string; balance?: number };
    if (result?.success) {
      queryClient.invalidateQueries({ queryKey: ["credit-balance"] });
      queryClient.invalidateQueries({ queryKey: ["contact-unlock"] });
      queryClient.invalidateQueries({ queryKey: ["credit-transactions"] });
    }
    return result;
  };

  return { unlock };
};
