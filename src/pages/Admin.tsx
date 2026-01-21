import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Header } from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, Users, Shield, Send, Loader2, RefreshCw, 
  Search, CheckCheck, Clock, ArrowLeft 
} from 'lucide-react';

interface SupportMessage {
  id: string;
  user_id: string;
  message: string;
  is_from_admin: boolean;
  is_read: boolean;
  created_at: string;
  user_email?: string;
}

interface UserWithMessages {
  user_id: string;
  email: string;
  messages: SupportMessage[];
  unread_count: number;
  last_message_at: string;
}

interface UserStats {
  total_users: number;
  users_with_subscription: number;
  users_today: number;
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<UserWithMessages[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) throw error;
      setIsAdmin(!!data);
      
      if (data) {
        fetchConversations();
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      // Fetch all support messages
      const { data: messages, error } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group messages by user
      const grouped = (messages || []).reduce((acc: Record<string, SupportMessage[]>, msg) => {
        if (!acc[msg.user_id]) acc[msg.user_id] = [];
        acc[msg.user_id].push(msg);
        return acc;
      }, {});

      // Get user emails from profiles
      const userIds = Object.keys(grouped);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);

      const profileMap = (profiles || []).reduce((acc: Record<string, string>, p) => {
        acc[p.id] = p.full_name || 'Usuário';
        return acc;
      }, {});

      const conversationsList: UserWithMessages[] = userIds.map(userId => ({
        user_id: userId,
        email: profileMap[userId] || 'Usuário',
        messages: grouped[userId],
        unread_count: grouped[userId].filter(m => !m.is_read && !m.is_from_admin).length,
        last_message_at: grouped[userId][grouped[userId].length - 1]?.created_at || '',
      }));

      // Sort by most recent message
      conversationsList.sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1]?.created_at || '';
        const bLast = b.messages[b.messages.length - 1]?.created_at || '';
        return bLast.localeCompare(aLast);
      });

      setConversations(conversationsList);
    } catch (err) {
      console.error('Error fetching conversations:', err);
    }
  };

  const sendReply = async () => {
    if (!replyMessage.trim() || !selectedUser) return;

    setSending(true);
    try {
      const { error } = await supabase.from('support_messages').insert({
        user_id: selectedUser,
        message: replyMessage.trim(),
        is_from_admin: true,
      });

      if (error) throw error;

      setReplyMessage('');
      toast({ title: 'Resposta enviada!' });
      fetchConversations();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const markAsRead = async (userId: string) => {
    try {
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_from_admin', false);
      
      fetchConversations();
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground mb-4">
              Você não tem permissão para acessar esta página.
            </p>
            <Button onClick={() => navigate('/')}>Voltar ao Início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedConversation = conversations.find(c => c.user_id === selectedUser);

  return (
    <div>
      <Header />
      <div className="container mx-auto py-6 px-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" /> Painel Administrativo
          </h1>
          <Button variant="outline" size="sm" onClick={fetchConversations}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
        </div>

        <Tabs defaultValue="support" className="space-y-4">
          <TabsList>
            <TabsTrigger value="support" className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" /> Suporte
              {conversations.reduce((acc, c) => acc + c.unread_count, 0) > 0 && (
                <Badge variant="destructive" className="ml-1">
                  {conversations.reduce((acc, c) => acc + c.unread_count, 0)}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Usuários
            </TabsTrigger>
          </TabsList>

          <TabsContent value="support">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Conversations List */}
              <Card className="md:col-span-1 h-[300px] md:h-[500px]">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Conversas</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[200px] md:h-[420px]">
                    {conversations.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        Nenhuma conversa encontrada
                      </p>
                    ) : (
                      conversations.map(conv => (
                        <div
                          key={conv.user_id}
                          className={`p-3 border-b cursor-pointer hover:bg-muted/50 ${
                            selectedUser === conv.user_id ? 'bg-muted' : ''
                          }`}
                          onClick={() => {
                            setSelectedUser(conv.user_id);
                            markAsRead(conv.user_id);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{conv.email}</span>
                            {conv.unread_count > 0 && (
                              <Badge variant="destructive" className="text-xs">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-1">
                            {conv.messages[conv.messages.length - 1]?.message}
                          </p>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Messages */}
              <Card className="md:col-span-2 h-[400px] md:h-[500px] flex flex-col">
                <CardHeader className="py-3 border-b">
                  <CardTitle className="text-sm">
                    {selectedConversation ? selectedConversation.email : 'Selecione uma conversa'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
                  <ScrollArea className="flex-1 p-4">
                    {selectedConversation ? (
                      <div className="space-y-3">
                        {selectedConversation.messages.map(msg => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.is_from_admin ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                msg.is_from_admin
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              {msg.is_from_admin && (
                                <Badge variant="outline" className="mb-1 text-xs bg-background">
                                  Admin
                                </Badge>
                              )}
                              <p>{msg.message}</p>
                              <span className="text-xs opacity-70">
                                {new Date(msg.created_at).toLocaleString('pt-BR')}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Selecione uma conversa para ver as mensagens
                      </p>
                    )}
                  </ScrollArea>

                  {selectedConversation && (
                    <div className="p-3 border-t flex gap-2 flex-shrink-0 bg-background">
                      <Input
                        value={replyMessage}
                        onChange={e => setReplyMessage(e.target.value)}
                        placeholder="Digite sua resposta..."
                        onKeyDown={e => e.key === 'Enter' && sendReply()}
                        disabled={sending}
                        className="flex-1"
                      />
                      <Button onClick={sendReply} disabled={sending || !replyMessage.trim()} size="icon">
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardContent className="p-6">
                <p className="text-muted-foreground text-center py-8">
                  Gerenciamento de usuários em desenvolvimento.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}