import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, CreditCard, Loader2, Image, AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";

interface PaymentUploadSectionProps {
  booking: any;
  isRenter: boolean;
  onUploadComplete: () => void;
}

export default function PaymentUploadSection({ booking, isRenter, onUploadComplete }: PaymentUploadSectionProps) {
  const [uploading, setUploading] = useState(false);
  const [paymentNote, setPaymentNote] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (JPG, PNG)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      const img = new window.Image();

      img.onload = () => {
        // Max dimensions
        const maxWidth = 1200;
        const maxHeight = 1200;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => resolve(blob!),
          "image/jpeg",
          0.8
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a payment screenshot");
      return;
    }

    setUploading(true);
    try {
      // Compress image
      const compressedBlob = await compressImage(selectedFile);
      
      // Generate unique filename
      const filename = `${booking.id}/${Date.now()}_payment_proof.jpg`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("booking-videos")
        .upload(filename, compressedBlob, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("booking-videos")
        .getPublicUrl(filename);

      // Update booking with payment proof
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          payment_proof_url: urlData.publicUrl,
          payment_notes: paymentNote || null,
          payment_status: "submitted",
          booking_status: "payment_submitted",
        })
        .eq("id", booking.id);

      if (updateError) throw updateError;

      toast.success("Payment proof uploaded! Admin will verify shortly.");
      onUploadComplete();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload payment proof");
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = () => {
    switch (booking.payment_status) {
      case "pending":
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Payment Required
          </Badge>
        );
      case "submitted":
        return (
          <Badge variant="secondary" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Under Review
          </Badge>
        );
      case "verified":
        return (
          <Badge variant="default" className="gap-1 bg-green-500">
            <CheckCircle className="h-3 w-3" />
            Verified
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return null;
    }
  };

  // Show status for both users
  if (booking.payment_status === "submitted") {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Status
            </span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-amber-500 mb-2" />
            <p className="font-medium">Payment proof is under admin review</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isRenter
                ? "You'll be notified once admin verifies your payment."
                : "Choti Behen has uploaded payment proof. Waiting for admin verification."}
            </p>
          </div>
          
          {booking.payment_proof_url && (
            <div className="border rounded-lg overflow-hidden">
              <img
                src={booking.payment_proof_url}
                alt="Payment proof"
                className="w-full max-h-[200px] object-contain bg-muted"
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (booking.payment_status === "rejected") {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Status
            </span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-destructive/10 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-destructive">Payment proof was rejected</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please upload a correct payment screenshot to continue.
              </p>
            </div>
          </div>

          {isRenter && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              {previewUrl ? (
                <div className="space-y-2">
                  <div className="border rounded-lg overflow-hidden">
                    <img
                      src={previewUrl}
                      alt="Selected payment proof"
                      className="w-full max-h-[200px] object-contain bg-muted"
                    />
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    className="w-full"
                  >
                    Change Image
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-24 border-dashed"
                >
                  <div className="flex flex-col items-center">
                    <Image className="h-6 w-6 mb-1" />
                    <span>Upload New Screenshot</span>
                  </div>
                </Button>
              )}

              <Textarea
                placeholder="Add a note (optional)"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                rows={2}
              />

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Re-upload Payment Proof
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  // Payment required - show upload form for Choti Behen
  if (isRenter && booking.payment_status === "pending") {
    return (
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Step: Payment Required
            </span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Please pay your rent + security amount using any method given below and upload the payment receipt to continue.
          </p>

          {/* Payment breakdown */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Rent ({booking.total_days} days)</span>
              <span className="font-semibold">PKR {Number(booking.total_price).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Deposit</span>
              <span className="font-semibold">PKR {Number(booking.security_deposit).toLocaleString()}</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span className="text-primary">
                PKR {(Number(booking.total_price) + Number(booking.security_deposit)).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Payment methods info */}
          <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <p className="font-medium mb-1">Payment Methods:</p>
            <p>Bank Transfer — UBL · Behen.Pk · 0611359113165</p>
            <p className="mt-2 text-xs">Contact details will be shared after payment verification.</p>
          </div>

          {/* File upload */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {previewUrl ? (
            <div className="space-y-2">
              <div className="border rounded-lg overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Selected payment proof"
                  className="w-full max-h-[200px] object-contain bg-muted"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="w-full"
              >
                Change Image
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 border-dashed"
            >
              <div className="flex flex-col items-center">
                <Image className="h-6 w-6 mb-1" />
                <span>Upload Payment Screenshot</span>
                <span className="text-xs text-muted-foreground">JPG or PNG, max 5MB</span>
              </div>
            </Button>
          )}

          <Textarea
            placeholder="Add a note (optional) - e.g., transaction ID, payment method"
            value={paymentNote}
            onChange={(e) => setPaymentNote(e.target.value)}
            rows={2}
          />

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Payment Proof
              </>
            )}
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            ⚠️ Orders without payment within 24 hours will be auto-cancelled
          </p>
        </CardContent>
      </Card>
    );
  }

  // Bari Behen view - waiting for payment
  if (!isRenter && booking.payment_status === "pending") {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Status
            </span>
            {getStatusBadge()}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <Clock className="h-8 w-8 mx-auto text-amber-500 mb-2" />
            <p className="font-medium">Waiting for Choti Behen's payment</p>
            <p className="text-sm text-muted-foreground mt-1">
              You'll be notified once payment is uploaded and verified by admin.
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Rent ({booking.total_days} days)</span>
              <span className="font-semibold">PKR {Number(booking.total_price).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Security Deposit</span>
              <span className="font-semibold">PKR {Number(booking.security_deposit).toLocaleString()}</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Expected</span>
              <span className="text-primary">
                PKR {(Number(booking.total_price) + Number(booking.security_deposit)).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
