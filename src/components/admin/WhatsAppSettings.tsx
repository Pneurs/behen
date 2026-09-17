import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MessageCircle, Save } from "lucide-react";

export default function WhatsAppSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [number, setNumber] = useState("");

  useEffect(() => {
    const fetchNumber = async () => {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "whatsapp_business_number")
          .maybeSingle();

        if (!error && data) {
          const value = data.value as { number?: string };
          setNumber(value.number || "");
        }
      } catch (e) {
        console.error("Error fetching WhatsApp number:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchNumber();
  }, []);

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
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { key: "whatsapp_business_number", value: { number: cleaned } },
          { onConflict: "key" }
        );

      if (error) throw error;
      toast({ title: "Saved", description: "WhatsApp business number updated." });
    } catch (e: any) {
      console.error("Error saving WhatsApp number:", e);
      toast({ title: "Error", description: "Failed to save number", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
          WhatsApp Verification Number
        </CardTitle>
        <CardDescription>
          Sellers send their verification code to this WhatsApp Business number. Use international
          format without + (e.g. 923001234567).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            This must be your WhatsApp Business app number where you receive seller codes.
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
              Save Number
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
