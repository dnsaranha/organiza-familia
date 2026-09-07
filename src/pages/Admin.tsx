import { useState, useEffect, useLayoutEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Header } from '@/components/Header';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  MessageCircle, Users, Shield, Send, Loader2, RefreshCw, 
  Search, TrendingUp, CreditCard, UserPlus,
  Clock, BarChart3, DollarSign, Target, CheckCircle2,
  ChevronLeft, ChevronRight, Activity, Sparkles
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { AIAssistantAdminTab } from '@/components/admin/AIAssistantAdminTab';

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
  full_name: string;
  plan: string;
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
  email: string | null;
  full_name: string | null;
  plan: string;
  last_activity_at: string | null;
  created_at: string | null;
}

const USERS_PER_PAGE = 10;

const PLAN_COLORS: Record<string, string> = {
  'Gratuito': '#94a3b8',
  'Básico': '#3b82f6',
  'Avançado': '#8b5cf6',
  'Personalizado': '#10b981',
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('users');
  
  // Support state
  const [conversations, setConversations] = useState<UserWithMessages[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [supportFilter, setSupportFilter] = useState<'all' | 'unread'>('all');
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Users and stats state
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Scroll to bottom of chat container directly
  const scrollToBottom = useCallback((instant = true) => {
    if (chatContainerRef.current) {
      if (instant) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      } else {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  }, []);

  const isNetworkError = (err: any) =>
    err?.message?.includes('Failed to fetch') ||
    err?.name === 'TypeError' ||
    err?.message?.includes('NetworkError') ||
    err?.message?.includes('aborted');

  const fetchStats = useCallback(async () => {
    try {
      const [
        { count: totalUsers },
        { count: activeSubscriptions },
        { count: totalTransactions },
        { count: totalGoals },
        { count: totalTasks }
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('stripe_subscriptions').select('*', { count: 'exact', head: true }).in('status', ['active', 'trialing']),
        supabase.from('transactions').select('*', { count: 'exact', head: true }),
        supabase.from('savings_goals').select('*', { count: 'exact', head: true }),
        supabase.from('scheduled_tasks').select('*', { count: 'exact', head: true })
      ]);

      setUserStats((prev) => ({
        total_users: totalUsers || 0,
        users_with_active_subscription: activeSubscriptions || 0,
        users_today: prev?.users_today || 0,
        total_transactions: totalTransactions || 0,
        total_goals: totalGoals || 0,
        total_tasks: totalTasks || 0,
      }));
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn('Conexão instável ao buscar estatísticas do admin.');
      } else {
        console.error('Error fetching stats:', err);
      }
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-list-users');
      if (error) throw error;
      const loadedUsers = (data?.users || []) as UserInfo[];
      setUsers(loadedUsers);
      if (typeof data?.users_today === 'number') {
        setUserStats((prev) => prev ? { ...prev, users_today: data.users_today } : prev);
      }
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn('Conexão instável ao carregar lista de clientes.');
      } else {
        console.error('Error fetching users:', err);
      }
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
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

      const conversationsList: UserWithMessages[] = userIds.map(userId => {
        const userMessages = grouped[userId] || [];
        const userObj = users.find(u => u.id === userId);
        return {
          user_id: userId,
          email: userObj?.email || profileMap[userId] || userId.slice(0, 8),
          full_name: userObj?.full_name || profileMap[userId] || 'Cliente',
          plan: userObj?.plan || 'Gratuito',
          messages: userMessages,
          unread_count: userMessages.filter(m => !m.is_read && !m.is_from_admin).length,
          last_message_at: userMessages[userMessages.length - 1]?.created_at || '',
        };
      });

      conversationsList.sort((a, b) => {
        // Prioritize unread messages
        if (a.unread_count > 0 && b.unread_count === 0) return -1;
        if (b.unread_count > 0 && a.unread_count === 0) return 1;
        return b.last_message_at.localeCompare(a.last_message_at);
      });

      setConversations(conversationsList);
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn('Conexão instável ao buscar conversas de suporte.');
      } else {
        console.error('Error fetching conversations:', err);
      }
    }
  }, [users]);

  const checkAdminStatus = useCallback(async () => {
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

      if (error && !isNetworkError(error)) {
        console.warn('Role check notice:', error.message);
      }

      // Security: Only genuine admins with database role 'admin' OR the registered owner email
      const isOwner = user.email?.toLowerCase() === 'dns.aranha@gmail.com';
      const isAdm = !!data || isOwner;
      setIsAdmin(isAdm);

      if (isAdm) {
        // If owner is not yet persisted in user_roles, ensure the admin role is registered
        if (isOwner && !data) {
          try {
            await supabase.from('user_roles').upsert({ user_id: user.id, role: 'admin' }, { onConflict: 'user_id,role' });
          } catch (e) {
            // Ignore non-blocking role sync
          }
        }
        await Promise.all([fetchStats(), fetchUsers()]);
      }
    } catch (err) {
      if (isNetworkError(err)) {
        console.warn('Conexão instável ao verificar status de administrador.');
      } else {
        console.error('Error checking admin status:', err);
      }
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }, [user, fetchStats, fetchUsers]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  useEffect(() => {
    if (isAdmin) {
      fetchConversations();
    }
  }, [isAdmin, fetchConversations]);

  // Real-time listener for incoming support messages
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('admin-support-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_messages' },
        (payload) => {
          const newMsg = payload.new as SupportMessage;
          setConversations(prev => {
            const index = prev.findIndex(c => c.user_id === newMsg.user_id);
            if (index >= 0) {
              const updated = [...prev];
              const conv = { ...updated[index] };
              conv.messages = [...conv.messages, newMsg];
              if (!newMsg.is_from_admin && !newMsg.is_read) {
                conv.unread_count += 1;
              }
              conv.last_message_at = newMsg.created_at;
              updated[index] = conv;
              return updated;
            } else {
              fetchConversations();
              return prev;
            }
          });

          // Show toast if message from customer
          if (!newMsg.is_from_admin) {
            toast({
              title: 'Nova mensagem de suporte',
              description: newMsg.message.slice(0, 60),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, fetchConversations, toast]);

  // Jump directly and instantly to the latest message without scrolling delay or page jump
  useLayoutEffect(() => {
    scrollToBottom(true);
  }, [selectedUser, scrollToBottom]);

  // Keep bottom aligned when new messages are added
  useEffect(() => {
    scrollToBottom(true);
  }, [conversations, scrollToBottom]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchStats(), fetchUsers(), fetchConversations()]);
    setRefreshing(false);
    toast({ title: 'Dados atualizados com sucesso' });
  };

  const markAsRead = async (userId: string) => {
    try {
      await supabase
        .from('support_messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_from_admin', false);

      setConversations(prev =>
        prev.map(c => (c.user_id === userId ? { ...c, unread_count: 0 } : c))
      );
    } catch (err) {
      console.error('Error marking as read:', err);
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
      scrollToBottom();
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const openUserSupport = (userId: string) => {
    setSelectedUser(userId);
    markAsRead(userId);
    setActiveTab('support');
  };

  // Filtered lists
  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const matchSearch = 
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.full_name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchUnread = supportFilter === 'all' || c.unread_count > 0;
      return matchSearch && matchUnread;
    });
  }, [conversations, searchTerm, supportFilter]);

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = 
        (u.full_name || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.id.toLowerCase().includes(userSearchTerm.toLowerCase());
      
      const matchesPlan = userPlanFilter === 'all' || u.plan === userPlanFilter;
      return matchesSearch && matchesPlan;
    });
  }, [users, userSearchTerm, userPlanFilter]);

  // Pagination for users table
  const totalPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE) || 1;
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const unreadMessagesTotal = useMemo(() => {
    return conversations.reduce((acc, c) => acc + c.unread_count, 0);
  }, [conversations]);

  // Plan distribution for chart
  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const u of users) {
      const plan = u.plan || 'Gratuito';
      counts[plan] = (counts[plan] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [users]);

  const selectedConversation = conversations.find(c => c.user_id === selectedUser);

  const getInitials = (name: string | null, email: string | null) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'US';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Verificando permissões de administrador...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-destructive/30">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
            <p className="text-muted-foreground mb-6 text-sm">
              Esta área é reservada para a administração do aplicativo e suporte aos clientes.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">Voltar ao Início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const conversionRate = userStats?.total_users 
    ? ((userStats.users_with_active_subscription / userStats.total_users) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Painel Administrativo</h1>
              <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 flex items-center gap-1">
                <Activity className="h-3 w-3" /> Tempo Real Ativo
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Gestão de clientes, atendimento de suporte e métricas de desempenho do app
            </p>
          </div>

          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh}
            disabled={refreshing}
            className="self-start sm:self-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} /> 
            {refreshing ? 'Atualizando...' : 'Atualizar Dados'}
          </Button>
        </div>

        {/* 4 Core Vital Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{userStats?.total_users ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Total de Clientes</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-xl">
                <CreditCard className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-2xl font-bold leading-none">{userStats?.users_with_active_subscription ?? 0}</p>
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 font-normal">
                    {conversionRate}%
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Assinantes Ativos</p>
              </div>
            </CardContent>
          </Card>

          <Card 
            className={`shadow-sm transition-colors cursor-pointer hover:border-primary/50 ${unreadMessagesTotal > 0 ? 'border-amber-500/50 bg-amber-500/5' : ''}`}
            onClick={() => setActiveTab('support')}
          >
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${unreadMessagesTotal > 0 ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-2xl font-bold leading-none">{unreadMessagesTotal}</p>
                  {unreadMessagesTotal > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                      Pendentes
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Dúvidas no Suporte</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 rounded-xl">
                <UserPlus className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold leading-none">{userStats?.users_today ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Novos Clientes Hoje</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-4 h-auto p-1 bg-muted/80 rounded-xl gap-1">
            <TabsTrigger 
              value="users" 
              className="flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-xs sm:text-sm"
            >
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span>Clientes</span>
              <span className="text-[10px] opacity-75 hidden sm:inline">({users.length})</span>
            </TabsTrigger>

            <TabsTrigger 
              value="support" 
              className="flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-xs sm:text-sm relative"
            >
              <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="sm:hidden">Suporte</span>
              <span className="hidden sm:inline">Atendimento</span>
              {unreadMessagesTotal > 0 && (
                <span className="bg-destructive text-destructive-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none shrink-0">
                  {unreadMessagesTotal}
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger 
              value="ai_assistant" 
              className="flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-xs sm:text-sm"
            >
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 text-primary" />
              <span className="sm:hidden">IA & Custos</span>
              <span className="hidden sm:inline">Assistente IA & Custos</span>
            </TabsTrigger>

            <TabsTrigger 
              value="analytics" 
              className="flex items-center justify-center gap-1 sm:gap-1.5 py-2 px-1 text-xs sm:text-sm"
            >
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
              <span className="sm:hidden">Métricas</span>
              <span className="hidden sm:inline">Métricas & Desempenho</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GESTÃO DE CLIENTES / USUÁRIOS */}
          <TabsContent value="users" className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Clientes Registrados</CardTitle>
                    <CardDescription className="text-xs">
                      Gerencie e visualize as contas cadastradas na plataforma
                    </CardDescription>
                  </div>

                  {/* Plan Quick Filters with smooth horizontal scroll on mobile */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                    <Button 
                      size="sm" 
                      variant={userPlanFilter === 'all' ? 'default' : 'outline'}
                      className="h-7 text-xs shrink-0"
                      onClick={() => { setUserPlanFilter('all'); setCurrentPage(1); }}
                    >
                      Todos ({users.length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant={userPlanFilter === 'Gratuito' ? 'default' : 'outline'}
                      className="h-7 text-xs shrink-0"
                      onClick={() => { setUserPlanFilter('Gratuito'); setCurrentPage(1); }}
                    >
                      Gratuito ({users.filter(u => u.plan === 'Gratuito').length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant={userPlanFilter === 'Básico' ? 'default' : 'outline'}
                      className="h-7 text-xs shrink-0"
                      onClick={() => { setUserPlanFilter('Básico'); setCurrentPage(1); }}
                    >
                      Básico ({users.filter(u => u.plan === 'Básico').length})
                    </Button>
                    <Button 
                      size="sm" 
                      variant={userPlanFilter === 'Avançado' ? 'default' : 'outline'}
                      className="h-7 text-xs shrink-0"
                      onClick={() => { setUserPlanFilter('Avançado'); setCurrentPage(1); }}
                    >
                      Avançado ({users.filter(u => u.plan === 'Avançado').length})
                    </Button>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative mt-3 max-w-md">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, e-mail ou ID..."
                    value={userSearchTerm}
                    onChange={e => { setUserSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="pl-8 h-9 text-xs sm:text-sm"
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {usersLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Carregando dados dos clientes...</p>
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead className="w-[280px]">Cliente</TableHead>
                            <TableHead>E-mail</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Última Atividade</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedUsers.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                Nenhum cliente encontrado para este filtro.
                              </TableCell>
                            </TableRow>
                          ) : (
                            paginatedUsers.map(u => {
                              const userUnread = conversations.find(c => c.user_id === u.id)?.unread_count || 0;
                              return (
                                <TableRow key={u.id} className="hover:bg-muted/30">
                                  <TableCell>
                                    <div className="flex items-center gap-2.5">
                                      <Avatar className="h-8 w-8 text-xs font-semibold bg-primary/10 text-primary">
                                        <AvatarFallback>{getInitials(u.full_name, u.email)}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-medium text-xs sm:text-sm text-foreground leading-tight">
                                          {u.full_name || 'Sem nome informado'}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground font-mono">
                                          ID: {u.id.slice(0, 8)}...
                                        </p>
                                      </div>
                                    </div>
                                  </TableCell>

                                  <TableCell className="text-xs sm:text-sm text-muted-foreground">
                                    {u.email || '-'}
                                  </TableCell>

                                  <TableCell>
                                    <Badge 
                                      variant={u.plan === 'Gratuito' ? 'secondary' : 'default'}
                                      className="text-xs font-normal"
                                      style={{
                                        backgroundColor: u.plan !== 'Gratuito' ? PLAN_COLORS[u.plan] || undefined : undefined
                                      }}
                                    >
                                      {u.plan}
                                    </Badge>
                                  </TableCell>

                                  <TableCell className="text-xs text-muted-foreground">
                                    {u.last_activity_at
                                      ? new Date(u.last_activity_at).toLocaleString('pt-BR', {
                                          day: '2-digit', month: '2-digit', year: '2-digit',
                                          hour: '2-digit', minute: '2-digit',
                                        })
                                      : 'Sem registro'}
                                  </TableCell>

                                  <TableCell className="text-right">
                                    <Button
                                      variant={userUnread > 0 ? 'default' : 'outline'}
                                      size="sm"
                                      className="h-8 text-xs gap-1.5"
                                      onClick={() => openUserSupport(u.id)}
                                    >
                                      <MessageCircle className="h-3.5 w-3.5" /> 
                                      Atendimento
                                      {userUnread > 0 && (
                                        <Badge variant="destructive" className="ml-0.5 px-1 py-0 h-4 text-[10px]">
                                          {userUnread}
                                        </Badge>
                                      )}
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          )}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4 text-xs text-muted-foreground">
                      <p>
                        Mostrando <strong>{paginatedUsers.length}</strong> de <strong>{filteredUsers.length}</strong> clientes
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          className="h-8 px-2"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Button>
                        <span className="font-medium text-foreground px-2">
                          Página {currentPage} de {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          className="h-8 px-2"
                        >
                          Próxima <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 2: ATENDIMENTO / SUPORTE AO CLIENTE */}
          <TabsContent value="support">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Left Column: Conversations List */}
              <Card className="md:col-span-1 h-[520px] flex flex-col shadow-sm">
                <CardHeader className="py-3 px-4 border-b space-y-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">Conversas</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={supportFilter === 'all' ? 'secondary' : 'ghost'}
                        className="h-6 text-[11px] px-2"
                        onClick={() => setSupportFilter('all')}
                      >
                        Todas ({conversations.length})
                      </Button>
                      <Button
                        size="sm"
                        variant={supportFilter === 'unread' ? 'secondary' : 'ghost'}
                        className="h-6 text-[11px] px-2 text-amber-600 dark:text-amber-400"
                        onClick={() => setSupportFilter('unread')}
                      >
                        Pendentes ({unreadMessagesTotal})
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por cliente..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                </CardHeader>

                <CardContent className="p-0 flex-1 overflow-hidden">
                  <ScrollArea className="h-[430px]">
                    {filteredConversations.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        Nenhuma conversa encontrada.
                      </div>
                    ) : (
                      filteredConversations.map(conv => {
                        const isSelected = selectedUser === conv.user_id;
                        const lastMsg = conv.messages[conv.messages.length - 1];

                        return (
                          <div
                            key={conv.user_id}
                            className={`p-3 border-b cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 border-l-4 border-l-primary' : 'hover:bg-muted/40'
                            }`}
                            onClick={() => {
                              setSelectedUser(conv.user_id);
                              markAsRead(conv.user_id);
                            }}
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-medium text-xs sm:text-sm truncate">
                                {conv.full_name || conv.email}
                              </span>
                              {conv.unread_count > 0 && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 animate-pulse">
                                  {conv.unread_count}
                                </Badge>
                              )}
                            </div>

                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {lastMsg ? (lastMsg.is_from_admin ? 'Você: ' : '') + lastMsg.message : 'Sem mensagens'}
                            </p>

                            <div className="flex items-center justify-between mt-1 text-[10px] text-muted-foreground">
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 font-normal">
                                {conv.plan}
                              </Badge>
                              {conv.last_message_at && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {new Date(conv.last_message_at).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Right Column: Chat Window */}
              <Card className="md:col-span-2 h-[520px] flex flex-col shadow-sm">
                <CardHeader className="py-3 px-4 border-b flex-shrink-0">
                  {selectedConversation ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-8 w-8 text-xs font-semibold bg-primary/10 text-primary">
                          <AvatarFallback>{getInitials(selectedConversation.full_name, selectedConversation.email)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold leading-tight">
                            {selectedConversation.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedConversation.email}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        Plano: {selectedConversation.plan}
                      </Badge>
                    </div>
                  ) : (
                    <CardTitle className="text-sm font-semibold">Atendimento ao Cliente</CardTitle>
                  )}
                </CardHeader>

                <CardContent className="flex-1 p-0 flex flex-col overflow-hidden bg-muted/10">
                  {selectedConversation ? (
                    <div 
                      ref={chatContainerRef} 
                      className="flex-1 p-4 overflow-y-auto space-y-3"
                    >
                      {selectedConversation.messages.map(msg => (
                        <div
                          key={msg.id}
                          className={`flex ${msg.is_from_admin ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-xs sm:text-sm shadow-xs ${
                              msg.is_from_admin
                                ? 'bg-primary text-primary-foreground rounded-br-xs'
                                : 'bg-card text-foreground border rounded-bl-xs'
                            }`}
                          >
                            <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                            <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${msg.is_from_admin ? 'text-primary-foreground/75' : 'text-muted-foreground'}`}>
                              {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                                hour: '2-digit', minute: '2-digit'
                              })}
                              {msg.is_from_admin && <CheckCircle2 className="h-3 w-3 inline" />}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted-foreground">
                      <MessageCircle className="h-10 w-10 mb-2 opacity-30" />
                      <p className="font-medium text-sm">Nenhuma conversa selecionada</p>
                      <p className="text-xs mt-0.5">Selecione um cliente na lista ao lado para ver o histórico e responder.</p>
                    </div>
                  )}

                  {/* Reply Input */}
                  {selectedConversation && (
                    <div className="p-3 border-t flex gap-2 flex-shrink-0 bg-card">
                      <Textarea
                        value={replyMessage}
                        onChange={e => setReplyMessage(e.target.value)}
                        placeholder="Digite a resposta ao cliente... (Enter para enviar, Shift+Enter para nova linha)"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendReply();
                          }
                        }}
                        disabled={sending}
                        className="flex-1 min-h-[50px] max-h-[100px] resize-none text-xs sm:text-sm"
                        rows={2}
                      />
                      <Button 
                        onClick={sendReply} 
                        disabled={sending || !replyMessage.trim()} 
                        size="icon" 
                        className="self-end h-10 w-10"
                      >
                        {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* TAB 3: ASSISTENTE IA & CUSTOS CONSOLIDADOS */}
          <TabsContent value="ai_assistant" className="space-y-4">
            <AIAssistantAdminTab
              currentUserEmail={user?.email}
              isAdmin={isAdmin}
              onOpenUserChat={(targetUserId) => {
                setActiveTab('support');
                setSelectedUserId(targetUserId);
              }}
            />
          </TabsContent>

          {/* TAB 4: DESEMPENHO DO APLICATIVO & ANALYTICS */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Plan Distribution Chart */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Distribuição de Clientes por Plano
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Composição da base de clientes entre Gratuito e Pagantes
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[260px] flex items-center justify-center">
                  {planDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={planDistribution}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                          labelLine={false}
                        >
                          {planDistribution.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={PLAN_COLORS[entry.name] || '#64748b'} 
                            />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem dados de distribuição disponíveis.</p>
                  )}
                </CardContent>
              </Card>

              {/* Engagement Metrics Card */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" /> Engajamento e Uso do App
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Métricas de utilização das funcionalidades financeiras
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-purple-500" />
                      <span className="text-xs sm:text-sm font-medium">Transações Registradas</span>
                    </div>
                    <span className="font-bold text-sm">{userStats?.total_transactions ?? 0}</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-orange-500" />
                      <span className="text-xs sm:text-sm font-medium">Metas de Economia Criadas</span>
                    </div>
                    <span className="font-bold text-sm">{userStats?.total_goals ?? 0}</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-cyan-500" />
                      <span className="text-xs sm:text-sm font-medium">Tarefas / Lembretes Agendados</span>
                    </div>
                    <span className="font-bold text-sm">{userStats?.total_tasks ?? 0}</span>
                  </div>

                  <div className="flex justify-between items-center p-2.5 rounded-lg bg-muted/40">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs sm:text-sm font-medium">Taxa de Conversão em Assinantes</span>
                    </div>
                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                      {conversionRate}%
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
