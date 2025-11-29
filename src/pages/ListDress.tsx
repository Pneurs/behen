import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { ArrowLeft, Upload, Loader2, X } from "lucide-react";
import { z } from "zod";
import AvailabilityCalendarManager from "@/components/AvailabilityCalendarManager";

const listingSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(100),
  category: z.enum(["bridal", "barat", "walima", "formal", "party_wear", "footwear", "accessories", "jewelry", "bags", "fashion_tips"]),
  condition: z.enum(["new", "like_new", "used_twice", "used_often"]),
  listing_type: z.enum(["rent", "sale", "both"]),
  description: z.string().min(20, "Description must be at least 20 characters").max(1000),
});

const ListDress = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [user, setUser] = useState<any>(null);
  const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
  const [generatingCover, setGeneratingCover] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    subcategory: "",
    product_type: "dress",
    condition: "",
    listing_type: "",
    rental_price_per_day: "",
    sale_price: "",
    security_deposit: "",
    description: "",
    style_tips: "",
    fabric: "",
    color: "",
    work_type: "",
    designer: "",
    size: "",
    height_range: "",
    weight_range: "",
    chest_size: "",
    waist_size: "",
    hips_size: "",
    alteration_possible: false,
    city: "",
    area: "",
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        const role = session.user.user_metadata?.role;
        if (role !== "bari") {
          toast.error("Only Bari Behens can list dresses");
          navigate("/browse");
        }
      }
    });
  }, [navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 6) {
      toast.error("Maximum 6 images allowed");
      return;
    }

    const newFiles = files.slice(0, 6 - imageFiles.length);
    setImageFiles([...imageFiles, ...newFiles]);

    // Create previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImageFiles((files) => files.filter((_, i) => i !== index));
    setImagePreviews((previews) => previews.filter((_, i) => i !== index));
  };

  const uploadImages = async () => {
    if (imageFiles.length === 0) return [];

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of imageFiles) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from("product-images")
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("product-images")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      return uploadedUrls;
    } catch (error: any) {
      toast.error("Failed to upload images: " + error.message);
      return [];
    } finally {
      setUploadingImages(false);
    }
  };

  const generateAICover = async () => {
    if (!formData.title || !formData.description || !formData.category) {
      toast.error("Please fill in title, description, and category first");
      return null;
    }

    setGeneratingCover(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-cover-image", {
        body: {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          product_type: formData.product_type,
          fabric: formData.fabric,
          color: formData.color,
        },
      });

      if (error) throw error;
      
      if (data?.code === "RATE_LIMIT") {
        toast.error("AI rate limit reached. Please try again in a moment.");
        return null;
      }
      
      if (data?.code === "NO_CREDITS") {
        toast.error("AI credits exhausted. Please add credits or upload your own cover image.");
        return null;
      }

      if (!data?.imageUrl) {
        throw new Error("No image URL in response");
      }

      toast.success("AI cover image generated!");
      return data.imageUrl;
    } catch (error: any) {
      console.error("AI generation error:", error);
      toast.error("Failed to generate AI cover. You can still upload your own images.");
      return null;
    } finally {
      setGeneratingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      listingSchema.parse({
        title: formData.title,
        category: formData.category,
        condition: formData.condition,
        listing_type: formData.listing_type,
        description: formData.description,
      });

      if (imageFiles.length === 0) {
        toast.error("Please upload at least one image");
        setLoading(false);
        return;
      }

      // Generate AI cover image
      let aiCoverUrl: string | null = null;
      if (formData.title && formData.description) {
        toast.info("Generating AI cover image...");
        aiCoverUrl = await generateAICover();
      }

      // Upload real images
      const imageUrls = await uploadImages();
      if (imageUrls.length === 0) {
        setLoading(false);
        return;
      }

      // Create product with availability data
      const { error } = await supabase.from("products").insert({
        owner_id: user.id,
        title: formData.title,
        category: formData.category,
        subcategory: formData.subcategory || null,
        product_type: formData.product_type,
        condition: formData.condition,
        listing_type: formData.listing_type,
        rental_price_per_day: formData.rental_price_per_day ? parseFloat(formData.rental_price_per_day) : null,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
        security_deposit: formData.security_deposit ? parseFloat(formData.security_deposit) : null,
        description: formData.description,
        style_tips: formData.style_tips || null,
        fabric: formData.fabric || null,
        color: formData.color || null,
        work_type: formData.work_type || null,
        designer: formData.designer || null,
        size: formData.size || null,
        height_range: formData.height_range || null,
        weight_range: formData.weight_range || null,
        chest_size: formData.chest_size || null,
        waist_size: formData.waist_size || null,
        hips_size: formData.hips_size || null,
        alteration_possible: formData.alteration_possible,
        city: formData.city || null,
        area: formData.area || null,
        ai_cover_image: aiCoverUrl,
        real_images: imageUrls,
        availability_data: {
          blackout_dates: blackoutDates.map(d => d.toISOString()),
          available_dates: [],
        },
        status: "published",
      });

      if (error) throw error;

      toast.success("Item listed successfully!");
      navigate("/browse");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create listing");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/browse")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Browse
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl" style={{ fontFamily: "'Playfair Display', serif" }}>
              List Your Item
            </CardTitle>
            <CardDescription>
              Share your beautiful dresses, footwear, accessories, or fashion tips with other Behens
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Images */}
              <div className="space-y-4">
                <Label>Images (Max 6) *</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {imageFiles.length < 6 && (
                    <label className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-sm text-muted-foreground">Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Basic Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Stunning Red Bridal Lehenga with Heavy Embroidery"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="product_type">Product Type *</Label>
                  <Select 
                    value={formData.product_type} 
                    onValueChange={(v) => setFormData({ ...formData, product_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dress">Dress/Outfit</SelectItem>
                      <SelectItem value="footwear">Footwear</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                      <SelectItem value="jewelry">Jewelry</SelectItem>
                      <SelectItem value="bags">Bags/Clutches</SelectItem>
                      <SelectItem value="tips">Fashion/Style Tips</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bridal">Bridal</SelectItem>
                        <SelectItem value="barat">Barat</SelectItem>
                        <SelectItem value="walima">Walima</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                        <SelectItem value="party_wear">Party Wear</SelectItem>
                        <SelectItem value="footwear">Footwear</SelectItem>
                        <SelectItem value="accessories">Accessories</SelectItem>
                        <SelectItem value="jewelry">Jewelry</SelectItem>
                        <SelectItem value="bags">Bags/Clutches</SelectItem>
                        <SelectItem value="fashion_tips">Fashion/Style Tips</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="condition">Condition *</Label>
                    <Select value={formData.condition} onValueChange={(v) => setFormData({ ...formData, condition: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="like_new">Like New</SelectItem>
                        <SelectItem value="used_twice">Used Twice</SelectItem>
                        <SelectItem value="used_often">Used Often</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Listing Type *</Label>
                  <Select value={formData.listing_type} onValueChange={(v) => setFormData({ ...formData, listing_type: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="For rent or sale?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rent">For Rent Only</SelectItem>
                      <SelectItem value="sale">For Sale Only</SelectItem>
                      <SelectItem value="both">Both Rent & Sale</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Pricing</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  {(formData.listing_type === "rent" || formData.listing_type === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="rental_price">Rental (per day)</Label>
                      <Input
                        id="rental_price"
                        type="number"
                        placeholder="5000"
                        value={formData.rental_price_per_day}
                        onChange={(e) => setFormData({ ...formData, rental_price_per_day: e.target.value })}
                      />
                    </div>
                  )}
                  {(formData.listing_type === "sale" || formData.listing_type === "both") && (
                    <div className="space-y-2">
                      <Label htmlFor="sale_price">Sale Price</Label>
                      <Input
                        id="sale_price"
                        type="number"
                        placeholder="50000"
                        value={formData.sale_price}
                        onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                      />
                    </div>
                  )}
                  {formData.listing_type === "rent" || formData.listing_type === "both" && (
                    <div className="space-y-2">
                      <Label htmlFor="security_deposit">Security Deposit</Label>
                      <Input
                        id="security_deposit"
                        type="number"
                        placeholder="10000"
                        value={formData.security_deposit}
                        onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Description & Details</h3>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder={
                      formData.product_type === "tips" 
                        ? "Share your fashion advice, styling tips, or beauty recommendations..."
                        : "Describe your item in detail..."
                    }
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                {/* Style Tips - Optional for all items */}
                <div className="space-y-2">
                  <Label htmlFor="style_tips">Style Tips (Optional)</Label>
                  <Textarea
                    id="style_tips"
                    placeholder="Share styling suggestions, what to pair with, makeup tips, etc..."
                    rows={3}
                    value={formData.style_tips}
                    onChange={(e) => setFormData({ ...formData, style_tips: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Help Choti Behens style this item perfectly!
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fabric">Fabric</Label>
                    <Input
                      id="fabric"
                      placeholder="e.g., Silk, Chiffon"
                      value={formData.fabric}
                      onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      placeholder="e.g., Red, Gold"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="work_type">Work Type</Label>
                    <Input
                      id="work_type"
                      placeholder="e.g., Handwork, Embroidery"
                      value={formData.work_type}
                      onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="designer">Designer/Brand</Label>
                    <Input
                      id="designer"
                      placeholder="e.g., Maria B."
                      value={formData.designer}
                      onChange={(e) => setFormData({ ...formData, designer: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Size & Fit - Only for dresses and footwear */}
              {(formData.product_type === "dress" || formData.product_type === "footwear") && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Size & Fit</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="size">Size</Label>
                    <Input
                      id="size"
                      placeholder="e.g., S, M, L, Custom"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height_range">Height Range</Label>
                    <Input
                      id="height_range"
                      placeholder="e.g., 5'2'' - 5'6''"
                      value={formData.height_range}
                      onChange={(e) => setFormData({ ...formData, height_range: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="chest_size">Chest Size</Label>
                    <Input
                      id="chest_size"
                      placeholder="e.g., 36''"
                      value={formData.chest_size}
                      onChange={(e) => setFormData({ ...formData, chest_size: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waist_size">Waist Size</Label>
                    <Input
                      id="waist_size"
                      placeholder="e.g., 30''"
                      value={formData.waist_size}
                      onChange={(e) => setFormData({ ...formData, waist_size: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="alteration"
                    checked={formData.alteration_possible}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, alteration_possible: checked as boolean })
                    }
                  />
                    <Label htmlFor="alteration" className="cursor-pointer">
                      Alteration possible
                    </Label>
                  </div>
                </div>
              )}

              {/* Location */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Location</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="e.g., Lahore"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="area">Area</Label>
                    <Input
                      id="area"
                      placeholder="e.g., DHA, Gulberg"
                      value={formData.area}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your exact address will remain private until booking confirmation
                </p>
              </div>

              {/* Availability Calendar - Only for rentals */}
              {(formData.listing_type === "rent" || formData.listing_type === "both") && (
                <AvailabilityCalendarManager
                  blackoutDates={blackoutDates}
                  onBlackoutDatesChange={setBlackoutDates}
                />
              )}

              {/* Submit */}
              <div className="space-y-3">
                <div className="bg-accent/50 border border-accent rounded-lg p-4">
                  <p className="text-sm font-medium mb-1">✨ AI Cover Image</p>
                  <p className="text-xs text-muted-foreground">
                    We'll automatically generate a beautiful cover image to protect your privacy. 
                    Your real photos will only be visible after booking confirmation.
                  </p>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading || uploadingImages || generatingCover}>
                  {(loading || uploadingImages || generatingCover) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {generatingCover ? "Generating AI Cover..." : uploadingImages ? "Uploading Images..." : loading ? "Creating Listing..." : "Publish Listing"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ListDress;
