import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, AlertCircle } from "lucide-react";
import { format } from "date-fns";

export default function Chat() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("product");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initChat();
  }, [productId]);

  useEffect(() => {
    if (conversation) {
      subscribeToMessages();
      fetchMessages();
    }
  }, [conversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);

    // Fetch product
    const { data: productData } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    
    setProduct(productData);

    // Find or create conversation
    let { data: existingConv } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("product_id", productId)
      .or(`renter_id.eq.${user.id},owner_id.eq.${user.id}`)
      .single();

    if (!existingConv) {
      const { data: newConv, error } = await supabase
        .from("chat_conversations")
        .insert({
          product_id: productId,
          renter_id: user.id,
          owner_id: productData?.owner_id,
        })
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return;
      }
      existingConv = newConv;
    }

    setConversation(existingConv);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`chat:${conversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          setMessages((current) => [...current, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    setMessages(data || []);
  };

  const moderateMessage = (message: string): { isBlocked: boolean; reason: string } => {
    const patterns = [
      // Phone numbers
      { regex: /(\+91|0)?[6-9]\d{9}/g, reason: "phone number" },
      { regex: /\b(zero|one|two|three|four|five|six|seven|eight|nine)\s*(zero|one|two|three|four|five|six|seven|eight|nine)\s*(zero|one|two|three|four|five|six|seven|eight|nine)/gi, reason: "phone number in words" },
      // Email
      { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, reason: "email address" },
      // Addresses
      { regex: /\b(address|location|house|flat|building|street|road|area|pin|pincode|landmark)\b/gi, reason: "address information" },
      // Social media
      { regex: /\b(whatsapp|instagram|facebook|insta|fb|twitter|snapchat|telegram)\b/gi, reason: "social media handle" },
      { regex: /@[a-zA-Z0-9._]+/g, reason: "social media handle" },
    ];

    for (const pattern of patterns) {
      if (pattern.regex.test(message)) {
        return { isBlocked: true, reason: pattern.reason };
      }
    }

    return { isBlocked: false, reason: "" };
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || loading) return;

    const moderation = moderateMessage(newMessage);
    
    if (moderation.isBlocked && !conversation.is_booking_confirmed) {
      toast({
        title: "Message Blocked",
        description: `Cannot share ${moderation.reason} before booking is confirmed`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    const { error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: conversation.id,
        sender_id: user.id,
        message: newMessage,
        is_moderated: moderation.isBlocked,
        moderation_reason: moderation.reason || null,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
    }

    setLoading(false);
  };

  if (!conversation || !product) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="h-[600px] flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-xl font-bold">{product.title}</h2>
            {!conversation.is_booking_confirmed && (
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>Contact info blocked until booking confirmed</span>
              </div>
            )}
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_id === user.id ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-3 ${
                      msg.sender_id === user.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{msg.message}</p>
                    {msg.is_moderated && (
                      <p className="text-xs mt-1 opacity-70">
                        (Moderated: {msg.moderation_reason})
                      </p>
                    )}
                    <p className="text-xs mt-1 opacity-70">
                      {format(new Date(msg.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="p-4 border-t flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              disabled={loading}
            />
            <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}