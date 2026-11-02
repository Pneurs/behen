import { supabase } from "@/integrations/supabase/client";

export interface PublicProfile {
  user_id: string;
  name: string;
  role: string;
  city: string | null;
  area: string | null;
  phone_verified: boolean;
  created_at: string;
}

/** Public-safe profile fields (no phone, tokens or codes) for other users. */
export async function fetchPublicProfiles(userIds: string[]): Promise<PublicProfile[]> {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return [];
  const { data, error } = await supabase.rpc("get_public_profiles", { _user_ids: ids });
  if (error) {
    console.error("Failed to load profiles", error);
    return [];
  }
  return (data || []) as PublicProfile[];
}

export async function fetchPublicProfile(userId: string): Promise<PublicProfile | null> {
  const [p] = await fetchPublicProfiles([userId]);
  return p || null;
}
