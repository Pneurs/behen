import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, AlertCircle, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";

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
  const [showCustomOffer, setShowCustomOffer] = useState(false);
  const [customOffer, setCustomOffer] = useState({ price: "", security: "", message: "" });

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
      // Store redirect info for after login
      localStorage.setItem("auth_redirect", "/chat");
      localStorage.setItem("auth_redirect_product", productId || "");
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
      
      // Automatically send product info to owner when Choti Behen starts chat
      if (user.id !== productData?.owner_id && productData) {
        const productUrl = `${window.location.origin}/product/${productData.id}`;
        const productMessage = `👗 Interested in: ${productData.title}\n🔗 View Product: ${productUrl}\n💰 Price: PKR ${
          productData.rental_price_4days?.toLocaleString() || 
          (productData.rental_price_per_day * 4)?.toLocaleString()
        } / 4 days\n📍 Location: ${productData.area ? `${productData.area}, ` : ""}${productData.city}`;
        
        // Send the product info message
        await supabase.from("chat_messages").insert({
          conversation_id: newConv.id,
          sender_id: user.id,
          message: productMessage,
        });
      }
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
      // Pakistani phone numbers - all formats
      { regex: /03[0-9]{2}[\s-]?[0-9]{7}/g, reason: "phone number" },
      { regex: /(\+92|0092)?[\s]?3[0-9]{2}[\s-]?[0-9]{7}/g, reason: "phone number" },
      { regex: /\b0\s*3\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]/g, reason: "phone number" },
      { regex: /\b[0-9]{11}\b/g, reason: "phone number" },
      
      // Phone number in words/letters (English & Roman Urdu)
      { regex: /\b(zero|one|two|three|four|five|six|seven|eight|nine|tin|char|panch|chay|saat|aath|nau)\s+(zero|one|two|three|four|five|six|seven|eight|nine|tin|char|panch|chay|saat|aath|nau)/gi, reason: "phone number" },
      { regex: /\b(number|num|mobile|call|whatsapp|wp|wtsapp|contact|phone|fone)\b/gi, reason: "phone number" },
      
      // Urdu terms for contact
      { regex: /نمبر|میرا نمبر|کال|وٹس ایپ|رابطہ|فون/g, reason: "phone number" },
      
      // Email addresses
      { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, reason: "email address" },
      
      // Exact location keywords (English & Urdu)
      { regex: /\b(house|H#|H\s?no|flat|apartment|building|street|gali|lane|phase|block)\s*[#]?\s*[0-9]/gi, reason: "exact location" },
      { regex: /\b(near|opposite|behind|ke pass|pass aajana|milte hain|aajao|aa jao)\b/gi, reason: "meetup location" },
      { regex: /گھر آ جانا|گھر کے پاس|یہاں آجاؤ|گلی نمبر|فیز|بلوک|یہاں ملتے|میرا گھر|ایڈریس|لوکیشن بھیجو/g, reason: "exact location" },
      
      // Society names
      { regex: /\b(DHA|Bahria|Model Town|Wapda Town|Johar Town|Samanabad|Tariq Road|North Nazimabad|Clifton|Gulberg|Cantt|Defence)\s+(phase|town|society)?/gi, reason: "exact location" },
      
      // Google Maps & coordinates
      { regex: /(google\s?maps?|coordinates?|lat|long|location\s?share|pin\s?location)/gi, reason: "location sharing" },
      { regex: /[0-9]+\.[0-9]+°/g, reason: "coordinates" },
      
      // Social media (English & Roman Urdu)
      { regex: /\b(whatsapp|instagram|facebook|insta|fb|twitter|snapchat|telegram|tiktok|snap)\b/gi, reason: "social media" },
      { regex: /@[a-zA-Z0-9._]+/g, reason: "social media handle" },
      
      // External contact attempts
      { regex: /\b(contact me on|call me|whatsapp me|send number|msg karo|message karo|fone karo)\b/gi, reason: "external contact" },
      { regex: /فون کرو|میسج کردو|رابطہ کرو/g, reason: "external contact" },
      
      // Hidden/spaced patterns
      { regex: /\b[0-9\s]{15,}\b/g, reason: "hidden number" },
      { regex: /\b[a-z]\s+[a-z]\s+[a-z]\s+[a-z]\s+[a-z]\s+[a-z]/gi, reason: "hidden text" },
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
        title: "⚠️ Message Blocked",
        description: "Sharing phone numbers, exact locations, addresses, or arranging meetups is not allowed before order confirmation.",
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

  const handleSendCustomOffer = async () => {
    if (!customOffer.price && !customOffer.security) {
      toast({
        title: "Error",
        description: "Please enter at least one value to update",
        variant: "destructive",
      });
      return;
    }

    const isOwner = user.id === product.owner_id;
    if (!isOwner) {
      toast({
        title: "Error",
        description: "Only the owner can make custom offers",
        variant: "destructive",
      });
      return;
    }

    let offerMessage = "📋 Custom Offer:\n";
    if (customOffer.price) offerMessage += `💰 Price: PKR ${customOffer.price}\n`;
    if (customOffer.security) offerMessage += `🔒 Security Deposit: PKR ${customOffer.security}\n`;
    if (customOffer.message) offerMessage += `\n${customOffer.message}`;

    setNewMessage(offerMessage);
    setShowCustomOffer(false);
    setCustomOffer({ price: "", security: "", message: "" });
    
    // Send immediately
    setTimeout(() => handleSendMessage(), 100);
  };

  // Render message with clickable links
  const renderMessageWithLinks = (message: string) => {
    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = message.split(urlPattern);
    
    return parts.map((part, index) => {
      if (urlPattern.test(part)) {
        return (
          <a 
            key={index} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            {part.length > 40 ? part.substring(0, 40) + "..." : part}
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  if (!conversation || !product) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="h-[600px] flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-3">
              <Link to={`/product/${product.id}`} className="hover:underline">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  {product.title}
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </h2>
              </Link>
            </div>
            {!conversation.is_booking_confirmed && (
              <div className="flex flex-col gap-2 mt-2 text-sm">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                  <AlertCircle className="h-4 w-4" />
                  <span>Contact info blocked until booking confirmed</span>
                </div>
                <div className="text-xs text-muted-foreground bg-muted p-3 rounded-md">
                  <strong>Warning:</strong> Sharing contact information outside our platform before booking confirmation 
                  may result in your name being publicly shared on our channels. We will not be responsible 
                  for any issues that occur with your product if you bypass our secure booking system.
                </div>
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
                    <p className="text-sm whitespace-pre-wrap">{renderMessageWithLinks(msg.message)}</p>
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

          {showCustomOffer && user?.id === product?.owner_id && (
            <div className="p-4 border-t bg-muted/50 space-y-3">
              <h3 className="font-semibold text-sm">Create Custom Offer</h3>
              <p className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
                💡 Tip: You can negotiate - lower the rent and increase security, or increase the rent slightly and lower security.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="New Price"
                  type="number"
                  value={customOffer.price}
                  onChange={(e) => setCustomOffer({ ...customOffer, price: e.target.value })}
                />
                <Input
                  placeholder="Security Deposit"
                  type="number"
                  value={customOffer.security}
                  onChange={(e) => setCustomOffer({ ...customOffer, security: e.target.value })}
                />
              </div>
              <Input
                placeholder="Additional message (optional)"
                value={customOffer.message}
                onChange={(e) => setCustomOffer({ ...customOffer, message: e.target.value })}
              />
              <div className="flex gap-2">
                <Button onClick={handleSendCustomOffer} size="sm" className="flex-1">Send Offer</Button>
                <Button onClick={() => setShowCustomOffer(false)} variant="outline" size="sm">Cancel</Button>
              </div>
            </div>
          )}

          <div className="p-4 border-t flex gap-2">
            {user?.id === product?.owner_id && !showCustomOffer && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setShowCustomOffer(true)}
                title="Create Custom Offer"
              >
                💰
              </Button>
            )}
            <div className="flex-1 space-y-1">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && !showCustomOffer && handleSendMessage()}
                placeholder="Type a message..."
                disabled={loading || showCustomOffer}
              />
              <p className="text-xs text-muted-foreground px-1">
                ⚠️ Our AI monitors messages. Sharing contact info may expose you publicly.
              </p>
            </div>
            <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim() || showCustomOffer}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}