import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Megaphone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUploadAnnouncement } from "@/hooks/useUploadAnnouncement";

const UploadAnnouncementSettings = () => {
  const { data, isLoading } = useUploadAnnouncement();
  const [enabled, setEnabled] = useState(false);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (data) { setEnabled(data.enabled); setText(data.text); }
  }, [data]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ key: "upload_page_announcement", value: { enabled, text } }, { onConflict: "key" });
    setSaving(false);
    if (error) return toast.error("Failed to save");
    queryClient.invalidateQueries({ queryKey: ["upload-page-announcement"] });
    toast.success("Upload page message saved");
  };

  if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white"><Megaphone className="h-5 w-5" />Upload Page Message</CardTitle>
        <CardDescription className="text-slate-400">A message shown at the top of the dress upload page. Write anything you like.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-slate-700 p-4">
          <Label className="text-white">Show message to sellers</Label>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="e.g. Listing is free this month!" />
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save
        </Button>
      </CardContent>
    </Card>
  );
};

export default UploadAnnouncementSettings;
