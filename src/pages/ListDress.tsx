import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Upload, Loader2, X, Check, AlertCircle, MapPin, ChevronRight, ChevronLeft, Info, Video, ExternalLink, Sparkles } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { z } from "zod";
import AvailabilityCalendarManagerFlatpickr from "@/components/AvailabilityCalendarManagerFlatpickr";
import GenderCategorySelector from "@/components/GenderCategorySelector";
import { Header } from "@/components/Header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { PAKISTAN_LOCATIONS, CITIES } from "@/data/locations";
import { useEarnings } from "@/hooks/useEarnings";
import { useReferralSystemEnabled } from "@/hooks/useReferralSystemEnabled";
import { useAiImageEnabled } from "@/hooks/useAiImageEnabled";

const listingSchema = z.object({
  title: z.string().min(10, "Title must be at least 10 characters").max(100),
  // Stored as a composite string like: women_barat, men_kurta, kids_boy_3-5_formal
  category: z.string().min(1, "Category is required"),
  condition: z.enum(["new", "like_new", "used_twice", "used_often"]),
  listing_type: z.enum(["rent", "sale"]),
  description: z.string().min(20, "Description must be at least 20 characters").max(1000),
  city: z.string().min(1, "City is required"),
  area: z.string().min(1, "Area is required"),
  size: z.string().min(1, "Size is required"),
  dry_clean_only: z.boolean(),
});

