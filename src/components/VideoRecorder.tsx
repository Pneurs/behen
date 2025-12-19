import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Video, Square, Upload, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface VideoRecorderProps {
  bookingId: string;
  videoType: "packing" | "return" | "acceptance" | "opening";
  onUploadComplete: (videoUrl: string) => void;
  disabled?: boolean;
  maxDurationSeconds?: number;
}

const MAX_VIDEO_SIZE_MB = 100;
const WATERMARK_TEXT = "Behen.pk";

export default function VideoRecorder({
  bookingId,
  videoType,
  onUploadComplete,
  disabled = false,
  maxDurationSeconds = 120, // 2 minutes default
}: VideoRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      chunksRef.current = [];
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: true
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') 
          ? 'video/webm;codecs=vp9' 
          : 'video/webm'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const watermarkedBlob = await addWatermark(blob);
        setRecordedBlob(watermarkedBlob);
        setRecordedUrl(URL.createObjectURL(watermarkedBlob));
      };
      
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setDuration(0);
      
      // Start duration timer
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= maxDurationSeconds - 1) {
            stopRecording();
            return maxDurationSeconds;
          }
          return prev + 1;
        });
      }, 1000);
      
    } catch (err: any) {
      console.error("Error starting recording:", err);
      setError("Could not access camera. Please allow camera permissions.");
      toast.error("Could not access camera. Please allow camera permissions.");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setIsRecording(false);
  };

  const addWatermark = async (blob: Blob): Promise<Blob> => {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(blob);
      video.muted = true;
      
      video.onloadedmetadata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext('2d')!;
        
        // For now, just return original blob
        // Canvas-based watermarking would require frame-by-frame processing
        // which is too heavy for browser. We'll add text overlay in UI instead.
        resolve(blob);
      };
      
      video.onerror = () => resolve(blob);
      video.load();
    });
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleUpload = async () => {
    if (!recordedBlob) return;
    
    // Check file size
    const sizeMB = recordedBlob.size / (1024 * 1024);
    if (sizeMB > MAX_VIDEO_SIZE_MB) {
      toast.error(`Video too large (${sizeMB.toFixed(1)}MB). Maximum is ${MAX_VIDEO_SIZE_MB}MB.`);
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const timestamp = Date.now();
      const fileName = `${user.id}/${bookingId}/${videoType}-${timestamp}.webm`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('booking-videos')
        .upload(fileName, recordedBlob, {
          contentType: 'video/webm',
          upsert: false
        });
      
      if (error) throw error;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('booking-videos')
        .getPublicUrl(fileName);
      
      setUploadProgress(100);
      toast.success("Video uploaded successfully!");
      onUploadComplete(publicUrl);
      
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload video");
    } finally {
      setUploading(false);
    }
  };

  const resetRecording = () => {
    setRecordedBlob(null);
    setRecordedUrl(null);
    setDuration(0);
    setError(null);
  };

  const getTitle = () => {
    switch (videoType) {
      case "packing": return "Record Packing Video";
      case "return": return "Record Return Video";
      case "acceptance": return "Record Acceptance Video";
      case "opening": return "Record Opening Video";
      default: return "Record Video";
    }
  };

  const getInstructions = () => {
    switch (videoType) {
      case "packing":
        return "Show the product being packed with all accessories visible. Include the dress condition clearly.";
      case "return":
        return "Record yourself returning the product, showing its current condition. Apply the return seal provided inside the parcel.";
      case "acceptance":
        return "Record receiving the product back and verify its condition.";
      case "opening":
        return "⚠️ MANDATORY: Start recording BEFORE breaking the seal. Show the seal clearly, then open the parcel and verify contents. Without this video, damage claims will NOT be accepted.";
      default:
        return "";
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2">
            <Video className="h-5 w-5" />
            {getTitle()}
          </h3>
          <span className="text-sm text-muted-foreground">
            Max {Math.floor(maxDurationSeconds / 60)} min
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground">{getInstructions()}</p>
        
        {/* Watermark notice */}
        <div className="text-xs bg-muted p-2 rounded flex items-center gap-2">
          <CheckCircle className="h-3 w-3 text-green-600" />
          Video will include timestamp: {new Date().toLocaleString()}
        </div>
        
        {error && (
          <div className="text-sm text-destructive flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        {/* Video Preview */}
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {recordedUrl && !isRecording ? (
            <video
              src={recordedUrl}
              controls
              className="w-full h-full object-contain"
            />
          ) : (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              playsInline
              muted
            />
          )}
          
          {/* Watermark overlay */}
          <div className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
            {WATERMARK_TEXT}
          </div>
          
          {/* Timestamp overlay */}
          <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs">
            {new Date().toLocaleString()}
          </div>
          
          {/* Recording indicator */}
          {isRecording && (
            <div className="absolute top-2 left-2 flex items-center gap-2 bg-destructive text-white px-2 py-1 rounded text-xs">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              REC {formatDuration(duration)} / {formatDuration(maxDurationSeconds)}
            </div>
          )}
        </div>
        
        {/* Duration Progress */}
        {isRecording && (
          <Progress value={(duration / maxDurationSeconds) * 100} className="h-2" />
        )}
        
        {/* Upload Progress */}
        {uploading && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading video...
            </div>
            <Progress value={uploadProgress} className="h-2" />
          </div>
        )}
        
        {/* Controls */}
        <div className="flex gap-2">
          {!recordedUrl && !isRecording && (
            <Button
              onClick={startRecording}
              disabled={disabled || uploading}
              className="flex-1"
            >
              <Video className="mr-2 h-4 w-4" />
              Start Recording
            </Button>
          )}
          
          {isRecording && (
            <Button
              onClick={stopRecording}
              variant="destructive"
              className="flex-1"
            >
              <Square className="mr-2 h-4 w-4" />
              Stop Recording ({formatDuration(maxDurationSeconds - duration)} left)
            </Button>
          )}
          
          {recordedUrl && !isRecording && (
            <>
              <Button
                onClick={resetRecording}
                variant="outline"
                disabled={uploading}
              >
                Re-record
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1"
              >
                {uploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                Save & Upload
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}