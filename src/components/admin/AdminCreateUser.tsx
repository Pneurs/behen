import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function AdminCreateUser({ onCreated }: { onCreated?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("none");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { data: { session } } = await supabase.auth.getSession();
    const { data, error } = await supabase.functions.invoke("admin-create-user", {
      body: { email, password, name, role: role === "none" ? null : role },
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    setBusy(false);
    if (error || data?.error) {
      let msg = data?.error;
      try { msg = msg || (await (error as any)?.context?.json())?.error; } catch {}
      toast.error(msg || "Could not create user");
      return;
    }
    toast.success(`Account ${email} created — they can sign in now`);
    setEmail(""); setPassword(""); setName(""); setRole("none");
    onCreated?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Create account</CardTitle>
        <CardDescription>Create a ready-to-use login (no email code needed) and optionally give a staff role.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label>Email / username</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="huda@behen.pk" /></div>
          <div className="space-y-1"><Label>Password</Label>
            <Input required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <div className="space-y-1"><Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Huda" /></div>
          <div className="space-y-1"><Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Normal user (buyer/seller)</SelectItem>
                <SelectItem value="social_media_manager">Social media manager</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select></div>
          <Button type="submit" disabled={busy} className="sm:col-span-2">
            {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Create account
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
