import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { EnhancedHeader } from "@/components/EnhancedHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User, Phone, MapPin, Mail, Save, Camera, Info, Lock, Eye, EyeOff } from "lucide-react";
import { PAKISTAN_LOCATIONS, CITIES, getAreasForCity } from "@/data/locations";

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    name: "",
    phone: "",
    city: "",
    area: "",
    role: "",
  });
  const [email, setEmail] = useState("");
  
  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

        // Load profile picture if exists
        if (data.profile_picture) {
          const { data: signedData } = await supabase.storage
            .from('profile-pictures')
            .createSignedUrl(data.profile_picture, 60 * 60 * 24); // 24 hours
          
          if (signedData?.signedUrl) {
            setProfilePicture(signedData.signedUrl);
          }
        }
      }
    } catch (error: any) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadingPic(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/profile.${fileExt}`;

      // Upload to private bucket
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Update profile with the path
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ profile_picture: filePath })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Get signed URL for display
      const { data: signedData } = await supabase.storage
        .from('profile-pictures')
        .createSignedUrl(filePath, 60 * 60 * 24);

      setProfilePicture(signedData?.signedUrl || null);
      toast.success("Profile picture updated!");
    } catch (error: any) {
      console.error("Error uploading picture:", error);
      toast.error("Failed to upload picture");
    } finally {
      setUploadingPic(false);
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

  const handlePasswordChange = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("Please fill in both password fields");
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      console.error("Error updating password:", error);
      toast.error(error.message || "Failed to update password");
    } finally {
      setSavingPassword(false);
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
            {/* Profile Picture Section */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative">
                {/* Avatar Circle */}
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-primary/20">
                  {uploadingPic ? (
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  ) : profilePicture ? (
                    <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                
                {/* Upload button overlay */}
                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 cursor-pointer hover:bg-primary/90 transition-colors">
                  <Camera className="h-4 w-4" />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handlePictureUpload}
                    disabled={uploadingPic}
                  />
                </label>
                
                {/* Info tooltip */}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="absolute -top-1 -right-1 bg-background border rounded-full p-1 hover:bg-muted transition-colors">
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px] text-center">
                      <p className="text-xs">
                        Upload your real photo. This will remain <strong>private</strong> unless you engage in fraudulent activity on our platform.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              
              <p className="text-sm text-muted-foreground text-center">
                Profile Photo (Private)
              </p>
            </div>

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

            {/* Password Change Section */}
            <div className="border-t pt-6 mt-6">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Lock className="h-5 w-5" />
                Change Password
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Update your password for better account security.
              </p>
              
              <div className="space-y-4">
                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  onClick={handlePasswordChange}
                  disabled={savingPassword || !newPassword || !confirmPassword}
                  variant="outline"
                  className="w-full"
                >
                  {savingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Update Password
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}