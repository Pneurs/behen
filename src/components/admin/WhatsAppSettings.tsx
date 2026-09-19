import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle, Save, RefreshCw, Copy } from "lucide-react";

const SITE_URL = "https://behen.pk";

export default function WhatsAppSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [number, setNumber] = useState("");
  const [token, setToken] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("key, value")
          .in("key", ["whatsapp_business_number", "whatsapp_verify_link_token"]);

        let existingToken = "";
        for (const row of data || []) {
          const value = row.value as { number?: string; token?: string };
          if (row.key === "whatsapp_business_number") setNumber(value.number || "");
          if (row.key === "whatsapp_verify_link_token") existingToken = value.token || "";
        }

        // Auto-create the verification link token if missing so the link always shows
        if (!existingToken) {
          existingToken =
            Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
          const { error } = await supabase.from("app_settings").upsert(
            { key: "whatsapp_verify_link_token", value: { token: existingToken } },
            { onConflict: "key" }
          );
          if (error) {
            console.error("Error creating verification token:", error);
            existingToken = "";
          }
        }
        setToken(existingToken);
      } catch (e) {
        console.error("Error fetching WhatsApp settings:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const verifyLink = token ? `${SITE_URL}/verify-whatsapp?t=${token}` : "";
  const greetingMessage = verifyLink
    ? `Assalam o Alaikum! Welcome to Behen.pk 💖\n\nTo verify your WhatsApp number, open this link, copy your code and paste it in your Behen.pk profile:\n${verifyLink}`
    : "";

  const handleSave = async () => {
    const cleaned = number.replace(/\D/g, "");
    if (cleaned && cleaned.length < 10) {
      toast({
        title: "Invalid number",
        description: "Enter the full number in international format, e.g. 923001234567",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const newToken =
        token || Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const { error } = await supabase.from("app_settings").upsert(
        [
          { key: "whatsapp_business_number", value: { number: cleaned } },
          { key: "whatsapp_verify_link_token", value: { token: newToken } },
        ],
        { onConflict: "key" }
      );

      if (error) throw error;
      setToken(newToken);
      toast({ title: "Saved", description: "WhatsApp verification settings updated." });
    } catch (e: any) {
      console.error("Error saving WhatsApp settings:", e);
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const regenerateToken = async () => {
    setSaving(true);
    try {
      const newToken =
        Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "whatsapp_verify_link_token", value: { token: newToken } }, { onConflict: "key" });
      if (error) throw error;
      setToken(newToken);
      toast({
        title: "New link created",
        description: "Update your WhatsApp greeting message with the new link.",
      });
    } catch (e: any) {
      console.error("Error regenerating token:", e);
      toast({ title: "Error", description: "Failed to create new link", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard.` });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          WhatsApp Verification
        </CardTitle>
        <CardDescription>
          Sellers message this number and instantly get your WhatsApp greeting reply containing the
          verification link. They copy the code from that link into their profile — no manual work
          for you.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="wa-number">Business WhatsApp Number</Label>
          <Input
            id="wa-number"
            type="tel"
            placeholder="923001234567"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            International format without + (e.g. 923001234567).
          </p>
        </div>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save
            </>
          )}
        </Button>

        {verifyLink && (
          <div className="space-y-4 border-t pt-5">
            <div className="space-y-2">
              <Label>Verification Link</Label>
              <div className="flex gap-2">
                <Input readOnly value={verifyLink} />
                <Button variant="outline" size="icon" onClick={() => copy(verifyLink, "Link")}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep this link private — share it only through your WhatsApp auto-reply.
              </p>
            </div>

            <div className="space-y-2">
              <Label>WhatsApp Greeting Message</Label>
              <Textarea readOnly rows={6} value={greetingMessage} />
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copy(greetingMessage, "Greeting message")}
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy Message
                </Button>
                <Button variant="outline" size="sm" onClick={regenerateToken} disabled={saving}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Create New Link
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste this into WhatsApp Business app → Settings → Business tools → Greeting message
                (send to "Everyone", every time).
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
