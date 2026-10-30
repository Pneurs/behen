import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, AlertCircle, ExternalLink, CheckCircle, MessageCircleOff } from "lucide-react";
import { format } from "date-fns";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import OfferCard from "@/components/OfferCard";
import BookingFeeCard from "@/components/BookingFeeCard";
import { sendEmailNotification } from "@/lib/emailNotifications";
import { useChatEnabled } from "@/hooks/useChatEnabled";

export default function Chat() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get("product");
  const conversationIdParam = searchParams.get("id");
  const navigate = useNavigate();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [conversation, setConversation] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { chatEnabled, loading: chatStatusLoading } = useChatEnabled();

  useEffect(() => {
    initChat();
  }, [productId, conversationIdParam]);

  useEffect(() => {
    if (conversation?.id) {
      fetchMessages();
      fetchOffers();
      const unsubscribe = subscribeToMessages();
      // Backup refresh in case the live connection drops on mobile data
      const poll = setInterval(() => {
        fetchMessages();
        fetchOffers();
        refreshConversation();
      }, 4000);
      return () => {
        clearInterval(poll);
        if (unsubscribe) unsubscribe();
      };
    }
  }, [conversation?.id]);

  const refreshConversation = async () => {
    if (!conversation?.id) return;
    const { data } = await supabase.from("chat_conversations").select("*").eq("id", conversation.id).maybeSingle();
    if (data) setConversation((c: any) => (c && c.is_booking_confirmed === data.is_booking_confirmed && c.booking_id === data.booking_id ? c : data));
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      localStorage.setItem("auth_redirect", conversationIdParam ? `/chat?id=${conversationIdParam}` : "/chat");
      localStorage.setItem("auth_redirect_product", productId || "");
      navigate("/auth");
      return;
    }
    setUser(user);

    // Open an exact conversation by its id (inbox, notifications)
    if (conversationIdParam) {
      const { data: conv } = await supabase
        .from("chat_conversations")
        .select("*")
        .eq("id", conversationIdParam)
        .maybeSingle();
      if (!conv) {
        toast({ title: "Chat not found", variant: "destructive" });
        navigate("/all-chats");
        return;
      }
      const { data: p } = await supabase.from("products").select("*").eq("id", conv.product_id).maybeSingle();
      setProduct(p);
      setConversation(conv);
      return;
    }

    const { data: productData } = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();

    // The seller has one chat per buyer, so send her to her inbox instead of guessing
    if (productData && productData.owner_id === user.id) {
      navigate("/all-chats");
      return;
    }
    
    // Check if negotiation is allowed for this product
    if (productData && productData.negotiation_allowed === false) {
      toast({
        title: "Negotiation Not Available",
        description: "This product has a fixed price and doesn't allow chat negotiation.",
        variant: "destructive",
      });
      navigate(`/product/${productId}`);
      return;
    }
    
    setProduct(productData);

    // A buyer has exactly one chat per dress
    let { data: existingConv } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("product_id", productId)
      .eq("renter_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

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
      
      if (user.id !== productData?.owner_id && productData) {
        const productUrl = `${window.location.origin}/product/${productData.id}`;
        const productMessage = `👗 Interested in: ${productData.title}\n🔗 View Product: ${productUrl}\n💰 Price: PKR ${
          productData.rental_price_4days?.toLocaleString() || 
          (productData.rental_price_per_day * 4)?.toLocaleString()
        } / 4 days\n📍 Location: ${productData.area ? `${productData.area}, ` : ""}${productData.city}`;
        
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
      .channel(`chat:${conversation.id}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversation.id}`,
        },
        (payload) => {
          // Check if message already exists to prevent duplicates
          setMessages((current) => {
            const exists = current.some(msg => msg.id === payload.new.id);
            if (exists) return current;
            return [...current, payload.new];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const fetchMessages = async () => {
    if (!conversation?.id) return;
    
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }
    
    const next = data || [];
    setMessages((cur) =>
      cur.length === next.length && cur[cur.length - 1]?.id === next[next.length - 1]?.id ? cur : next
    );
  };

  const fetchOffers = async () => {
    const { data } = await supabase
      .from("offers")
      .select("*")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: false });

    const next = data || [];
    setOffers((cur) => (JSON.stringify(cur) === JSON.stringify(next) ? cur : next));
  };

  const moderateMessage = (message: string): { isBlocked: boolean; reason: string } => {
    const patterns = [
      { regex: /03[0-9]{2}[\s-]?[0-9]{7}/g, reason: "phone number" },
      { regex: /(\+92|0092)?[\s]?3[0-9]{2}[\s-]?[0-9]{7}/g, reason: "phone number" },
      { regex: /\b0\s*3\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]\s*[0-9]/g, reason: "phone number" },
      { regex: /\b[0-9]{11}\b/g, reason: "phone number" },
      { regex: /\b(zero|one|two|three|four|five|six|seven|eight|nine|tin|char|panch|chay|saat|aath|nau)\s+(zero|one|two|three|four|five|six|seven|eight|nine|tin|char|panch|chay|saat|aath|nau)/gi, reason: "phone number" },
      { regex: /\b(number|num|mobile|call|whatsapp|wp|wtsapp|contact|phone|fone)\b/gi, reason: "phone number" },
      { regex: /نمبر|میرا نمبر|کال|وٹس ایپ|رابطہ|فون/g, reason: "phone number" },
      { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, reason: "email address" },
      { regex: /\b(house|H#|H\s?no|flat|apartment|building|street|gali|lane|phase|block)\s*[#]?\s*[0-9]/gi, reason: "exact location" },
      { regex: /\b(near|opposite|behind|ke pass|pass aajana|milte hain|aajao|aa jao)\b/gi, reason: "meetup location" },
      { regex: /گھر آ جانا|گھر کے پاس|یہاں آجاؤ|گلی نمبر|فیز|بلوک|یہاں ملتے|میرا گھر|ایڈریس|لوکیشن بھیجو/g, reason: "exact location" },
      { regex: /\b(DHA|Bahria|Model Town|Wapda Town|Johar Town|Samanabad|Tariq Road|North Nazimabad|Clifton|Gulberg|Cantt|Defence)\s+(phase|town|society)?/gi, reason: "exact location" },
      { regex: /(google\s?maps?|coordinates?|lat|long|location\s?share|pin\s?location)/gi, reason: "location sharing" },
      { regex: /[0-9]+\.[0-9]+°/g, reason: "coordinates" },
      { regex: /\b(whatsapp|instagram|facebook|insta|fb|twitter|snapchat|telegram|tiktok|snap)\b/gi, reason: "social media" },
      { regex: /@[a-zA-Z0-9._]+/g, reason: "social media handle" },
      { regex: /\b(contact me on|call me|whatsapp me|send number|msg karo|message karo|fone karo)\b/gi, reason: "external contact" },
      { regex: /فون کرو|میسج کردو|رابطہ کرو/g, reason: "external contact" },
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
      
      // Send notification to recipient
      try {
        const recipientId = user.id === conversation.owner_id 
          ? conversation.renter_id 
          : conversation.owner_id;
        
        const { data: recipientProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", recipientId)
          .single();

        const { data: senderProfile } = await supabase
          .from("profiles")
          .select("name")
          .eq("user_id", user.id)
          .single();

        const chatLink = `/chat?id=${conversation.id}`;
        const truncatedMessage = newMessage.length > 50 ? newMessage.substring(0, 50) + "..." : newMessage;
        
        // Create in-app notification
        await supabase.from("notifications").insert({
          user_id: recipientId,
          type: "message",
          title: "New Message",
          message: `${senderProfile?.name || "Someone"}: ${truncatedMessage}`,
          link: chatLink,
        });

        // Send email notification
        await sendEmailNotification({
          type: "new_message",
          recipientEmail: "",
          recipientName: recipientProfile?.name || "User",
          data: {
            senderName: senderProfile?.name || "Someone",
            productTitle: product?.title,
            message: newMessage.length > 100 ? newMessage.substring(0, 100) + "..." : newMessage,
            chatLink: `${window.location.origin}${chatLink}`,
            recipientId,
          },
        });
      } catch (notifError) {
        console.error("Failed to send message notification:", notifError);
      }
    }

    setLoading(false);
  };

  const handleOfferAccepted = async (offer: any) => {
    // Send system message about order creation
    await supabase.from("chat_messages").insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      message: `✅ Offer accepted!\n\n📦 Order Details:\n💰 Price: PKR ${offer.offered_price.toLocaleString()}\n🔒 Security: PKR ${offer.offered_security_deposit.toLocaleString()}\n📅 Dates: ${format(new Date(offer.start_date), "MMM dd")} - ${format(new Date(offer.end_date), "MMM dd, yyyy")}\n\n💳 Next step: the buyer pays the small Behen.pk platform fee (see the card on the right) to confirm the booking and unlock contact details.`,
    });

    fetchOffers();
    fetchMessages();
    
    // Refresh conversation to get updated booking_id
    const { data } = await supabase
      .from("chat_conversations")
      .select("*")
      .eq("id", conversation.id)
      .single();
    
    if (data) setConversation(data);
  };

  const renderMessageWithLinks = (message: string) => {
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

  if (chatStatusLoading || !conversation || !product) return <div>Loading...</div>;

  // Show disabled message if chat system is turned off
  if (!chatEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageCircleOff className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Chat System Unavailable</p>
                <p className="text-sm mt-2">The chat system is currently disabled by the administrator.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = user?.id === conversation?.owner_id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Chat Section */}
            <Card className="lg:col-span-2 h-[600px] flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center gap-3">
                  <Link to={`/product/${product.id}`} className="hover:underline">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                      {product.title}
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </h2>
                  </Link>
                </div>
                {conversation.is_booking_confirmed ? (
                  <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span>Order confirmed - Contact info unlocked</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mt-2 text-sm">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                      <AlertCircle className="h-4 w-4" />
                      <span>Contact info blocked until order confirmed</span>
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

              <div className="p-4 border-t flex gap-2">
                <div className="flex-1 space-y-1">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="Type a message..."
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground px-1">
                    ⚠️ Contact details unlock after the booking fee is verified. Messages are monitored for safety.
                  </p>
                </div>
                <Button onClick={handleSendMessage} disabled={loading || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Offer Section */}
            <div className="space-y-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 mb-4">
                    {product.ai_cover_image && (
                      <img
                        src={product.ai_cover_image}
                        alt={product.title}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-semibold text-sm">{product.title}</p>
                      <p className="text-xs text-muted-foreground">
                        PKR {product.rental_price_4days?.toLocaleString()} / 4 days
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Security: PKR {product.security_deposit?.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  <Badge variant={isOwner ? "default" : "secondary"} className="mb-4">
                    {isOwner ? "You are the Seller" : "You are the Buyer"}
                  </Badge>
                  
                  <OfferCard
                    conversationId={conversation.id}
                    productId={product.id}
                    product={product}
                    userId={user.id}
                    isOwner={isOwner}
                    existingOffers={offers}
                    onOfferCreated={fetchOffers}
                    onOfferAccepted={handleOfferAccepted}
                  />
                </CardContent>
              </Card>

              <BookingFeeCard
                conversation={conversation}
                product={product}
                userId={user.id}
                acceptedOffer={offers.find((o) => o.status === "accepted") || null}
                onConfirmed={() => { refreshConversation(); fetchMessages(); }}
              />

              {conversation.is_booking_confirmed && (
                <Card className="bg-green-500/10 border-green-500/30">
                  <CardContent className="pt-4 text-center">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="font-semibold text-green-600">Booking Confirmed!</p>
                    <Button
                      className="mt-3 w-full"
                      onClick={() => navigate("/my-bookings")}
                    >
                      View My Bookings
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}