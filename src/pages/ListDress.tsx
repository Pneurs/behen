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
import { Upload, Loader2, X, Check, AlertCircle, RefreshCw } from "lucide-react";
import { z } from "zod";
import AvailabilityCalendarManager from "@/components/AvailabilityCalendarManager";
import { Header } from "@/components/Header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const listingSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(100),
  category: z.enum(["bridal", "barat", "walima", "formal", "party_wear", "footwear", "accessories", "jewelry", "bags", "fashion_tips"]),
  condition: z.enum(["new", "like_new", "used_twice", "used_often"]),
  listing_type: z.enum(["rent", "sale", "both"]),
  description: z.string().min(20, "Description must be at least 20 characters").max(1000),
  city: z.string().min(1, "City is required"),
  area: z.string().min(1, "Area is required"),
  size: z.string().min(1, "Size is required"),
  dry_clean_only: z.boolean(),
});

const ListDress = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  
  // Multi-step wizard state
  const [currentStep, setCurrentStep] = useState<"upload" | "generating" | "confirm" | "details">("upload");
  
  // Step 1: Image upload
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageQualityChecked, setImageQualityChecked] = useState(false);
  
  // Step 2 & 3: AI generation
  const [generatingCover, setGeneratingCover] = useState(false);
  const [aiCoverImage, setAiCoverImage] = useState<string>("");
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;
  
  // Step 4: Product details
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
  const [includedAccessories, setIncludedAccessories] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    subcategory: "",
    product_type: "dress",
    condition: "",
    listing_type: "",
    rental_price_per_day: "",
    rental_price_4days: "",
    extra_day_rate: "",
    original_price: "",
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
    dry_clean_only: false,
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

  // STEP 1: Image Upload Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + imageFiles.length > 3) {
      toast.error("Maximum 3 images allowed");
      return;
    }

    const newFiles = files.slice(0, 3 - imageFiles.length);
    
    // Basic quality check
    const validFiles: File[] = [];
    const validPreviews: string[] = [];
    
    newFiles.forEach((file) => {
      // Check file size (must be at least 100KB for quality)
      if (file.size < 100000) {
        toast.error(`${file.name} is too small. Please upload higher quality images.`);
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file.`);
        return;
      }
      
      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        validPreviews.push(reader.result as string);
        if (validPreviews.length === validFiles.length) {
          setImagePreviews([...imagePreviews, ...validPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    setImageFiles([...imageFiles, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const validateImageQuality = () => {
    if (imageFiles.length === 0) {
      toast.error("Please upload at least 1 image");
      return false;
    }
    
    // Additional quality checks can be added here
    setImageQualityChecked(true);
    return true;
  };

  const handleContinueToGeneration = () => {
    if (!validateImageQuality()) return;
    
    // Move to generating step and start AI generation
    setCurrentStep("generating");
    generateAICover();
  };

  // STEP 2: AI Generation
  const generateAICover = async () => {
    if (imageFiles.length === 0) {
      toast.error("Please upload at least one image first");
      return;
    }

    if (generationAttempts >= MAX_ATTEMPTS) {
      toast.error(`Maximum ${MAX_ATTEMPTS} generation attempts reached`);
      return;
    }

    setGeneratingCover(true);
    setGenerationAttempts(prev => prev + 1);

    try {
      // First upload the image to get a URL
      const firstImage = imageFiles[0];
      const fileExt = firstImage.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, firstImage);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      // Call AI generation edge function
      const { data, error } = await supabase.functions.invoke("generate-cover-image", {
        body: {
          imageUrl: publicUrl,
          title: formData.title || "Dress",
          description: formData.description || "",
          category: formData.category,
          product_type: formData.product_type,
          fabric: formData.fabric,
          color: formData.color,
        },
      });

      if (error) throw error;

      if (data?.code === "RATE_LIMIT") {
        toast.error("Rate limit exceeded. Please try again in a moment.");
        setCurrentStep("upload");
        return;
      }

      if (data?.code === "NO_CREDITS") {
        toast.error("AI credits exhausted. Please contact support.");
        setCurrentStep("upload");
        return;
      }

      if (!data?.imageUrl) {
        throw new Error("No image URL received");
      }

      setAiCoverImage(data.imageUrl);
      setCurrentStep("confirm");
      toast.success("Mannequin image generated successfully!");

    } catch (error: any) {
      console.error("AI generation error:", error);
      toast.error(error.message || "Failed to generate mannequin image");
      setCurrentStep("upload");
    } finally {
      setGeneratingCover(false);
    }
  };

  // STEP 3: Confirm or Regenerate
  const handleAcceptAI = () => {
    setCurrentStep("details");
    toast.success("Great! Now let's add product details.");
  };

  const handleRegenerateAI = () => {
    if (generationAttempts >= MAX_ATTEMPTS) {
      toast.error(`Maximum ${MAX_ATTEMPTS} attempts reached. Please try with different images.`);
      return;
    }
    
    setCurrentStep("generating");
    generateAICover();
  };

  const handleBackToUpload = () => {
    setCurrentStep("upload");
    setAiCoverImage("");
    setGenerationAttempts(0);
  };

  // STEP 4: Upload real images to storage
  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = [];

    for (const file of imageFiles) {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `real/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  // STEP 4: Final form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!aiCoverImage) {
      toast.error("Please generate and confirm the mannequin image first");
      return;
    }

    try {
      // Validate form data
      listingSchema.parse({
        ...formData,
        dry_clean_only: formData.dry_clean_only,
      });

      setLoading(true);
      setUploadingImages(true);

      // Upload real images
      const realImageUrls = await uploadImages();

      setUploadingImages(false);

      // Prepare availability data
      const availabilityData = {
        blackout_dates: blackoutDates.map(date => date.toISOString()),
        available_dates: []
      };

      // Insert product into database
      const { data: product, error: insertError } = await supabase
        .from("products")
        .insert({
          owner_id: user.id,
          title: formData.title,
          category: formData.category,
          subcategory: formData.subcategory,
          product_type: formData.product_type,
          condition: formData.condition,
          listing_type: formData.listing_type,
          rental_price_per_day: formData.rental_price_per_day ? parseFloat(formData.rental_price_per_day) : null,
          rental_price_4days: formData.rental_price_4days ? parseFloat(formData.rental_price_4days) : null,
          extra_day_rate: formData.extra_day_rate ? parseFloat(formData.extra_day_rate) : null,
          original_price: formData.original_price ? parseFloat(formData.original_price) : null,
          sale_price: formData.sale_price ? parseFloat(formData.sale_price) : null,
          security_deposit: formData.security_deposit ? parseFloat(formData.security_deposit) : null,
          description: formData.description,
          style_tips: formData.style_tips,
          fabric: formData.fabric,
          color: formData.color,
          work_type: formData.work_type,
          designer: formData.designer,
          size: formData.size,
          height_range: formData.height_range,
          weight_range: formData.weight_range,
          chest_size: formData.chest_size,
          waist_size: formData.waist_size,
          hips_size: formData.hips_size,
          alteration_possible: formData.alteration_possible,
          city: formData.city,
          area: formData.area,
          ai_cover_image: aiCoverImage,
          real_images: realImageUrls,
          availability_data: availabilityData,
          dry_clean_only: formData.dry_clean_only,
          included_accessories: includedAccessories,
          ai_generation_attempts: generationAttempts,
          image_quality_validated: imageQualityChecked,
          status: "published",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success("Product listed successfully!");
      navigate("/browse");

    } catch (error: any) {
      console.error("Error submitting form:", error);
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to create listing");
      }
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  // Render Step 1: Image Upload
  const renderUploadStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Upload Your Dress Photos</CardTitle>
        <CardDescription>
          Upload 1-3 clear photos of your dress. Front view is mandatory. We'll use AI to create a professional mannequin display.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Image Quality Tips:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Upload clear, well-lit photos (at least 1024px)</li>
              <li>Front view is essential</li>
              <li>Ensure dress is fully visible in frame</li>
              <li>Avoid busy backgrounds</li>
              <li>Model should be standing (not sitting)</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <Label>Upload Images (1-3 photos required)</Label>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              multiple
              onChange={handleImageChange}
              className="hidden"
              id="image-upload"
              disabled={imageFiles.length >= 3}
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Click to upload or drag and drop
              </span>
              <span className="text-xs text-muted-foreground">
                JPG or PNG (max 3 images)
              </span>
            </label>
          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-40 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                  {index === 0 && (
                    <span className="absolute bottom-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      Front View
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Button
          onClick={handleContinueToGeneration}
          disabled={imageFiles.length === 0}
          className="w-full"
          size="lg"
        >
          Continue to AI Generation
        </Button>
      </CardContent>
    </Card>
  );

  // Render Step 2: Generating
  const renderGeneratingStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-semibold">Creating Your Mannequin Preview</h3>
          <p className="text-muted-foreground">
            Please wait 10-15 seconds while AI generates a professional display...
          </p>
          <p className="text-sm text-muted-foreground">
            Attempt {generationAttempts} of {MAX_ATTEMPTS}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Render Step 3: Confirm
  const renderConfirmStep = () => {
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    return (
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Review Your Mannequin Image</CardTitle>
          <CardDescription>
            This is how your dress will appear publicly. Real photos stay private until booking confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {imageError && (
            <Alert variant="destructive">
              <AlertDescription>
                Failed to load AI-generated image. Please try regenerating.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <Label className="mb-2 block">AI Generated Mannequin (Public)</Label>
              <div className="relative">
                {imageLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg border">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}
                <img
                  src={aiCoverImage}
                  alt="AI Generated Mannequin"
                  className="w-full rounded-lg border"
                  onLoad={() => setImageLoading(false)}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                    console.error("Failed to load AI image:", aiCoverImage);
                  }}
                  style={{ display: imageLoading ? 'none' : 'block' }}
                />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Your Original Photo (Private)</Label>
              <img
                src={imagePreviews[0]}
                alt="Original"
                className="w-full rounded-lg border"
              />
            </div>
          </div>

        <Alert>
          <Check className="h-4 w-4" />
          <AlertDescription>
            The mannequin image will be the main product image. Real photos are only shared with confirmed bookings.
          </AlertDescription>
        </Alert>

        <div className="flex gap-4">
          <Button
            onClick={handleAcceptAI}
            size="lg"
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            Accept & Continue
          </Button>
          <Button
            onClick={handleRegenerateAI}
            variant="outline"
            size="lg"
            disabled={generationAttempts >= MAX_ATTEMPTS || generatingCover}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate ({MAX_ATTEMPTS - generationAttempts} left)
          </Button>
        </div>

        <Button
          onClick={handleBackToUpload}
          variant="ghost"
          className="w-full"
        >
          Back to Upload Different Images
        </Button>
      </CardContent>
    </Card>
    );
  };

  // Render Step 4: Product Details Form
  const renderDetailsStep = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add Product Details</CardTitle>
          <CardDescription>Fill in all required information about your product</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Details</h3>
            
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Elegant Bridal Red Lehnga with Heavy Embroidery"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                  required
                >
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
                    <SelectItem value="bags">Bags</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="condition">Condition *</Label>
                <Select
                  value={formData.condition}
                  onValueChange={(value) => setFormData({ ...formData, condition: value })}
                  required
                >
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

            <div>
              <Label htmlFor="listing_type">Listing Type *</Label>
              <Select
                value={formData.listing_type}
                onValueChange={(value) => setFormData({ ...formData, listing_type: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select listing type" />
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
            
            {(formData.listing_type === "rent" || formData.listing_type === "both") && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="rental_price_4days">4-Day Rental Price *</Label>
                  <Input
                    id="rental_price_4days"
                    type="number"
                    value={formData.rental_price_4days}
                    onChange={(e) => setFormData({ ...formData, rental_price_4days: e.target.value })}
                    placeholder="5000"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="extra_day_rate">Extra Day Rate</Label>
                  <Input
                    id="extra_day_rate"
                    type="number"
                    value={formData.extra_day_rate}
                    onChange={(e) => setFormData({ ...formData, extra_day_rate: e.target.value })}
                    placeholder="500"
                  />
                </div>
                <div>
                  <Label htmlFor="security_deposit">Security Deposit</Label>
                  <Input
                    id="security_deposit"
                    type="number"
                    value={formData.security_deposit}
                    onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                    placeholder="2000"
                  />
                </div>
              </div>
            )}

            {(formData.listing_type === "sale" || formData.listing_type === "both") && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="original_price">Original Price</Label>
                  <Input
                    id="original_price"
                    type="number"
                    value={formData.original_price}
                    onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                    placeholder="50000"
                  />
                </div>
                <div>
                  <Label htmlFor="sale_price">Sale Price *</Label>
                  <Input
                    id="sale_price"
                    type="number"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                    placeholder="35000"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your dress in detail..."
              rows={4}
              required
            />
          </div>

          {/* Fabric & Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Fabric & Details</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fabric">Fabric</Label>
                <Input
                  id="fabric"
                  value={formData.fabric}
                  onChange={(e) => setFormData({ ...formData, fabric: e.target.value })}
                  placeholder="e.g., Silk, Chiffon"
                />
              </div>
              <div>
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="e.g., Red, Maroon"
                />
              </div>
              <div>
                <Label htmlFor="work_type">Work Type</Label>
                <Input
                  id="work_type"
                  value={formData.work_type}
                  onChange={(e) => setFormData({ ...formData, work_type: e.target.value })}
                  placeholder="e.g., Hand Embroidery"
                />
              </div>
            </div>
          </div>

          {/* Size & Fit - NOW REQUIRED */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Size & Fit *</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="size">Size *</Label>
                <Select
                  value={formData.size}
                  onValueChange={(value) => setFormData({ ...formData, size: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xs">Extra Small (XS)</SelectItem>
                    <SelectItem value="s">Small (S)</SelectItem>
                    <SelectItem value="m">Medium (M)</SelectItem>
                    <SelectItem value="l">Large (L)</SelectItem>
                    <SelectItem value="xl">Extra Large (XL)</SelectItem>
                    <SelectItem value="xxl">XXL</SelectItem>
                    <SelectItem value="custom">Custom Size</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="height_range">Height Range</Label>
                <Input
                  id="height_range"
                  value={formData.height_range}
                  onChange={(e) => setFormData({ ...formData, height_range: e.target.value })}
                  placeholder="e.g., 5'2&quot; - 5'6&quot;"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="chest_size">Chest Size</Label>
                <Input
                  id="chest_size"
                  value={formData.chest_size}
                  onChange={(e) => setFormData({ ...formData, chest_size: e.target.value })}
                  placeholder="e.g., 36 inches"
                />
              </div>
              <div>
                <Label htmlFor="waist_size">Waist Size</Label>
                <Input
                  id="waist_size"
                  value={formData.waist_size}
                  onChange={(e) => setFormData({ ...formData, waist_size: e.target.value })}
                  placeholder="e.g., 28 inches"
                />
              </div>
              <div>
                <Label htmlFor="hips_size">Hips Size</Label>
                <Input
                  id="hips_size"
                  value={formData.hips_size}
                  onChange={(e) => setFormData({ ...formData, hips_size: e.target.value })}
                  placeholder="e.g., 38 inches"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="alteration_possible"
                checked={formData.alteration_possible}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, alteration_possible: checked as boolean })
                }
              />
              <Label htmlFor="alteration_possible" className="cursor-pointer">
                Alteration possible
              </Label>
            </div>
          </div>

          {/* NEW: Dry Clean Option */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Care Instructions *</h3>
            
            <div>
              <Label>Dry Clean Only? *</Label>
              <RadioGroup
                value={formData.dry_clean_only ? "yes" : "no"}
                onValueChange={(value) => setFormData({ ...formData, dry_clean_only: value === "yes" })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="dry-clean-yes" />
                  <Label htmlFor="dry-clean-yes" className="cursor-pointer">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="dry-clean-no" />
                  <Label htmlFor="dry-clean-no" className="cursor-pointer">No</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* NEW: Included Accessories */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Included Accessories</h3>
            
            <div className="space-y-2">
              <Label>What accessories are included? (select all that apply)</Label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "jewelry", label: "Jewelry" },
                  { id: "matching_footwear", label: "Matching Footwear" },
                  { id: "dupatta", label: "Dupatta" },
                  { id: "bag", label: "Bag/Clutch" },
                  { id: "belt", label: "Belt" },
                  { id: "other", label: "Other Accessories" },
                ].map((accessory) => (
                  <div key={accessory.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={accessory.id}
                      checked={includedAccessories.includes(accessory.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setIncludedAccessories([...includedAccessories, accessory.id]);
                        } else {
                          setIncludedAccessories(includedAccessories.filter(a => a !== accessory.id));
                        }
                      }}
                    />
                    <Label htmlFor={accessory.id} className="cursor-pointer">
                      {accessory.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Location - NOW REQUIRED */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Location *</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="e.g., Lahore, Karachi"
                  required
                />
              </div>
              <div>
                <Label htmlFor="area">Area *</Label>
                <Input
                  id="area"
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  placeholder="e.g., DHA Phase 5, Gulberg"
                  required
                />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your exact location will remain private until booking confirmation
            </p>
          </div>

          {/* Availability Calendar (only for rentals) */}
          {(formData.listing_type === "rent" || formData.listing_type === "both") && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Availability Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Mark dates when your dress is NOT available for rent
              </p>
              <AvailabilityCalendarManager
                blackoutDates={blackoutDates}
                onBlackoutDatesChange={setBlackoutDates}
              />
            </div>
          )}

          {/* Style Tips */}
          <div>
            <Label htmlFor="style_tips">Style Tips (Optional)</Label>
            <Textarea
              id="style_tips"
              value={formData.style_tips}
              onChange={(e) => setFormData({ ...formData, style_tips: e.target.value })}
              placeholder="Share styling suggestions or how to accessorize this dress..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleBackToUpload}
          className="w-32"
        >
          Start Over
        </Button>
        <Button
          type="submit"
          disabled={loading || uploadingImages}
          className="flex-1"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {uploadingImages ? "Uploading images..." : "Publishing..."}
            </>
          ) : (
            "Publish Listing"
          )}
        </Button>
      </div>
    </form>
  );

  // Main render based on current step
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        {/* Progress Indicator */}
        <div className="max-w-2xl mx-auto mb-8">
          <div className="flex items-center justify-between">
            {[
              { step: "upload", label: "Upload Photos", num: 1 },
              { step: "generating", label: "AI Generation", num: 2 },
              { step: "confirm", label: "Confirm", num: 3 },
              { step: "details", label: "Product Details", num: 4 },
            ].map((item, index) => {
              const getCurrentStepNum = () => {
                if (currentStep === "upload") return 1;
                if (currentStep === "generating") return 2;
                if (currentStep === "confirm") return 3;
                return 4;
              };
              
              const currentStepNum = getCurrentStepNum();
              const isActive = currentStep === item.step;
              const isCompleted = item.num < currentStepNum;
              
              return (
                <div key={item.step} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isActive || isCompleted
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted bg-muted text-muted-foreground"
                  }`}>
                    {item.num}
                  </div>
                  {index < 3 && (
                    <div className={`w-20 h-0.5 mx-2 ${
                      isCompleted ? "bg-primary" : "bg-muted"
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">Upload</span>
            <span className="text-xs text-muted-foreground">Generate</span>
            <span className="text-xs text-muted-foreground">Confirm</span>
            <span className="text-xs text-muted-foreground">Details</span>
          </div>
        </div>

        {/* Render current step */}
        {currentStep === "upload" && renderUploadStep()}
        {currentStep === "generating" && renderGeneratingStep()}
        {currentStep === "confirm" && renderConfirmStep()}
        {currentStep === "details" && renderDetailsStep()}
      </div>
    </div>
  );
};

export default ListDress;
