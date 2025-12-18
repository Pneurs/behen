import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnhancedHeader as Header } from "@/components/EnhancedHeader";
import { MessageCircle, MessageCircleOff } from "lucide-react";
import { format } from "date-fns";
import { useChatEnabled } from "@/hooks/useChatEnabled";

export default function AllChats() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const { chatEnabled, loading: chatStatusLoading } = useChatEnabled();

  useEffect(() => {
    checkAuth();
  }, []);

  // Subscribe to new messages for real-time updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('allchats-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        () => {
          // Refresh conversations when new message arrives
          fetchConversations(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);
    fetchConversations(user.id);
  };

  const fetchConversations = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select(`
          *,
          products (title, ai_cover_image),
          chat_messages (id, message, created_at, sender_id)
        `)
        .or(`renter_id.eq.${userId},owner_id.eq.${userId}`)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get the latest message and unread count for each conversation
      const conversationsWithData = data?.map((conv: any) => {
        const messages = conv.chat_messages || [];
        const sortedMessages = messages.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        const latestMessage = sortedMessages[0];
        
        // Count messages from others in last 24 hours as "unread"
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
        const unreadCount = messages.filter(
          (m: any) => m.sender_id !== userId && new Date(m.created_at).getTime() > oneDayAgo
        ).length;

        return { ...conv, latestMessage, unreadCount };
      });

      // Sort by latest message time (most recent first)
      conversationsWithData?.sort((a, b) => {
        const aTime = a.latestMessage?.created_at ? new Date(a.latestMessage.created_at).getTime() : 0;
        const bTime = b.latestMessage?.created_at ? new Date(b.latestMessage.created_at).getTime() : 0;
        return bTime - aTime;
      });

      setConversations(conversationsWithData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || chatStatusLoading) return <div>Loading...</div>;

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">All Chats</h1>
            <p className="text-muted-foreground mt-2">Your conversations</p>
          </div>

          {conversations.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No conversations yet</p>
                <p className="text-sm mt-2">Start chatting with sellers about products you're interested in</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {conversations.map((conv) => {
                const isOwner = user.id === conv.owner_id;
                const hasUnread = conv.unreadCount > 0;
                
                return (
                  <Card
                    key={conv.id}
                    className={`cursor-pointer hover:shadow-md transition-all ${
                      hasUnread ? "bg-primary/5 border-primary/30 ring-1 ring-primary/20" : ""
                    }`}
                    onClick={() => navigate(`/chat?product=${conv.product_id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {conv.products?.ai_cover_image && (
                          <img
                            src={conv.products.ai_cover_image}
                            alt={conv.products.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h3 className={`font-semibold truncate ${hasUnread ? "text-primary" : ""}`}>
                                {conv.products?.title}
                              </h3>
                              <p className={`text-sm truncate ${hasUnread ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                                {conv.latestMessage?.message || "No messages yet"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              {conv.latestMessage?.created_at && (
                                <p className="text-xs text-muted-foreground whitespace-nowrap">
                                  {format(new Date(conv.latestMessage.created_at), "MMM dd")}
                                </p>
                              )}
                              <div className="flex items-center gap-1">
                                {hasUnread && (
                                  <Badge className="h-5 min-w-5 px-1.5 text-xs bg-primary text-primary-foreground">
                                    {conv.unreadCount}
                                  </Badge>
                                )}
                                <Badge variant="outline" className="text-xs">
                                  {isOwner ? "Seller" : "Buyer"}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}