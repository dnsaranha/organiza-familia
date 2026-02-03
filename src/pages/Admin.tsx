import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, Users, Shield, Send, Loader2, RefreshCw, 
  Search, TrendingUp, CreditCard, UserCheck, UserPlus,
  Clock, Calendar, BarChart3, DollarSign, Target, CheckCircle2
} from 'lucide-react';

interface SupportMessage {
  id: string;
  user_id: string;
  message: string;
  is_from_admin: boolean;
  is_read: boolean;
  created_at: string;
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
  users_with_active_subscription: number;
  users_today: number;
  total_transactions: number;
  total_goals: number;
  total_tasks: number;
}

interface UserInfo {
  id: string;
  full_name: string | null;
  subscription_plan: string | null;
  updated_at: string | null;
  transaction_count?: number;
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
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
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
        fetchStats();
      }
    } catch (err) {
      console.error('Error checking admin status:', err);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Count profiles
      const { count: totalUsers } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Count active subscriptions
      const { count: activeSubscriptions } = await supabase
        .from('stripe_subscriptions')
        .select('*', { count: 'exact', head: true })
        .in('status', ['active', 'trialing']);

      // Count transactions
      const { count: totalTransactions } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });

      // Count goals
      const { count: totalGoals } = await supabase
        .from('savings_goals')
        .select('*', { count: 'exact', head: true });

      // Count tasks
      const { count: totalTasks } = await supabase
        .from('scheduled_tasks')
        .select('*', { count: 'exact', head: true });

      // Users registered today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: usersToday } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', today.toISOString());

      setUserStats({
        total_users: totalUsers || 0,
        users_with_active_subscription: activeSubscriptions || 0,
        users_today: usersToday || 0,
        total_transactions: totalTransactions || 0,
        total_goals: totalGoals || 0,
        total_tasks: totalTasks || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, subscription_plan, updated_at')
        .order('updated_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setUsers(profiles || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const { data: messages, error } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;

      const grouped = (messages || []).reduce((acc: Record<string, SupportMessage[]>, msg) => {
        if (!acc[msg.user_id]) acc[msg.user_id] = [];
        acc[msg.user_id].push(msg);
        return acc;
      }, {});

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

  const filteredConversations = conversations.filter(c =>
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.id.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

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
          <Button variant="outline" size="sm" onClick={() => { fetchConversations(); fetchStats(); }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
          </Button>
        </div>

        {/* Stats Cards */}
        {userStats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.total_users}</p>
                  <p className="text-xs text-muted-foreground">Usuários</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CreditCard className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.users_with_active_subscription}</p>
                  <p className="text-xs text-muted-foreground">Assinantes</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <UserPlus className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.users_today}</p>
                  <p className="text-xs text-muted-foreground">Novos Hoje</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.total_transactions}</p>
                  <p className="text-xs text-muted-foreground">Transações</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Target className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.total_goals}</p>
                  <p className="text-xs text-muted-foreground">Metas</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{userStats.total_tasks}</p>
                  <p className="text-xs text-muted-foreground">Tarefas</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs defaultValue="support" className="space-y-4" onValueChange={(val) => {
          if (val === 'users' && users.length === 0) fetchUsers();
        }}>
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
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="support">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Conversations List */}
              <Card className="md:col-span-1 h-[400px] md:h-[500px]">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm">Conversas</CardTitle>
                  <div className="relative mt-2">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar usuário..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[280px] md:h-[380px]">
                    {filteredConversations.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        Nenhuma conversa encontrada
                      </p>
                    ) : (
                      filteredConversations.map(conv => (
                        <div
                          key={conv.user_id}
                          className={`p-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
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
                          <p className="text-xs text-muted-foreground mt-1">
                            <Clock className="inline h-3 w-3 mr-1" />
                            {new Date(conv.last_message_at).toLocaleString('pt-BR', {
                              day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
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
                              <p className="whitespace-pre-wrap">{msg.message}</p>
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
                      <Textarea
                        value={replyMessage}
                        onChange={e => setReplyMessage(e.target.value)}
                        placeholder="Digite sua resposta..."
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                        disabled={sending}
                        className="flex-1 min-h-[60px] resize-none"
                        rows={2}
                      />
                      <Button onClick={sendReply} disabled={sending || !replyMessage.trim()} size="icon" className="self-end">
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
              <CardHeader>
                <CardTitle>Usuários Cadastrados</CardTitle>
                <CardDescription>Lista dos usuários mais recentes</CardDescription>
                <div className="relative mt-2 max-w-sm">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou ID..."
                    value={userSearchTerm}
                    onChange={e => setUserSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Plano</TableHead>
                          <TableHead>Última Atividade</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                              Nenhum usuário encontrado
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredUsers.map(u => (
                            <TableRow key={u.id}>
                              <TableCell className="font-medium">
                                {u.full_name || 'Sem nome'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={u.subscription_plan === 'free' || !u.subscription_plan ? 'secondary' : 'default'}>
                                  {u.subscription_plan || 'free'}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {u.updated_at ? new Date(u.updated_at).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(u.id);
                                    const tab = document.querySelector('[data-value="support"]') as HTMLElement;
                                    if (tab) tab.click();
                                  }}
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" /> Chat
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" /> Resumo de Engajamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {userStats && (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Taxa de Conversão</span>
                        <span className="font-bold">
                          {userStats.total_users > 0
                            ? ((userStats.users_with_active_subscription / userStats.total_users) * 100).toFixed(1)
                            : 0}%
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Transações por Usuário</span>
                        <span className="font-bold">
                          {userStats.total_users > 0
                            ? (userStats.total_transactions / userStats.total_users).toFixed(1)
                            : 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Metas por Usuário</span>
                        <span className="font-bold">
                          {userStats.total_users > 0
                            ? (userStats.total_goals / userStats.total_users).toFixed(1)
                            : 0}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Tarefas por Usuário</span>
                        <span className="font-bold">
                          {userStats.total_users > 0
                            ? (userStats.total_tasks / userStats.total_users).toFixed(1)
                            : 0}
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" /> Suporte
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Conversas Abertas</span>
                    <span className="font-bold">{conversations.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Mensagens Não Lidas</span>
                    <span className="font-bold text-destructive">
                      {conversations.reduce((acc, c) => acc + c.unread_count, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Total de Mensagens</span>
                    <span className="font-bold">
                      {conversations.reduce((acc, c) => acc + c.messages.length, 0)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
