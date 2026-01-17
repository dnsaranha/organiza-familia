import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  message: string;
  is_from_admin: boolean;
  created_at: string;
}

// Global state for chat visibility that can be controlled from outside
let globalSetChatVisible: ((visible: boolean) => void) | null = null;
let globalToggleChat: (() => void) | null = null;

export const toggleSupportChat = () => {
  if (globalToggleChat) globalToggleChat();
};

export const setSupportChatVisible = (visible: boolean) => {
  if (globalSetChatVisible) globalSetChatVisible(visible);
};

export const SupportChat = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Ref to track open state inside subscription callback
  const isOpenRef = useRef(isOpen);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Register global controls
  useEffect(() => {
    globalSetChatVisible = setIsVisible;
    globalToggleChat = () => setIsVisible(prev => !prev);
    return () => {
      globalSetChatVisible = null;
      globalToggleChat = null;
    };
  }, []);

  // Helper to calculate unread count
  const calculateUnread = useCallback((msgs: Message[]) => {
    const lastSeen = localStorage.getItem('support_chat_last_seen_at');
    const count = msgs.filter(m => {
        if (!m.is_from_admin) return false;
        if (!lastSeen) return true;
        return new Date(m.created_at) > new Date(lastSeen);
    }).length;
    setUnreadCount(count);
    if (count > 0) setIsVisible(true);
  }, []);

  // Fetch messages and subscribe
  useEffect(() => {
    if (!user) return;

    let channel: any = null;

    const fetchAndSubscribe = async () => {
      setLoading(true);
      try {
        // Fetch initial messages
        const { data, error } = await supabase
          .from('support_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        const msgs = data || [];
        setMessages(msgs);
        calculateUnread(msgs);

        // Subscribe to new messages
        channel = supabase
          .channel('support_messages')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${user.id}` }, (payload) => {
            const newMsg = payload.new as Message;
            setMessages(prev => [...prev, newMsg]);

            if (newMsg.is_from_admin) {
              if (!isOpenRef.current) {
                setUnreadCount(prev => prev + 1);
                setIsVisible(true);
              } else {
                // If chat is open, update timestamp to mark as seen immediately
                localStorage.setItem('support_chat_last_seen_at', new Date().toISOString());
              }
            }
          })
          .subscribe();

      } catch (err) {
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndSubscribe();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, calculateUnread]);

  // Scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);
    try {
      const { data, error } = await supabase.from('support_messages').insert({
        user_id: user.id,
        message: newMessage.trim(),
        is_from_admin: false,
      }).select().single();
      if (error) throw error;
      
      setNewMessage('');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleOpenChat = () => {
    setIsOpen(true);
    setUnreadCount(0);
    localStorage.setItem('support_chat_last_seen_at', new Date().toISOString());
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    if (unreadCount === 0) {
      setIsVisible(false);
    }
  };

  if (!user) return null;

  // Render nothing if not visible and not open
  if (!isVisible && !isOpen) return null;

  return (
    <>
      {isVisible && !isOpen && (
        <Button
          onClick={handleOpenChat}
          className="fixed bottom-20 right-4 z-[100] rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 rounded-full text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-20 right-4 z-[100] w-[calc(100vw-2rem)] max-w-80 h-80 md:h-96 shadow-xl flex flex-col">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Suporte
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleCloseChat}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              {loading && messages.length === 0 ? (
                <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
              ) : messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Envie uma mensagem para iniciar o chat.</p>
              ) : (
                <div className="space-y-2">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.is_from_admin ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${msg.is_from_admin ? 'bg-muted' : 'bg-primary text-primary-foreground'}`}>
                        {msg.is_from_admin && <Badge variant="outline" className="mb-1 text-xs">Suporte</Badge>}
                        <p>{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="p-3 border-t flex gap-2 flex-shrink-0 bg-background">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Digite sua mensagem..."
                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                disabled={sending}
                className="flex-1"
              />
              <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
