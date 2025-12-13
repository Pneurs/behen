import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { MessageSquare, Send } from "lucide-react";

interface ReviewResponseFormProps {
  reviewId: string;
  existingResponse?: string;
  onResponseSubmitted?: () => void;
}

export default function ReviewResponseForm({ 
  reviewId, 
  existingResponse,
  onResponseSubmitted 
}: ReviewResponseFormProps) {
  const [response, setResponse] = useState(existingResponse || "");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!response.trim()) {
      toast.error("Please enter a response");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("reviews")
        .update({
          owner_response: response.trim(),
          owner_response_at: new Date().toISOString(),
        })
        .eq("id", reviewId);

      if (error) throw error;

      toast.success("Response submitted successfully");
      onResponseSubmitted?.();
    } catch (error) {
      console.error("Error submitting response:", error);
      toast.error("Failed to submit response");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          {existingResponse ? "Edit Response" : "Respond to Review"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Write a polite response to this review..."
          className="min-h-[80px]"
        />
        <Button 
          onClick={handleSubmit} 
          disabled={loading || !response.trim()}
          size="sm"
        >
          <Send className="h-4 w-4 mr-2" />
          {loading ? "Submitting..." : existingResponse ? "Update Response" : "Submit Response"}
        </Button>
      </CardContent>
    </Card>
  );
}
