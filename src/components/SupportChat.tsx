import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  X, 
  Loader2, 
  Sparkles, 
  UserCheck, 
  HelpCircle,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { aiCalibrationService } from '@/lib/ai/aiCalibrationService';
import { sendAIChatMessage } from '@/lib/ai/aiChatClient';
import { AIAssistantSettings } from '@/types/ai';

interface Message {
  id: string;
  message: string;
  is_from_admin: boolean;
  is_read: boolean;
  created_at: string;
}

const QUICK_SUGGESTIONS = [
  'Como montar minha reserva de emergência?',
  'Como aplicar a regra 50/30/20 no meu orçamento?',
  'Qual a diferença entre Tesouro Selic e CDB 100% CDI?',
  'Como organizar as contas da família sem estresse?',
];

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
  const [isAITyping, setIsAITyping] = useState(false);
  const [chatMode, setChatMode] = useState<'ai' | 'human'>('ai');

  const { user } = useAuth();
  const { toast } = useToast();
  const { plan: userPlan } = useSubscription();
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
    const count = msgs.filter(m => m.is_from_admin && !m.is_read).length;
    setUnreadCount(count);
    if (count > 0) setIsVisible(true);
  }, []);

  // Fetch messages and subscribe
  useEffect(() => {
    if (!user) return;

    let channel: any = null;
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout | null = null;
    const cacheKey = `support_messages_cache_${user.id}`;

    // Load cached messages if available
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          calculateUnread(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }

    const fetchAndSubscribe = async (retryCount = 0) => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('support_messages')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (!isMounted) return;

        const msgs = data || [];
        setMessages(msgs);
        calculateUnread(msgs);

        try {
          localStorage.setItem(cacheKey, JSON.stringify(msgs));
        } catch {
          // ignore quota issues
        }

        // Subscribe to new messages
        if (!channel) {
          channel = supabase
            .channel(`support_messages_${user.id}`)
            .on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `user_id=eq.${user.id}` },
              (payload) => {
                const newMsg = payload.new as Message;
                setMessages((prev) => {
                  if (prev.some((m) => m.id === newMsg.id)) return prev;
                  const next = [...prev, newMsg];
                  try {
                    localStorage.setItem(cacheKey, JSON.stringify(next));
                  } catch {
                    // ignore
                  }
                  return next;
                });

                if (newMsg.is_from_admin) {
                  if (!isOpenRef.current) {
                    setUnreadCount((prev) => prev + 1);
                    setIsVisible(true);
                  } else {
                    supabase.from('support_messages').update({ is_read: true }).eq('id', newMsg.id).then();
                  }
                }
              }
            )
            .subscribe();
        }
      } catch (err: any) {
        if (!isMounted) return;
        const isNetworkError =
          err?.message?.includes('Failed to fetch') ||
          err?.name === 'TypeError' ||
          err?.message?.includes('aborted') ||
          err?.message?.includes('NetworkError');

        if (isNetworkError) {
          console.warn('Conexão instável ao carregar mensagens.');
          if (retryCount < 2) {
            retryTimeout = setTimeout(() => {
              if (isMounted) fetchAndSubscribe(retryCount + 1);
            }, 3000);
          }
        } else {
          console.error('Error fetching messages:', err);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchAndSubscribe();

    const handleOnline = () => {
      if (isMounted) fetchAndSubscribe();
    };
    window.addEventListener('online', handleOnline);

    return () => {
      isMounted = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      window.removeEventListener('online', handleOnline);
      if (channel) supabase.removeChannel(channel);
    };
  }, [user, calculateUnread]);

  // Scroll management
  const scrollToBottom = useCallback((instant = true) => {
    if (scrollRef.current) {
      if (instant) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      } else {
        scrollRef.current.scrollTo({
          top: scrollRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    }
  }, []);

  useLayoutEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(true);
    }
  }, [messages.length, isAITyping, isOpen, scrollToBottom]);

  // Trigger AI Response logic
  const handleTriggerAI = async (userText: string) => {
    if (!user) return;
    setIsAITyping(true);

    try {
      // 1. Fetch AI settings
      const settings: AIAssistantSettings = await aiCalibrationService.getSettings();

      if (!settings.is_active) {
        // AI is paused by admin
        const adminPauseNotice = 'Nosso Assistente Inteligente está passando por uma breve atualização. Sua mensagem foi registrada e um atendente humano responderá em breve!';
        await supabase.from('support_messages').insert({
          user_id: user.id,
          message: adminPauseNotice,
          is_from_admin: true,
        });
        setIsAITyping(false);
        return;
      }

      // 2. Check free plan limits
      const isFree = !userPlan || userPlan === 'free';
      if (isFree) {
        const userUsage = await aiCalibrationService.getUserUsage(user.id);
        if (userUsage.total_messages >= settings.free_plan_monthly_limit) {
          const quotaExceededMsg = `⚠️ Limite Mensal Atingido: Você atingiu a cota de ${settings.free_plan_monthly_limit} mensagens do plano Gratuito este mês.\n\nPara continuar com orientações financeiras ilimitadas, faça upgrade para o plano Básico ou Pro. Sua dúvida foi gravada e um atendente humano responderá assim que possível!`;
          await supabase.from('support_messages').insert({
            user_id: user.id,
            message: quotaExceededMsg,
            is_from_admin: true,
          });
          setChatMode('human');
          setIsAITyping(false);
          return;
        }
      }

      // 3. Fetch light financial summary for grounding
      let financialSummary: any = undefined;
      try {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { data: trans } = await supabase
          .from('transactions')
          .select('amount, type, category')
          .eq('user_id', user.id)
          .gte('date', startOfMonth.toISOString().split('T')[0]);

        if (trans && trans.length > 0) {
          let income = 0;
          let expenses = 0;
          const catMap: Record<string, number> = {};

          trans.forEach((t) => {
            const val = Number(t.amount) || 0;
            if (t.type === 'income') {
              income += val;
            } else {
              expenses += val;
              const cat = t.category || 'Outros';
              catMap[cat] = (catMap[cat] || 0) + val;
            }
          });

          let topCat = 'Geral';
          let maxVal = 0;
          Object.entries(catMap).forEach(([k, v]) => {
            if (v > maxVal) {
              maxVal = v;
              topCat = k;
            }
          });

          financialSummary = {
            monthlyIncome: income,
            monthlyExpenses: expenses,
            balance: income - expenses,
            topCategory: topCat,
          };
        }
      } catch (e) {
        // Proceed without financial context if query is not available
      }

      // 4. Send request to server
      const aiResponse = await sendAIChatMessage({
        userId: user.id,
        userEmail: user.email,
        userPlan: userPlan || 'gratuito',
        message: userText,
        calibrationSettings: settings,
        financialSummary,
        conversationHistory: messages.slice(-4).map((m) => ({
          role: m.is_from_admin ? 'assistant' : 'user',
          content: m.message,
        })),
      });

      // 5. Persist AI reply into support_messages
      const { data: savedReply, error: saveError } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          message: aiResponse.reply,
          is_from_admin: true,
          is_read: isOpenRef.current,
        })
        .select()
        .single();

      if (saveError) throw saveError;

      if (savedReply) {
        setMessages((prev) => [...prev, savedReply as Message]);
      }
    } catch (err: any) {
      console.error('AI Support error:', err);
      // Friendly fallback notice
      const fallbackText = 'Desculpe, ocorreu uma instabilidade momentânea na conexão com o Assistente. Sua mensagem foi anotada e nossa equipe de suporte responderá em breve.';
      await supabase.from('support_messages').insert({
        user_id: user.id,
        message: fallbackText,
        is_from_admin: true,
      });
    } finally {
      setIsAITyping(false);
    }
  };

  const sendMessage = async (textOverride?: string) => {
    const textToSend = (textOverride || newMessage).trim();
    if (!textToSend || !user) return;

    setSending(true);
    setNewMessage('');

    const tempId = crypto.randomUUID();
    const tempMessage: Message = {
      id: tempId,
      message: textToSend,
      is_from_admin: false,
      is_read: true,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const { data, error } = await supabase
        .from('support_messages')
        .insert({
          user_id: user.id,
          message: tempMessage.message,
          is_from_admin: false,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? (data as Message) : m)));
      }

      // If in AI mode, trigger the intelligent assistant
      if (chatMode === 'ai') {
        await handleTriggerAI(textToSend);
      }
    } catch (err: any) {
      toast({ title: 'Erro ao enviar mensagem', description: err.message, variant: 'destructive' });
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setSending(false);
    }
  };

  // Switch to human agent
  const handleRequestHuman = async () => {
    if (!user) return;
    setChatMode('human');

    const humanPrompt = 'Solicito atendimento com um atendente humano da equipe Organiza.';
    const tempId = crypto.randomUUID();
    const tempMessage: Message = {
      id: tempId,
      message: humanPrompt,
      is_from_admin: false,
      is_read: true,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMessage]);

    await supabase.from('support_messages').insert({
      user_id: user.id,
      message: humanPrompt,
      is_from_admin: false,
    });

    const humanNotice = '🤝 Atendimento humano solicitado! Nossa equipe recebeu seu chamado e responderá por aqui o mais breve possível.';
    await supabase.from('support_messages').insert({
      user_id: user.id,
      message: humanNotice,
      is_from_admin: true,
    });
  };

  // Mark admin messages as read in the database
  const markMessagesAsRead = useCallback(async () => {
    if (!user) return;

    const unreadIds = messages.filter((m) => m.is_from_admin && !m.is_read).map((m) => m.id);

    if (unreadIds.length === 0) return;

    try {
      const { error } = await supabase.from('support_messages').update({ is_read: true }).in('id', unreadIds);

      if (error) throw error;

      setMessages((prev) => prev.map((m) => (unreadIds.includes(m.id) ? { ...m, is_read: true } : m)));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  }, [user, messages]);

  const handleOpenChat = () => {
    setIsOpen(true);
    markMessagesAsRead();
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    if (unreadCount === 0) {
      setIsVisible(false);
    }
  };

  if (!user) return null;
  if (!isVisible && !isOpen) return null;

  return (
    <>
      {isVisible && !isOpen && (
        <Button
          onClick={handleOpenChat}
          className="fixed bottom-20 right-4 z-[100] rounded-full h-14 w-14 shadow-lg bg-primary hover:bg-primary/90 animate-in fade-in zoom-in-95 group"
          size="icon"
        >
          <div className="relative">
            <MessageCircle className="h-6 w-6 text-primary-foreground" />
            <Sparkles className="h-3 w-3 text-amber-300 absolute -top-1 -right-1" />
          </div>
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
        <Card className="fixed bottom-20 right-4 z-[100] w-[calc(100vw-2rem)] max-w-sm sm:max-w-md h-[32rem] shadow-2xl flex flex-col animate-in fade-in-90 slide-in-from-bottom-4 border-border/80">
          {/* Header */}
          <CardHeader className="py-2.5 px-4 flex flex-row items-center justify-between border-b flex-shrink-0 bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  Assistente & Suporte
                </CardTitle>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[11px] text-muted-foreground">
                    {chatMode === 'ai' ? 'IA Especialista Financeira' : 'Atendimento Humano'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {chatMode === 'ai' ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
                  onClick={handleRequestHuman}
                >
                  <UserCheck className="h-3.5 w-3.5 mr-1" /> Humano
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] px-2 text-primary font-medium"
                  onClick={() => setChatMode('ai')}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" /> Usar IA
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCloseChat}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>

          {/* Chat Content */}
          <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-background">
            <div className="flex-1 p-3 overflow-y-auto space-y-3" ref={scrollRef}>
              {loading && messages.length === 0 ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : messages.length === 0 ? (
                <div className="space-y-4 py-3">
                  <div className="text-center p-3 rounded-xl bg-muted/40 border border-border/50">
                    <Sparkles className="h-6 w-6 text-primary mx-auto mb-1.5" />
                    <p className="text-xs font-semibold">Olá! Sou seu Assistente Financeiro</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Tire dúvidas sobre finanças familiares, investimentos ou funcionalidades do Organiza.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider px-1">
                      Sugestões para começar:
                    </p>
                    <div className="grid grid-cols-1 gap-1.5">
                      {QUICK_SUGGESTIONS.map((sug, idx) => (
                        <button
                          key={idx}
                          onClick={() => sendMessage(sug)}
                          className="text-left text-xs p-2 rounded-lg border bg-card hover:bg-muted/60 transition-colors text-foreground flex items-center justify-between group"
                        >
                          <span>{sug}</span>
                          <Send className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      id={`msg-${msg.id}`}
                      className={`flex text-xs sm:text-sm ${msg.is_from_admin ? 'justify-start' : 'justify-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                          msg.is_from_admin
                            ? 'bg-muted/80 text-foreground border border-border/50 rounded-tl-sm'
                            : 'bg-primary text-primary-foreground rounded-tr-sm'
                        }`}
                      >
                        {msg.is_from_admin && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-primary mb-1">
                            <Sparkles className="h-3 w-3" />
                            <span>Organiza AI</span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                        <p
                          className={`text-[9px] text-right mt-1 ${
                            msg.is_from_admin ? 'text-muted-foreground' : 'text-primary-foreground/75'
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* AI Typing indicator */}
                  {isAITyping && (
                    <div className="flex justify-start text-xs animate-in fade-in">
                      <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-3.5 py-2 bg-muted/80 border border-border/50 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">Assistente elaborando resposta...</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Input & Footer */}
            <div className="p-2.5 border-t bg-card space-y-2 flex-shrink-0">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={chatMode === 'ai' ? 'Pergunte sobre finanças ou suporte...' : 'Digite sua mensagem para o atendente...'}
                  onKeyDown={(e) => e.key === 'Enter' && !sending && !isAITyping && sendMessage()}
                  disabled={sending || isAITyping}
                  className="flex-1 text-xs h-9"
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/90"
                  onClick={() => sendMessage()}
                  disabled={sending || isAITyping || !newMessage.trim()}
                >
                  {sending || isAITyping ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-emerald-500" />
                  Privacidade segura
                </span>
                <span>Orientações educativas CVM</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};
