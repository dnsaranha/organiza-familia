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
  is_read: boolean;
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

  // Helper to calculate unread count from database is_read field
  const calculateUnread = useCallback((msgs: Message[]) => {
    // Count unread admin messages using the database field
    const count = msgs.filter(m => m.is_from_admin && !m.is_read).length;
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
            // Prevent duplicate messages if optimistic update already added it
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });

            if (newMsg.is_from_admin) {
              if (!isOpenRef.current) {
                setUnreadCount(prev => prev + 1);
                setIsVisible(true);
              } else {
                // If chat is open, immediately mark the new message as read
                markMessagesAsRead();
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

  // Scroll management
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  // Effect to scroll to bottom when chat opens or new messages arrive
  useEffect(() => {
      if (isOpen) {
          setTimeout(scrollToBottom, 50);
      }
  }, [isOpen, messages, scrollToBottom]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);

    const tempId = crypto.randomUUID();
    const tempMessage: Message = {
        id: tempId,
        message: newMessage.trim(),
        is_from_admin: false,
        is_read: true, // User's own messages are always considered read
        created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');
    scrollToBottom(); // Optimistic scroll

    try {
      const { data, error } = await supabase.from('support_messages').insert({
        user_id: user.id,
        message: tempMessage.message,
        is_from_admin: false,
      }).select().single();
      if (error) throw error;

      if (data) {
          setMessages(prev => prev.map(m => m.id === tempId ? (data as Message) : m));
      }

    } catch (err: any) {
      toast({ title: 'Erro ao enviar mensagem', description: err.message, variant: 'destructive' });
      setMessages(prev => prev.filter(m => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Mark admin messages as read in the database
  const markMessagesAsRead = useCallback(async () => {
    if (!user) return;

    const unreadIds = messages
      .filter(m => m.is_from_admin && !m.is_read)
      .map(m => m.id);

    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase
        .from('support_messages')
        .update({ is_read: true })
        .in('id', unreadIds);

      if (error) throw error; // Throw error to be caught below

      // Update local state ONLY on successful DB update
      setMessages(prev => prev.map(m => 
        unreadIds.includes(m.id) ? { ...m, is_read: true } : m
      ));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking messages as read:', err);
      // Do not hide the count if the update fails
      toast({ title: 'Erro de Sincronização', description: 'Não foi possível marcar as mensagens como lidas. Verifique sua conexão.', variant: 'destructive' });
    }
  }, [user, messages, toast]);

  const handleOpenChat = () => {
    setIsOpen(true);
    // Mark messages as read when opening chat
    markMessagesAsRead();
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    // Hide bubble only if there are no unread messages
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
          className="fixed bottom-20 right-4 z-[100] rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90 animate-in fade-in zoom-in-95"
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
        <Card className="fixed bottom-20 right-4 z-[100] w-[calc(100vw-2rem)] max-w-sm h-96 md:h-[28rem] shadow-xl flex flex-col animate-in fade-in-90 slide-in-from-bottom-4">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b flex-shrink-0">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Suporte ao Cliente
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
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma mensagem ainda. Envie uma para começar!</p>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div key={msg.id} id={`msg-${msg.id}`} className={`flex text-sm ${msg.is_from_admin ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 ${msg.is_from_admin ? 'bg-muted text-foreground' : 'bg-primary text-primary-foreground'}`}>
                         <p>{msg.message}</p>
                         <p className="text-xs text-right mt-1 ${msg.is_from_admin ? 'text-muted-foreground' : 'text-blue-200'}">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit'})}</p>
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