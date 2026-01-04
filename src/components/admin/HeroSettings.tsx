import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles, Save, RotateCcw } from "lucide-react";

const defaultSettings = {
  tagline: "Pakistan's Premier Bridal Marketplace",
  title: "Behen.pk",
  description: "Rent or buy stunning bridal and formal wear. Share your designer pieces with your Behen and make every celebration unforgettable.",
};

const HeroSettings = () => {
  const [tagline, setTagline] = useState(defaultSettings.tagline);
  const [title, setTitle] = useState(defaultSettings.title);
  const [description, setDescription] = useState(defaultSettings.description);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['hero_tagline', 'hero_title', 'hero_description']);

    data?.forEach((item) => {
      const value = item.value as string;
      if (item.key === 'hero_tagline' && value) setTagline(value);
      if (item.key === 'hero_title' && value) setTitle(value);
      if (item.key === 'hero_description' && value) setDescription(value);
    });
  };

  const saveSetting = async (key: string, value: string) => {
    const { data: session } = await supabase.auth.getSession();
    const userId = session.session?.user?.id;

    // Check if setting exists
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('app_settings')
        .update({
          value: JSON.parse(JSON.stringify(value)),
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('key', key);
    } else {
      await supabase
        .from('app_settings')
        .insert({
          key,
          value: JSON.parse(JSON.stringify(value)),
          updated_by: userId,
        });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        saveSetting('hero_tagline', tagline),
        saveSetting('hero_title', title),
        saveSetting('hero_description', description),
      ]);
      
      queryClient.invalidateQueries({ queryKey: ['hero-settings'] });
      toast.success("Hero settings saved successfully!");
    } catch (error) {
      console.error('Error saving hero settings:', error);
      toast.error("Failed to save hero settings");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setTagline(defaultSettings.tagline);
    setTitle(defaultSettings.title);
    setDescription(defaultSettings.description);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Hero Section Settings
        </CardTitle>
        <CardDescription>
          Customize the homepage hero section text
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="tagline">Tagline Badge</Label>
          <Input
            id="tagline"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            placeholder="e.g., Pakistan's Premier Bridal Marketplace"
          />
          <p className="text-xs text-muted-foreground">
            The small badge text shown above the title
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">Main Title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Behen.pk"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Main description text..."
            rows={3}
          />
        </div>

        {/* Preview */}
        <div className="border rounded-lg p-6 bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <p className="text-xs text-muted-foreground mb-2">Preview:</p>
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-card rounded-full shadow-sm text-sm">
              <Sparkles className="h-3 w-3 text-primary" />
              <span className="font-medium">{tagline}</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent" style={{ fontFamily: "'Playfair Display', serif" }}>
              {title}
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {description}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} className="flex-1">
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default HeroSettings;
