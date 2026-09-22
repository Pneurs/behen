import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const AiImageSettings = () => {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchSetting = async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "ai_image_generation_enabled")
        .maybeSingle();

      const value = data?.value as { enabled?: boolean } | null;
      setEnabled(value?.enabled === true);
      setLoading(false);
    };
    fetchSetting();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { key: "ai_image_generation_enabled", value: { enabled } },
          { onConflict: "key" }
        );
      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["ai-image-generation-enabled"] });
      toast.success("AI image setting saved");
    } catch (e) {
      console.error("Error saving AI image setting:", e);
      toast.error("Failed to save setting");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Sparkles className="h-5 w-5" />
          AI Cover Images
        </CardTitle>
        <CardDescription className="text-slate-400">
          When off, sellers upload their own photos only and no "AI Generated" tag is shown anywhere.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
          <div className="space-y-1">
            <Label className="text-white">Enable AI image generation</Label>
            <p className="text-sm text-slate-400">
              {enabled ? "Sellers can generate an AI cover image." : "Paused — original photos are used directly."}
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save
        </Button>
      </CardContent>
    </Card>
  );
};

export default AiImageSettings;