const ListDress = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editProductId = searchParams.get("edit");
  const [user, setUser] = useState<any>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(true);
  const { earnings, claimFirstProductBonus, processReferralBonus } = useEarnings();
  const { data: referralSettings } = useReferralSystemEnabled();
  const { aiImageEnabled } = useAiImageEnabled();
  
  // Multi-step wizard state
  type WizardStep = "upload" | "details" | "pricing" | "instructions" | "location" | "video";
  const [currentStep, setCurrentStep] = useState<WizardStep | "generating" | "confirm" | "success">("upload");
  const [createdProduct, setCreatedProduct] = useState<{id: string; title: string; image: string; price: string} | null>(null);
  
  // Step 1: Image upload
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [privateImageFiles, setPrivateImageFiles] = useState<File[]>([]);
  const [privateImagePreviews, setPrivateImagePreviews] = useState<string[]>([]);
  const [existingPrivateImagePaths, setExistingPrivateImagePaths] = useState<string[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [existingUploadedVideoPath, setExistingUploadedVideoPath] = useState<string | null>(null);
  const [imageQualityChecked, setImageQualityChecked] = useState(false);
  
  // Step 2 & 3: AI generation
  const [generatingCover, setGeneratingCover] = useState(false);
  const [aiCoverImage, setAiCoverImage] = useState<string>("");
  const [confirmImageLoading, setConfirmImageLoading] = useState(false);
  const [confirmImageError, setConfirmImageError] = useState(false);
  const [aiGenerationAttempts, setAiGenerationAttempts] = useState(0);
  const [aiGenerationError, setAiGenerationError] = useState<string | null>(null);
  const [currentAIProvider, setCurrentAIProvider] = useState<"lovable" | "openai">("lovable");
  const MAX_AI_GENERATIONS = 1;
  
  // Step 4: Product details
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [blackoutDates, setBlackoutDates] = useState<Date[]>([]);
  const [includedAccessories, setIncludedAccessories] = useState<string[]>([]);
  const [otherAccessoriesText, setOtherAccessoriesText] = useState<string>("");
  
  // Location dropdown state
  const [cityOpen, setCityOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  // Gender category state
  const [selectedGender, setSelectedGender] = useState("");
  const [selectedKidGender, setSelectedKidGender] = useState("");
  const [selectedAgeRange, setSelectedAgeRange] = useState("");

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
    contact_phone: "",
    pickup_location: "",
    dropoff_location: "",
    negotiation_allowed: true,
    dry_cleaned: false,
    alterations_allowed: false,
    video_url: "",
  });
  const [sameAsPickup, setSameAsPickup] = useState(false);

  // Fetch current AI model provider
  useEffect(() => {
    const fetchAIProvider = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "ai_image_model")
          .single();
        
        const settingValue = data?.value as { provider?: string } | null;
        if (settingValue?.provider) {
          setCurrentAIProvider(settingValue.provider as "lovable" | "openai");
        }
      } catch (error) {
        console.log("Using default AI provider");
      }
    };
    fetchAIProvider();
  }, []);

  useEffect(() => {
    const checkAccess = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }
      
      setUser(session.user);
      
      // Check if user is a super_admin
      const { data: superAdminRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "super_admin")
        .maybeSingle();
      
      const userIsSuperAdmin = !!superAdminRole;
      setIsSuperAdmin(userIsSuperAdmin);
      
      // Allow if user is bari OR super_admin
      const profileRole = session.user.user_metadata?.role;
      if (profileRole !== "bari" && !userIsSuperAdmin) {
        toast.error("Only Bari Behens can list dresses");
        navigate("/browse");
        return;
      }

      // Check WhatsApp verification for Bari Behens (super admins are exempt)
      if (profileRole === "bari" && !userIsSuperAdmin) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone_verified")
          .eq("user_id", session.user.id)
          .single();
        setPhoneVerified(!!profile?.phone_verified);
      }
    };
    
    checkAccess();
  }, [navigate]);

  // Load product data when in edit mode
  useEffect(() => {
    if (editProductId && user) {
      const loadProductData = async () => {
        try {
          // Super admins can edit any product, regular users can only edit their own
          let query = supabase
            .from("products")
            .select("*")
            .eq("id", editProductId);
          
          if (!isSuperAdmin) {
            query = query.eq("owner_id", user.id);
          }

          const { data: product, error } = await query.single();

          if (error) throw error;

          if (product) {
            setIsEditMode(true);
            setAiCoverImage(product.ai_cover_image || "");
            const publicImages = product.public_images?.length
              ? product.public_images
              : (product.ai_cover_image ? [product.ai_cover_image] : (product.real_images || []).slice(0, 3));
            setImagePreviews(publicImages);
            setExistingPrivateImagePaths(product.private_image_paths || []);
            setExistingUploadedVideoPath(product.uploaded_video_path || null);
            
            // Load form data
            setFormData({
              title: product.title || "",
              category: product.category || "",
              subcategory: product.subcategory || "",
              product_type: product.product_type || "dress",
              condition: product.condition || "",
              listing_type: product.listing_type || "",
              rental_price_per_day: product.rental_price_per_day?.toString() || "",
              rental_price_4days: product.rental_price_4days?.toString() || "",
              extra_day_rate: product.extra_day_rate?.toString() || "",
              original_price: product.original_price?.toString() || "",
              sale_price: product.sale_price?.toString() || "",
              security_deposit: product.security_deposit?.toString() || "",
              description: product.description || "",
              style_tips: product.style_tips || "",
              fabric: product.fabric || "",
              color: product.color || "",
              work_type: product.work_type || "",
              designer: product.designer || "",
              size: product.size || "",
              height_range: product.height_range || "",
              weight_range: product.weight_range || "",
              chest_size: product.chest_size || "",
              waist_size: product.waist_size || "",
              hips_size: product.hips_size || "",
              alteration_possible: product.alteration_possible || false,
              city: product.city || "",
              area: product.area || "",
              dry_clean_only: product.dry_clean_only || false,
              contact_phone: product.contact_phone || "",
              pickup_location: product.pickup_location || "",
              dropoff_location: product.dropoff_location || "",
              negotiation_allowed: product.negotiation_allowed !== false,
              dry_cleaned: product.dry_cleaned || false,
              alterations_allowed: product.alterations_allowed || false,
              video_url: product.video_url || "",
            });

            // Parse included accessories
            const accessories = Array.isArray(product.included_accessories) ? product.included_accessories as string[] : [];
            const otherEntry = accessories.find((a: string) => a.startsWith("other:"));
            if (otherEntry) {
              setOtherAccessoriesText(otherEntry.replace("other:", ""));
              setIncludedAccessories([...accessories.filter((a: string) => !a.startsWith("other:")), "other"]);
            } else {
              setIncludedAccessories(accessories);
            }
            
            // Load blackout dates
            if (product.availability_data && typeof product.availability_data === 'object') {
              const availData = product.availability_data as any;
              if (availData.blackout_dates) {
                setBlackoutDates(availData.blackout_dates.map((d: string) => new Date(d)));
              }
            }

            setCurrentStep("upload");
          }
        } catch (error: any) {
          console.error("Error loading product:", error);
          toast.error("Failed to load product data");
          navigate("/list-dress");
        }
      };

      loadProductData();
    }
  }, [editProductId, user, navigate, isSuperAdmin]);

  // STEP 1A: Primary images for AI generation (1-3 images)
  const handlePrimaryImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length > 3) {
      toast.error("Please upload maximum 3 images for AI generation");
      return;
    }

    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    for (const file of files.slice(0, 3)) {
      // Basic quality check - reduced minimum size for edited photos
      if (file.size < 50000) {
        toast.error(`${file.name} is too small. Please upload a higher quality photo.`);
        continue;
      }

      // Accept common image types including HEIC from phones
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
      const isValidType = file.type.startsWith("image/") || validTypes.includes(file.type.toLowerCase());
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid image file.`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Reset step state when replacing primary images
    setImageQualityChecked(false);
    setAiGenerationError(null);

    // Create previews for valid files
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result as string);
        if (newPreviews.length === validFiles.length) {
          setImagePreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });

    setImageFiles(validFiles);
  };

  // Registered-only original photos (up to 6)
  const handleAdditionalImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length + privateImageFiles.length + existingPrivateImagePaths.length > 6) {
      toast.error("Maximum 6 registered-only images allowed");
      return;
    }

    const newFiles = files.slice(0, 6 - privateImageFiles.length - existingPrivateImagePaths.length);

    // Basic quality check
    const validFiles: File[] = [];
    const validPreviews: string[] = [];

    newFiles.forEach((file) => {
      // Check file size - reduced minimum size for edited photos
      if (file.size < 50000) {
        toast.error(`${file.name} is too small. Please upload higher quality images.`);
        return;
      }

      // Accept common image types including HEIC from phones
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
      const isValidType = file.type.startsWith("image/") || validTypes.includes(file.type.toLowerCase());
      
      if (!isValidType) {
        toast.error(`${file.name} is not a valid image file.`);
        return;
      }

      validFiles.push(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        validPreviews.push(reader.result as string);
        if (validPreviews.length === validFiles.length) {
          setPrivateImagePreviews((prev) => [...prev, ...validPreviews]);
        }
      };
      reader.readAsDataURL(file);
    });

    setPrivateImageFiles((prev) => [...prev, ...validFiles]);
  };

  const removeImage = (index: number) => {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  const removePrivateImage = (index: number) => {
    setPrivateImageFiles((files) => files.filter((_, i) => i !== index));
    setPrivateImagePreviews((previews) => previews.filter((_, i) => i !== index));
  };

  const validateImageQuality = () => {
    if (imageFiles.length < 1 || imageFiles.length > 3) {
      toast.error("Please upload 1-3 clear images of your dress");
      return false;
    }

    // Additional quality checks can be added here
    setImageQualityChecked(true);
    return true;
  };

  const handleContinueToGeneration = () => {
    if (!validateImageQuality()) return;
    
    // Clear any previous error and move to generating step
    setAiGenerationError(null);
    setCurrentStep("generating");
    generateAICover();
  };

  // STEP 2: AI Generation
  const generateAICover = async () => {
    if (imageFiles.length === 0) {
      toast.error("Please upload at least one image first");
      return;
    }

    if (aiGenerationAttempts >= MAX_AI_GENERATIONS) {
      toast.error("Maximum AI image generations reached (3).");
      setAiGenerationError("Maximum AI image generations reached (3). Please try with different images.");
      setCurrentStep("upload");
      return;
    }

    setGeneratingCover(true);
    setAiGenerationAttempts(prev => prev + 1);
    setAiGenerationError(null);

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

      if (error) {
        const status = (error as any)?.context?.status as number | undefined;
        let errorMsg = error.message || "Unknown error occurred";

        if (status === 403) {
          errorMsg = "OpenAI hasn't enabled gpt-image-1 for this account yet. Please complete OpenAI organization verification and wait ~15 minutes.";
        } else if (status === 429) {
          errorMsg = "Rate limit exceeded. Please try again in a moment.";
        } else if (status === 402) {
          errorMsg = "OpenAI credits exhausted. Please check your OpenAI billing.";
        }

        setAiGenerationError(errorMsg);
        toast.error(errorMsg);
        setCurrentStep("upload");
        return;
      }

      if (data?.code === "RATE_LIMIT") {
        const errorMsg = "Rate limit exceeded. Please try again in a moment.";
        setAiGenerationError(errorMsg);
        toast.error(errorMsg);
        setCurrentStep("upload");
        return;
      }

      if (data?.code === "NO_CREDITS") {
        const errorMsg = "OpenAI credits exhausted. Please check your OpenAI billing.";
        setAiGenerationError(errorMsg);
        toast.error(errorMsg);
        setCurrentStep("upload");
        return;
      }

      if (data?.error) {
        const errorMsg = data.error;
        setAiGenerationError(errorMsg);
        toast.error(errorMsg);
        setCurrentStep("upload");
        return;
      }

      if (!data?.imageUrl) {
        const errorMsg = "No image URL received from AI service";
        setAiGenerationError(errorMsg);
        throw new Error(errorMsg);
      }

      setAiCoverImage(data.imageUrl);
      setConfirmImageLoading(true);
      setConfirmImageError(false);
      setCurrentStep("confirm");
      toast.success("AI Image generated successfully!");

    } catch (error: any) {
      console.error("AI generation error:", error);
      const errorMsg = error.message || "Failed to generate AI Image";
      setAiGenerationError(errorMsg);
      toast.error(errorMsg);
      setCurrentStep("upload");
    } finally {
      setGeneratingCover(false);
    }
  };

  // STEP 3: Confirm
  const handleAcceptAI = () => {
    setCurrentStep("details");
    toast.success("Great! Now let's add product details.");
  };

  // Skip AI and use real image as main
  const handleSkipAI = () => {
    // Use first uploaded image as the cover instead of AI
    if (imagePreviews.length > 0) {
      setAiCoverImage(imagePreviews[0]);
      setCurrentStep("details");
      toast.success("Using your real image as main product image.");
    }
  };

  const wizardSteps: Array<{ step: WizardStep; label: string }> = [
    { step: "upload", label: "Images" },
    { step: "details", label: "Details" },
    { step: "pricing", label: "Pricing" },
    { step: "instructions", label: "Instructions" },
    { step: "location", label: "Location & Delivery" },
    { step: "video", label: "Video" },
  ];

  const goToStep = (step: WizardStep) => setCurrentStep(step);

  const continueFromImages = () => {
    if (!isEditMode && !validateImageQuality()) return;
    if (imagePreviews.length === 0) {
      toast.error("Please add at least one main image");
      return;
    }
    if (!aiCoverImage) setAiCoverImage(imagePreviews[0]);
    goToStep("details");
  };

  const continueFromDetails = () => {
    const result = listingSchema.pick({ title: true, category: true, condition: true, description: true, size: true }).safeParse(formData);
    if (!result.success) {
      toast.error(result.error.errors[0]?.message || "Please complete the required details");
      return;
    }
    goToStep("pricing");
  };

  const continueFromPricing = () => {
    if (!formData.listing_type) return void toast.error("Please select rent or sale");
    if (formData.listing_type === "rent" && !formData.rental_price_4days) return void toast.error("Please enter the 4-day rental price");
    if (formData.listing_type === "sale" && !formData.sale_price) return void toast.error("Please enter the sale price");
    goToStep("instructions");
  };

  const continueFromLocation = () => {
    if (!formData.city || !formData.area || !formData.pickup_location) return void toast.error("Please complete the required location details");
    if (formData.listing_type === "sale" && !formData.contact_phone) return void toast.error("Please enter a contact phone number");
    if (formData.listing_type === "rent" && !formData.dropoff_location) return void toast.error("Please enter the drop-off location");
    goToStep("video");
  };

  const handleBackToUpload = () => {
    setCurrentStep("upload");
    setAiCoverImage("");
    setConfirmImageLoading(false);
    setConfirmImageError(false);
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

  const uploadPrivateFiles = async () => {
    if (!user) throw new Error("Please sign in again");
    const paths: string[] = [];
    for (const file of privateImageFiles) {
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/images/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("product-private-media").upload(path, file);
      if (error) throw error;
      paths.push(path);
    }
    let uploadedVideoPath: string | null = null;
    if (videoFile) {
      const extension = videoFile.name.split(".").pop() || "mp4";
      uploadedVideoPath = `${user.id}/videos/${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from("product-private-media").upload(uploadedVideoPath, videoFile);
      if (error) throw error;
    }
    return { paths, uploadedVideoPath };
  };

  // STEP 4: Final form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.video_url && !videoFile && !existingUploadedVideoPath) {
      toast.error("Please upload a product video or paste a public video link");
      return;
    }

    // Gate: Bari Behens must verify their WhatsApp number before uploading
    if (!isSuperAdmin && !phoneVerified) {
      toast.error("Please verify your WhatsApp number before uploading products");
      navigate("/profile");
      return;
    }


    try {
      // Validate form data
      listingSchema.parse({
        ...formData,
        dry_clean_only: formData.dry_clean_only,
      });

      setLoading(true);

      // Only upload new images if provided (for create mode or if user uploads new ones in edit mode)
      let realImageUrls: string[] = [];
      if (imageFiles.length > 0) {
        setUploadingImages(true);
        realImageUrls = await uploadImages();
        setUploadingImages(false);
      }
      const privateUploads = await uploadPrivateFiles();

      // Prepare availability data
      const availabilityData = {
        blackout_dates: blackoutDates.map(date => date.toISOString()),
        available_dates: []
      };

      const productData = {
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
        availability_data: availabilityData,
        dry_clean_only: formData.dry_clean_only,
        included_accessories: includedAccessories.includes("other") && otherAccessoriesText 
          ? [...includedAccessories.filter(a => a !== "other"), `other:${otherAccessoriesText}`]
          : includedAccessories,
        contact_phone: formData.contact_phone || null,
        pickup_location: formData.pickup_location || null,
        dropoff_location: formData.dropoff_location || null,
        negotiation_allowed: formData.negotiation_allowed,
        dry_cleaned: formData.listing_type === "rent" ? formData.dry_cleaned : null,
        alterations_allowed: formData.listing_type === "rent" ? formData.alterations_allowed : null,
        video_url: formData.video_url || null,
        public_images: realImageUrls.length > 0 ? realImageUrls.slice(0, 3) : imagePreviews.slice(0, 3),
        private_image_paths: [...existingPrivateImagePaths, ...privateUploads.paths].slice(0, 6),
        uploaded_video_path: privateUploads.uploadedVideoPath || existingUploadedVideoPath,
        updated_at: new Date().toISOString(),
      };

      if (isEditMode && editProductId) {
        // Update existing product
        const updateData = {
          ...productData,
          ...(realImageUrls.length > 0 && { real_images: realImageUrls }),
        };

        const { error: updateError } = await supabase
          .from("products")
          .update(updateData)
          .eq("id", editProductId)
          .eq("owner_id", user.id);

        if (updateError) throw updateError;

        toast.success("Product updated successfully!");
        navigate("/browse");
      } else {
        // Create new product
        const { data: insertedProduct, error: insertError } = await supabase
          .from("products")
          .insert({
            ...productData,
            owner_id: user.id,
            // When AI generation is off (or skipped), use the seller's own uploaded photo
            ai_cover_image: aiCoverImage.startsWith("data:")
              ? (realImageUrls[0] || null)
              : (aiCoverImage || realImageUrls[0] || null),
            real_images: realImageUrls,
            ai_generation_attempts: 1,
            image_quality_validated: imageQualityChecked,
            status: "published",
          })
          .select("id")
          .single();

        if (insertError) throw insertError;

        // Check and claim first product bonus (only if yourBalanceEnabled is on)
        if (insertedProduct && !earnings?.first_product_bonus_claimed && referralSettings?.yourBalanceEnabled) {
          const bonusClaimed = await claimFirstProductBonus(insertedProduct.id);
          
          if (bonusClaimed) {
            // Re-fetch earnings to get the referred_by field (might have been created by trigger)
            const { data: updatedEarnings } = await supabase
              .from("user_earnings")
              .select("referred_by")
              .eq("user_id", user.id)
              .single();
            
            // Check if user was referred and process referral bonus
            if (updatedEarnings?.referred_by) {
              await processReferralBonus(updatedEarnings.referred_by, user.id);
              
              // Show combined bonus message
              toast.success(
                <div className="space-y-1">
                  <p className="font-bold text-lg">🎉 Congratulations!</p>
                  <p>You earned <span className="font-bold text-primary">PKR 250 + 150 = 400</span>!</p>
                  <p className="text-sm text-muted-foreground">Refer more friends to earn more money!</p>
                </div>,
                { duration: 8000 }
              );
              
              // Send email notifications to both users
              try {
                await supabase.functions.invoke("send-notifications", {
                  body: {
                    type: "referral_bonus",
                    referrer_id: updatedEarnings.referred_by,
                    new_user_id: user.id,
                  },
                });
              } catch (emailError) {
                console.error("Error sending referral emails:", emailError);
              }
            }
          }
        }

        // Store product info and show success screen
        const priceDisplay = formData.listing_type === "rent" 
          ? `PKR ${formData.rental_price_per_day || formData.rental_price_4days}/day`
          : `PKR ${formData.sale_price}`;
        
        setCreatedProduct({
          id: insertedProduct.id,
          title: formData.title,
          image: aiCoverImage,
          price: priceDisplay,
        });
        setCurrentStep("success");
      }

    } catch (error: any) {
      console.error("Error submitting form:", error);
      if (error instanceof z.ZodError) {
        const errorMessages = error.errors.map(e => `• ${e.message}`).join('\n');
        toast.error(
          <div className="space-y-1">
            <p className="font-semibold">Please fix the following:</p>
            <ul className="text-sm">
              {error.errors.map((e, i) => (
                <li key={i}>• {e.message}</li>
              ))}
            </ul>
          </div>,
          { duration: 5000 }
        );
      } else {
        toast.error(error.message || (isEditMode ? "Failed to update listing" : "Failed to create listing"));
      }
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  // Render Step 1: Image Upload
  const renderUploadStep = () => (
    <div className="max-w-2xl mx-auto space-y-4">
    {!isSuperAdmin && !phoneVerified && (
      <Alert className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Your WhatsApp number is not verified yet.</strong> You need to verify it before you can publish a product.{" "}
          <button type="button" onClick={() => navigate("/profile")} className="underline font-medium">
            Verify now
          </button>
        </AlertDescription>
      </Alert>
    )}
    <Card>

      <CardHeader>
        <CardTitle className="text-2xl">Upload Your Dress Photos</CardTitle>
        <CardDescription>
          {aiImageEnabled
            ? "Upload 1-3 clear photos of your dress. We'll generate a public AI Image that keeps your real photos private."
            : "Upload 1-3 clear original photos of your dress. Your first photo will be the main product photo."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {aiGenerationError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>AI Generation Failed:</strong> {aiGenerationError}
            </AlertDescription>
          </Alert>
        )}
        
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

        {aiImageEnabled && (
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              <strong>Privacy note:</strong> Your public AI Image will look ~98% similar to your real photo, but your real photo stays private so nobody can tell it’s rented or pre-loved.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <Label>Main Images (1-3 photos)</Label>
          <p className="text-sm text-muted-foreground">These images will be shown to non-registered users.</p>
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handlePrimaryImageChange}
              className="hidden"
              id="image-upload"
              multiple
            />
            <label
              htmlFor="image-upload"
              className="cursor-pointer flex flex-col items-center space-y-2"
            >
              <Upload className="h-12 w-12 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload or drag and drop</span>
              <span className="text-xs text-muted-foreground">JPG or PNG (up to 3 images)</span>
            </label>
          </div>

          {imagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-4">
              {imagePreviews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg"
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
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4 border-t pt-6">
          <div>
            <Label>More Original Images (up to 6)</Label>
            <p className="text-sm text-muted-foreground">These images will only be seen by registered users.</p>
          </div>
          <div className="border-2 border-dashed rounded-lg p-6 text-center">
            <input id="private-image-upload" type="file" accept="image/*" multiple className="hidden" onChange={handleAdditionalImagesChange} />
            <label htmlFor="private-image-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload className="h-10 w-10 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload members-only photos</span>
            </label>
          </div>
          {privateImagePreviews.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {privateImagePreviews.map((preview, index) => (
                <div key={preview} className="relative">
                  <img src={preview} alt={`Members-only preview ${index + 1}`} className="h-28 w-full rounded-md object-cover" />
                  <Button type="button" variant="destructive" size="icon" className="absolute right-1 top-1 h-7 w-7" onClick={() => removePrivateImage(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {existingPrivateImagePaths.length > 0 && <p className="text-xs text-muted-foreground">{existingPrivateImagePaths.length} protected image(s) already saved.</p>}
        </div>

        {aiImageEnabled ? (
          <>
            <Button
              onClick={handleContinueToGeneration}
              disabled={imageFiles.length < 1 || imageFiles.length > 3}
              className="w-full"
              size="lg"
            >
              Generate AI Image
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <Button
              onClick={continueFromImages}
              disabled={imagePreviews.length < 1}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Skip AI - Use My Image
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              If you have a very clear, professional-looking photo with plain background, you can use it directly as your main product image.
            </p>
          </>
        ) : (
          <>
            <Button
              onClick={continueFromImages}
              disabled={imagePreviews.length < 1 || imagePreviews.length > 3}
              className="w-full"
              size="lg"
            >
              Continue with My Photos
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
              Your first photo will be used as the main product photo.
            </p>
          </>
        )}
      </CardContent>
    </Card>
    </div>
  );


  // Render Step 2: Generating
  const renderGeneratingStep = () => (
    <Card className="max-w-2xl mx-auto">
      <CardContent className="flex flex-col items-center justify-center py-16 space-y-6">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <div className="text-center space-y-2">
          <h3 className="text-2xl font-semibold">Creating Your AI Image Preview</h3>
          <p className="text-muted-foreground">
            Please wait 10-15 seconds while AI generates a professional display...
          </p>
          <p className="text-xs text-muted-foreground mt-4">
            AI is processing your image...
          </p>
        </div>
      </CardContent>
    </Card>
  );

  // Render Step 3: Confirm
  const renderConfirmStep = () => (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-2xl">Review Your AI Image</CardTitle>
        <CardDescription>
          This is how your dress will appear publicly. Real photos stay private until booking confirmation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {confirmImageError && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load AI-generated image. Please try regenerating.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label className="mb-2 block">AI Generated Image (Public)</Label>
            <div className="relative">
              {confirmImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg border">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}
              <img
                src={aiCoverImage}
                alt="AI Generated Image"
                className="w-full rounded-lg border"
                onLoad={() => setConfirmImageLoading(false)}
                onError={() => {
                  setConfirmImageLoading(false);
                  setConfirmImageError(true);
                  console.error("Failed to load AI image:", aiCoverImage);
                }}
                style={{ display: confirmImageLoading ? 'none' : 'block' }}
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
            The AI Image will be the main product image. Real photos are only shared with confirmed bookings.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <Button
            onClick={handleAcceptAI}
            size="lg"
            className="w-full"
          >
            <Check className="mr-2 h-4 w-4" />
            Accept & Continue
          </Button>

          <Button
            onClick={handleSkipAI}
            variant="outline"
            className="w-full"
          >
            Use My Original Image Instead
          </Button>

          <Button
            onClick={handleBackToUpload}
            variant="ghost"
            className="w-full"
          >
            Back to Upload Different Images
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  // Render Step 4: Product Details Form
  const renderDetailsStep = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{wizardSteps.find((item) => item.step === currentStep)?.label}</CardTitle>
          <CardDescription>Complete this section, then continue to the next step.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Additional Real Images */}
          <div className="hidden">
            <h3 className="text-lg font-semibold">Product Images (Optional)</h3>
            <p className="text-sm text-muted-foreground">
              Add more real images of your product. These will only be visible to confirmed bookings.
            </p>
            
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg"
                  multiple
                  onChange={handleAdditionalImagesChange}
                  className="hidden"
                  id="additional-image-upload"
                  disabled={imageFiles.length >= 5}
                />
                <label
                  htmlFor="additional-image-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {imageFiles.length > 0 ? `${imageFiles.length} image(s) selected` : 'Click to add more images'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    JPG or PNG (max 5 images total)
                  </span>
                </label>
              </div>

              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-5 gap-3">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Gender & Category Selection */}
          <div className={currentStep === "details" ? "space-y-4" : "hidden"}>
            <h3 className="text-lg font-semibold">Who is this for?</h3>
            
            <GenderCategorySelector
              gender={selectedGender}
              kidGender={selectedKidGender}
              ageRange={selectedAgeRange}
              category={formData.category}
              subcategory={formData.subcategory}
              onGenderChange={(g) => {
                setSelectedGender(g);
                // Reset category fields (use functional update to avoid stale state)
                setFormData((prev) => ({ ...prev, category: "", subcategory: "" }));
              }}
              onKidGenderChange={setSelectedKidGender}
              onAgeRangeChange={setSelectedAgeRange}
              onCategoryChange={(cat) => {
                // Build composite category string for storage
                let compositeCategory = "";
                if (selectedGender === "kids") {
                  compositeCategory = `kids_${selectedKidGender}_${selectedAgeRange}_${cat}`;
                } else {
                  compositeCategory = `${selectedGender}_${cat}`;
                }
                setFormData((prev) => ({ ...prev, category: compositeCategory, subcategory: cat }));
              }}
              onSubcategoryChange={(sub) =>
                setFormData((prev) => ({ ...prev, subcategory: sub }))
              }
            />
          </div>

          {/* Basic Details */}
          <div className={currentStep === "details" ? "space-y-4" : "hidden"}>
            <h3 className="text-lg font-semibold">Basic Details</h3>
            
            <div className={currentStep === "pricing" ? "block" : "hidden"}>
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
                  <SelectItem value="rent">For Rent</SelectItem>
                  <SelectItem value="sale">For Sale</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing */}
          <div className={currentStep === "pricing" ? "space-y-4" : "hidden"}>
            <h3 className="text-lg font-semibold">Pricing</h3>
            
            {formData.listing_type === "rent" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="original_price_rent">Original Price (Market Value) *</Label>
                    <Input
                      id="original_price_rent"
                      type="number"
                      value={formData.original_price}
                      onChange={(e) => setFormData({ ...formData, original_price: e.target.value })}
                      placeholder="50000"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This helps show the discount % to renters
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="rental_price_4days">4-Day Rental Price *</Label>
                    <Input
                      id="rental_price_4days"
                      type="number"
                      value={formData.rental_price_4days}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (formData.original_price && parseFloat(value) > parseFloat(formData.original_price)) {
                          toast.error("Rental price cannot be higher than original price");
                        }
                        setFormData({ ...formData, rental_price_4days: value });
                      }}
                      placeholder="5000"
                      required
                      className={formData.original_price && formData.rental_price_4days && parseFloat(formData.rental_price_4days) > parseFloat(formData.original_price) ? "border-destructive" : ""}
                    />
                    {formData.original_price && formData.rental_price_4days && (
                      <p className="text-xs text-primary mt-1 font-medium">
                        {Math.round(((parseFloat(formData.original_price) - parseFloat(formData.rental_price_4days)) / parseFloat(formData.original_price)) * 100)}% savings shown to renters
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    <div className="flex items-center gap-1">
                      <Label htmlFor="security_deposit">Security Deposit</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-[280px] p-3">
                            <p className="text-sm font-medium mb-1">How to decide security deposit?</p>
                            <p className="text-xs text-muted-foreground">
                              Imagine the second-hand resale price for this dress. Subtract the rental price from it. 
                              The remaining amount is your security deposit.
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              <strong>Example:</strong> If resale value is PKR 15,000 and rental is PKR 5,000, 
                              security deposit = PKR 10,000
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="security_deposit"
                      type="number"
                      value={formData.security_deposit}
                      onChange={(e) => setFormData({ ...formData, security_deposit: e.target.value })}
                      placeholder="2000"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">
                      You can take Choti Behen's ID card only, or ID card with security deposit. Behen.pk is only responsible to contact you both it's not our responsibility to check returned clothes and security returns
                    </p>
                  </div>
                </div>
              </div>
            )}

            {formData.listing_type === "sale" && (
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
                    onChange={(e) => {
                      const value = e.target.value;
                      if (formData.original_price && parseFloat(value) > parseFloat(formData.original_price)) {
                        toast.error("Sale price cannot be higher than original price");
                      }
                      setFormData({ ...formData, sale_price: value });
                    }}
                    placeholder="35000"
                    required
                    className={formData.original_price && formData.sale_price && parseFloat(formData.sale_price) > parseFloat(formData.original_price) ? "border-destructive" : ""}
                  />
                  {formData.original_price && formData.sale_price && parseFloat(formData.sale_price) > parseFloat(formData.original_price) && (
                    <p className="text-sm text-destructive mt-1">Sale price cannot be higher than original price</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className={currentStep === "details" ? "block" : "hidden"}>
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
          <div className={currentStep === "details" ? "space-y-4" : "hidden"}>
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
          <div className={currentStep === "details" ? "space-y-4" : "hidden"}>
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
                    <SelectItem value="XS">Extra Small (XS)</SelectItem>
                    <SelectItem value="S">Small (S)</SelectItem>
                    <SelectItem value="M">Medium (M)</SelectItem>
                    <SelectItem value="L">Large (L)</SelectItem>
                    <SelectItem value="XL">Extra Large (XL)</SelectItem>
                    <SelectItem value="XXL">XXL</SelectItem>
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
          <div className={currentStep === "instructions" ? "space-y-4" : "hidden"}>
            <h3 className="text-lg font-semibold">Care Instructions *</h3>
            
            <div className={currentStep === "pricing" ? "block" : "hidden"}>
              <Label>Requires Dry Cleaning After Use? *</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Let renters know if this item must be professionally dry cleaned after use
              </p>
              <RadioGroup
                value={formData.dry_clean_only ? "yes" : "no"}
                onValueChange={(value) => setFormData({ ...formData, dry_clean_only: value === "yes" })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="dry-clean-yes" />
                  <Label htmlFor="dry-clean-yes" className="cursor-pointer">Yes - Must be dry cleaned</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="dry-clean-no" />
                  <Label htmlFor="dry-clean-no" className="cursor-pointer">No - Regular wash is fine</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Negotiation Toggle */}
            <div>
              <Label>Allow Price Negotiation? *</Label>
              <RadioGroup
                value={formData.negotiation_allowed ? "yes" : "no"}
                onValueChange={(value) => setFormData({ ...formData, negotiation_allowed: value === "yes" })}
                className="flex gap-4 mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="negotiation-yes" />
                  <Label htmlFor="negotiation-yes" className="cursor-pointer">Yes - Buyers can chat to negotiate</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="negotiation-no" />
                  <Label htmlFor="negotiation-no" className="cursor-pointer">No - Fixed price only</Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground mt-1">
                If disabled, buyers won't see the "Chat to Negotiate" option
              </p>
            </div>

            {/* Rental-specific fields for Instruction Page */}
            {formData.listing_type === "rent" && (
              <>
                <div>
                  <Label>Has this dress been dry cleaned? *</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    This will be shown on the rental instruction page for the renter
                  </p>
                  <RadioGroup
                    value={formData.dry_cleaned ? "yes" : "no"}
                    onValueChange={(value) => setFormData({ ...formData, dry_cleaned: value === "yes" })}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="dry-cleaned-status-yes" />
                      <Label htmlFor="dry-cleaned-status-yes" className="cursor-pointer">Yes - Dress has been dry cleaned</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="dry-cleaned-status-no" />
                      <Label htmlFor="dry-cleaned-status-no" className="cursor-pointer">No - Not dry cleaned</Label>
                    </div>
                  </RadioGroup>
                </div>

                <div>
                  <Label>Allow temporary alterations? *</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    This will be shown on the rental instruction page for the renter
                  </p>
                  <RadioGroup
                    value={formData.alterations_allowed ? "yes" : "no"}
                    onValueChange={(value) => setFormData({ ...formData, alterations_allowed: value === "yes" })}
                    className="flex gap-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="yes" id="alterations-allowed-yes" />
                      <Label htmlFor="alterations-allowed-yes" className="cursor-pointer">Yes - Temporary alterations allowed (must be reversed)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="no" id="alterations-allowed-no" />
                      <Label htmlFor="alterations-allowed-no" className="cursor-pointer">No - No alterations allowed</Label>
                    </div>
                  </RadioGroup>
                </div>
              </>
            )}
          </div>

          {/* NEW: Included Accessories */}
          <div className={currentStep === "details" ? "space-y-4" : "hidden"}>
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
                          // Clear text if unchecking "other"
                          if (accessory.id === "other") {
                            setOtherAccessoriesText("");
                          }
                        }
                      }}
                    />
                    <Label htmlFor={accessory.id} className="cursor-pointer">
                      {accessory.label}
                    </Label>
                  </div>
                ))}
              </div>
              
              {/* Text field for "Other" accessories */}
              {includedAccessories.includes("other") && (
                <div className="mt-3">
                  <Label htmlFor="other_accessories_text">Please specify other accessories</Label>
                  <Input
                    id="other_accessories_text"
                    value={otherAccessoriesText}
                    onChange={(e) => setOtherAccessoriesText(e.target.value)}
                    placeholder="e.g., Hair pins, Matha Patti, Bangles set"
                    className="mt-1"
                  />
                </div>
              )}
            </div>
          </div>

          <div className={currentStep === "location" ? "space-y-4" : "hidden"}>
            <h3 className="text-lg font-semibold">Location *</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City *</Label>
                <Popover open={cityOpen} onOpenChange={setCityOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      role="combobox" 
                      className="w-full justify-between mt-1"
                    >
                      <span className="flex items-center truncate">
                        <MapPin className="mr-2 h-4 w-4 shrink-0" />
                        {formData.city || "Select City"}
                      </span>
                      <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-0 z-[200]" align="start">
                    <Command>
                      <CommandInput placeholder="Search city..." />
                      <CommandList>
                        <CommandEmpty>No city found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {CITIES.map((city) => (
                            <CommandItem
                              key={city}
                              value={city}
                              onSelect={() => {
                                setFormData({ ...formData, city: city, area: "" });
                                setCityOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.city === city ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {city}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="area">Area *</Label>
                <Popover open={areaOpen} onOpenChange={setAreaOpen}>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      role="combobox" 
                      className="w-full justify-between mt-1"
                      disabled={!formData.city}
                    >
                      <span className="truncate">
                        {formData.area || "Select Area"}
                      </span>
                      <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-0 z-[200]" align="start">
                    <Command>
                      <CommandInput placeholder="Search area..." />
                      <CommandList>
                        <CommandEmpty>No area found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                          {(PAKISTAN_LOCATIONS[formData.city] || []).map((area) => (
                            <CommandItem
                              key={area}
                              value={area}
                              onSelect={() => {
                                setFormData({ ...formData, area: area });
                                setAreaOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.area === area ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {area}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Your exact location will remain private until booking confirmation
            </p>
          </div>

          {/* Pickup & Contact Details - Conditional based on listing type */}
          {formData.listing_type && (
            <div className={currentStep === "location" ? "space-y-4" : "hidden"}>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                {formData.listing_type === "sale" ? "Contact & Pickup Details *" : "Pickup & Dropoff Details *"}
              </h3>
              
              {formData.listing_type === "sale" ? (
                // Sale: Show contact phone + pickup location
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact_phone">Contact Phone *</Label>
                    <Input
                      id="contact_phone"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      placeholder="e.g., 03xx-xxxxxxx"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This will be shared with buyer after payment verification
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="pickup_location">Pickup Location *</Label>
                    <Input
                      id="pickup_location"
                      value={formData.pickup_location}
                      onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                      placeholder="e.g., DHA Phase 5, near Park"
                      required
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Where buyer will collect the product
                    </p>
                  </div>
                </div>
              ) : (
                // Rent: Show pickup + dropoff locations
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="pickup_location">Pickup Location *</Label>
                      <Input
                        id="pickup_location"
                        value={formData.pickup_location}
                        onChange={(e) => setFormData({ ...formData, pickup_location: e.target.value })}
                        placeholder="e.g., DHA Phase 5, near Park"
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Where renter will collect the product
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="dropoff_location">Dropoff Location *</Label>
                      <Input
                        id="dropoff_location"
                        value={sameAsPickup ? formData.pickup_location : formData.dropoff_location}
                        onChange={(e) => setFormData({ ...formData, dropoff_location: e.target.value })}
                        placeholder="e.g., Same as pickup"
                        disabled={sameAsPickup}
                        required
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Where renter will return the product
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="same_as_pickup"
                      checked={sameAsPickup}
                      onCheckedChange={(checked) => {
                        setSameAsPickup(checked as boolean);
                        if (checked) {
                          setFormData({ ...formData, dropoff_location: formData.pickup_location });
                        }
                      }}
                    />
                    <Label htmlFor="same_as_pickup" className="cursor-pointer text-sm">
                      Dropoff location is same as pickup
                    </Label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Availability Calendar (only for rentals) */}
          {currentStep === "pricing" && formData.listing_type === "rent" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Availability Calendar</h3>
              <p className="text-sm text-muted-foreground">
                Mark dates when your dress is NOT available for rent
              </p>
              <AvailabilityCalendarManagerFlatpickr
                blackoutDates={blackoutDates}
                onBlackoutDatesChange={setBlackoutDates}
              />
            </div>
          )}

          {/* Style Tips */}
          <div className={currentStep === "instructions" ? "block" : "hidden"}>
            <Label htmlFor="style_tips">Style Tips (Optional)</Label>
            <Textarea
              id="style_tips"
              value={formData.style_tips}
              onChange={(e) => setFormData({ ...formData, style_tips: e.target.value })}
              placeholder="Share styling suggestions or how to accessorize this dress..."
              rows={3}
            />
          </div>

          {/* Product Video URL */}
          <div className={currentStep === "video" ? "space-y-5" : "hidden"}>
            <div className="flex items-center gap-2">
              <Video className="h-5 w-5 text-primary" />
              <Label htmlFor="video_url">Product Video *</Label>
            </div>
            <Alert className="bg-primary/5 border-primary/20">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertDescription className="text-sm">
                <strong className="text-primary">A product video is required.</strong>
                <br />
                Upload your video to YouTube, Google Drive, or Vimeo and paste the link below.
              </AlertDescription>
            </Alert>
            <Input
              id="video_url"
              value={formData.video_url}
              onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
              placeholder="e.g., https://www.youtube.com/watch?v=... or https://drive.google.com/..."
              type="url"
            />
            <div className="relative py-1 text-center text-xs text-muted-foreground">OR</div>
            <div className="space-y-2">
              <Label htmlFor="video-file">Upload video file</Label>
              <Input
                id="video-file"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(event) => setVideoFile(event.target.files?.[0] || null)}
              />
              {(videoFile || existingUploadedVideoPath) && (
                <p className="text-xs text-muted-foreground">{videoFile?.name || "A private video is already saved."}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" />
              Supported: YouTube, Google Drive, Vimeo, or any public video link
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const index = wizardSteps.findIndex((item) => item.step === currentStep);
            if (index > 0) goToStep(wizardSteps[index - 1].step);
          }}
          disabled={currentStep === "details"}
        >
          <ChevronLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {currentStep !== "video" ? (
          <Button type="button" className="flex-1" onClick={() => {
            if (currentStep === "details") continueFromDetails();
            else if (currentStep === "pricing") continueFromPricing();
            else if (currentStep === "instructions") goToStep("location");
            else if (currentStep === "location") continueFromLocation();
          }}>Continue <ChevronRight className="ml-2 h-4 w-4" /></Button>
        ) : (
          <Button type="submit" disabled={loading || uploadingImages || (!formData.video_url && !videoFile && !existingUploadedVideoPath)} className="flex-1" size="lg">
            {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{uploadingImages ? "Uploading..." : "Publishing..."}</> : "Publish Listing"}
          </Button>
        )}
      </div>
    </form>
  );

  // Render Success Step
  const handleListAnother = () => {
    // Reset all form state
    setCurrentStep("upload");
    setImageFiles([]);
    setImagePreviews([]);
    setImageQualityChecked(false);
    setAiCoverImage("");
    setAiGenerationAttempts(0);
    setAiGenerationError(null);
    setBlackoutDates([]);
    setIncludedAccessories([]);
    setCreatedProduct(null);
    setFormData({
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
      contact_phone: "",
      pickup_location: "",
      dropoff_location: "",
      negotiation_allowed: true,
        dry_cleaned: false,
        alterations_allowed: false,
        video_url: "",
    });
  };

  const renderSuccessStep = () => (
    <Card className="max-w-lg mx-auto text-center">
      <CardHeader className="pb-2">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Congratulations! 🎉</CardTitle>
        <CardDescription className="text-base">
          Your product has been listed successfully!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Product Preview */}
        {createdProduct && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="aspect-[3/4] w-40 mx-auto rounded-lg overflow-hidden border">
              <img 
                src={createdProduct.image} 
                alt={createdProduct.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h3 className="font-semibold truncate">{createdProduct.title}</h3>
              <p className="text-primary font-medium">{createdProduct.price}</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button 
            onClick={handleListAnother}
            size="lg"
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            List Another Product
          </Button>
          <Button 
            variant="outline"
            onClick={() => navigate("/browse")}
            size="lg"
            className="w-full"
          >
            Browse Products
          </Button>
          {createdProduct && (
            <Button 
              variant="ghost"
              onClick={() => navigate(`/product/${createdProduct.id}`)}
              size="sm"
              className="text-muted-foreground"
            >
              View Your Listing
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Main render based on current step
  if (currentStep === "success") {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          {renderSuccessStep()}
        </div>
      </div>
    );
  }

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
