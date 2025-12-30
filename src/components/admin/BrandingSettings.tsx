import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useBranding } from "@/hooks/useBranding";
import { useQueryClient } from "@tanstack/react-query";
import { Palette, Upload, Loader2, Image, Type, X } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";

export const BrandingSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: branding, isLoading } = useBranding();
  
  const [logoType, setLogoType] = useState<'text' | 'image'>('text');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (branding) {
      setLogoType(branding.logoType);
      setLogoUrl(branding.logoUrl);
      setFaviconUrl(branding.faviconUrl);
    }
  }, [branding]);

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const { data, error } = await supabase.storage
      .from('branding-assets')
      .upload(path, file, { upsert: true });

    if (error) {
      console.error('Upload error:', error);
      throw error;
    }

    const { data: urlData } = supabase.storage
      .from('branding-assets')
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PNG or JPG", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 2MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, `logo-${Date.now()}.${file.type.split('/')[1]}`);
      setLogoUrl(url);
      toast({ title: "Logo uploaded", description: "Don't forget to save your changes" });
    } catch (error) {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/x-icon', 'image/ico'].includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload PNG, JPG, or ICO", variant: "destructive" });
      return;
    }

    if (file.size > 500 * 1024) {
      toast({ title: "File too large", description: "Maximum size is 500KB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const url = await uploadFile(file, `favicon-${Date.now()}.${file.type.split('/')[1]}`);
      setFaviconUrl(url);
      toast({ title: "Favicon uploaded", description: "Don't forget to save your changes" });
    } catch (error) {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const upsertSetting = async (key: string, value: Json) => {
    const { data: existing } = await supabase
      .from('app_settings')
      .select('id')
      .eq('key', key)
      .single();

    if (existing) {
      await supabase
        .from('app_settings')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);
    } else {
      await supabase
        .from('app_settings')
        .insert({ key, value });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        upsertSetting('branding_logo_type', { type: logoType }),
        upsertSetting('branding_logo_url', { url: logoUrl }),
        upsertSetting('branding_favicon_url', { url: faviconUrl }),
      ]);

      queryClient.invalidateQueries({ queryKey: ['branding-settings'] });
      toast({ title: "Branding saved", description: "Your changes have been applied" });
    } catch (error) {
      console.error('Save error:', error);
      toast({ title: "Save failed", description: "Please try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Branding Settings
        </CardTitle>
        <CardDescription>
          Customize your site logo and favicon
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Logo Type Selection */}
        <div className="space-y-3">
          <Label>Logo Type</Label>
          <RadioGroup
            value={logoType}
            onValueChange={(v) => setLogoType(v as 'text' | 'image')}
            className="flex gap-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="text" id="text-logo" />
              <Label htmlFor="text-logo" className="flex items-center gap-2 cursor-pointer">
                <Type className="h-4 w-4" />
                Text Logo
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="image" id="image-logo" />
              <Label htmlFor="image-logo" className="flex items-center gap-2 cursor-pointer">
                <Image className="h-4 w-4" />
                Image Logo
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Logo Preview */}
        <div className="space-y-2">
          <Label>Logo Preview</Label>
          <div className="border rounded-lg p-4 bg-muted/50">
            {logoType === 'text' ? (
              <div className="flex flex-col items-start">
                <span className="text-2xl font-bold text-primary" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Behen.pk
                </span>
                <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Noto Nastaliq Urdu', serif" }}>
                  بہنیں تو سب شیئر کرتی ہیں
                </span>
              </div>
            ) : logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
            ) : (
              <p className="text-muted-foreground text-sm">No image logo uploaded</p>
            )}
          </div>
        </div>

        {/* Image Logo Upload (shown when image type selected) */}
        {logoType === 'image' && (
          <div className="space-y-2">
            <Label>Upload Image Logo</Label>
            <div className="flex items-center gap-4">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="flex-1"
              />
              {logoUrl && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setLogoUrl(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">PNG or JPG, max 2MB. Recommended: transparent PNG</p>
          </div>
        )}

        {/* Favicon Section */}
        <div className="border-t pt-6 space-y-3">
          <Label>Favicon</Label>
          <div className="flex items-center gap-4">
            <div className="border rounded-lg p-3 bg-muted/50">
              {faviconUrl ? (
                <img src={faviconUrl} alt="Favicon" className="h-8 w-8 object-contain" />
              ) : (
                <img src="/favicon.png" alt="Default Favicon" className="h-8 w-8 object-contain" />
              )}
            </div>
            <div className="flex-1">
              <Input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/x-icon"
                onChange={handleFaviconUpload}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or ICO. Max 500KB. Recommended: 32x32 or 512x512</p>
            </div>
            {faviconUrl && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => setFaviconUrl(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={saving || uploading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Save Branding Settings
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
