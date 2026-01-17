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
  const [isVisible, setIsVisible] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);

  // Register global controls
  useEffect(() => {
    globalSetChatVisible = setIsVisible;
    globalToggleChat = () => setIsVisible(prev => !prev);
    return () => {
      globalSetChatVisible = null;
      globalToggleChat = null;
    };
  }, []);

  // Auto-hide chat after 2 minutes of inactivity (only if chat is closed)
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    // Only set timer if chat is not open
    if (!isOpen) {
      inactivityTimeout.current = setTimeout(() => {
        setIsVisible(false);
      }, 2 * 60 * 1000); // 2 minutes
    }
  }, [isOpen]);

  useEffect(() => {
    resetInactivityTimer();
    return () => {
      if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current);
    };
  }, [resetInactivityTimer]);

  // When chat opens, clear the inactivity timer
  useEffect(() => {
    if (isOpen && inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    if (!isOpen) {
      resetInactivityTimer();
    }
  }, [isOpen, resetInactivityTimer]);

  useEffect(() => {
    if (isOpen && user) {
      fetchMessages();
      const channel = supabase
        .channel('support_messages')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${user.id}` }, (payload) => {
          setMessages(prev => [...prev, payload.new as Message]);
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

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
      
      // Add message immediately to the UI
      if (data) {
        setMessages(prev => [...prev, data as Message]);
      }
      
      setNewMessage('');
      toast({ title: 'Mensagem enviada!', description: 'O suporte responderá em breve.' });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (!user) return null;

  // Don't render anything if not visible and not open
  if (!isVisible && !isOpen) return null;

  return (
    <>
      {isVisible && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 z-50 rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-20 right-4 z-50 w-[calc(100vw-2rem)] max-w-80 h-80 md:h-96 shadow-xl flex flex-col">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b flex-shrink-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Suporte
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-3" ref={scrollRef}>
              {loading ? (
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
