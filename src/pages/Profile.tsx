import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Phone, MapPin, Mail, Save } from "lucide-react";
import { PAKISTAN_LOCATIONS, CITIES, getAreasForCity } from "@/data/locations";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    city: "",
    area: "",
    role: "",
  });
  const [email, setEmail] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    setEmail(user.email || "");
    fetchProfile(user.id);
  };

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.name || "",
          phone: data.phone || "",
          city: data.city || "",
          area: data.area || "",
          role: data.role || "",
        });
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!profile.name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!profile.phone.trim()) {
      toast.error("Phone number is required");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profile.name.trim(),
          phone: profile.phone.trim(),
          city: profile.city || null,
          area: profile.area || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error("Failed to update profile");
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const availableAreas = profile.city ? getAreasForCity(profile.city) : [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <EnhancedHeader />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <EnhancedHeader />
      <div className="container max-w-2xl py-8 px-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              My Profile
            </CardTitle>
            <CardDescription>
              Update your personal information. Your contact details will be shared with other users after payment approval.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Role Badge */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Account Type:</span>
              <span className="text-sm font-medium px-2 py-1 rounded-full bg-primary/10 text-primary">
                {profile.role === "bari" ? "Bari Behen (Seller)" : "Choti Behen (Buyer)"}
              </span>
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed. Contact support if you need to update it.
              </p>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Full Name *
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number *
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="03XX-XXXXXXX"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                This number will be shared with other users after payment verification.
              </p>
            </div>

            {/* City */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                City
              </Label>
              <Select
                value={profile.city}
                onValueChange={(value) => setProfile({ ...profile, city: value, area: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your city" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area */}
            {profile.city && availableAreas.length > 0 && (
              <div className="space-y-2">
                <Label>Area</Label>
                <Select
                  value={profile.area}
                  onValueChange={(value) => setProfile({ ...profile, area: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your area" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAreas.map((area) => (
                      <SelectItem key={area} value={area}>
                        {area}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
