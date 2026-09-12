import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Sparkles, 
  DollarSign, 
  Coins, 
  MessageSquare, 
  Users, 
  ShieldCheck, 
  RefreshCw, 
  Save, 
  Play, 
  RotateCcw, 
  Search, 
  Clock, 
  Sliders, 
  BookOpen, 
  Lock,
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { aiCalibrationService } from '@/lib/ai/aiCalibrationService';
import { DEFAULT_AI_SETTINGS } from '@/lib/ai/defaultSettings';
import { AIAssistantSettings, AICostConsolidation, AIUserUsageSummary } from '@/types/ai';

interface AIAssistantAdminTabProps {
  currentUserEmail?: string;
  isAdmin: boolean;
  onOpenUserChat?: (userId: string) => void;
}

export const AIAssistantAdminTab: React.FC<AIAssistantAdminTabProps> = ({
  currentUserEmail,
  isAdmin,
  onOpenUserChat
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<AIAssistantSettings>(DEFAULT_AI_SETTINGS);

  // Metrics State
  const [consolidation, setConsolidation] = useState<AICostConsolidation>({
    totalInteractions: 0,
    totalPromptTokens: 0,
    totalResponseTokens: 0,
    totalTokens: 0,
    totalCostUsd: 0,
    totalCostBrl: 0,
    averageCostPerMessageBrl: 0,
    uniqueUsersCount: 0,
  });
  const [userSummaries, setUserSummaries] = useState<AIUserUsageSummary[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [planFilter, setPlanFilter] = useState('all');

  // Test Console State
  const [testPrompt, setTestPrompt] = useState('Como devo organizar minha renda segundo a regra 50/30/20?');
  const [testResult, setTestResult] = useState<{
    reply: string;
    modelUsed: string;
    tokens: { prompt: number; response: number; total: number };
    cost: { usd: number; brl: number };
    timeMs: number;
  } | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [fetchedSettings, metrics] = await Promise.all([
        aiCalibrationService.getSettings(),
        aiCalibrationService.getConsolidatedMetrics(),
      ]);

      setSettings(fetchedSettings);
      setConsolidation(metrics.consolidation);
      setUserSummaries(metrics.userSummaries);
    } catch (err: any) {
      console.error('Error loading AI data:', err);
      toast({
        title: 'Erro ao carregar dados da IA',
        description: err?.message || 'Falha ao buscar configurações e métricas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [isAdmin, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Save
  const handleSaveSettings = async () => {
    if (!isAdmin) {
      toast({
        title: 'Ação Bloqueada',
        description: 'Apenas administradores autenticados podem alterar a calibração da IA.',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      await aiCalibrationService.saveSettings(settings, currentUserEmail);
      toast({
        title: 'Calibração Salva com Sucesso!',
        description: 'As novas diretrizes e limites da IA já estão ativas no sistema.',
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao Salvar',
        description: err?.message || 'Não foi possível persistir as alterações.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Handle Restore Defaults
  const handleRestoreDefaults = () => {
    if (confirm('Deseja restaurar as diretrizes recomendadas de Finanças Familiares e limites padrões?')) {
      setSettings({
        ...DEFAULT_AI_SETTINGS,
        id: settings.id,
      });
      toast({
        title: 'Padrões Restaurados',
        description: 'Clique em "Salvar Calibração" para confirmar a atualização.',
      });
    }
  };

  // Handle Test
  const handleRunTest = async () => {
    if (!testPrompt.trim()) return;
    setTesting(true);
    setTestResult(null);

    const startTime = Date.now();
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'admin-test-console',
          userEmail: currentUserEmail || 'admin@organiza.com',
          userPlan: 'Administrador',
          message: testPrompt,
          calibrationSettings: settings,
          financialSummary: {
            monthlyIncome: 7500,
            monthlyExpenses: 5200,
            balance: 2300,
            savingsRate: 30.6,
            activeGoalsCount: 3,
            topCategory: 'Alimentação',
            totalInvested: 28500,
            topCategories: [
              { category: 'Alimentação', amount: 1850, percentage: 35.6 },
              { category: 'Moradia', amount: 1600, percentage: 30.8 },
              { category: 'Transporte', amount: 620, percentage: 11.9 },
              { category: 'Lazer', amount: 480, percentage: 9.2 },
            ],
            recentTransactions: [
              { date: '2026-09-08', description: 'Supermercado Pão de Açúcar', category: 'Alimentação', amount: 240, type: 'expense', paymentMethod: 'Débito' },
              { date: '2026-09-07', description: 'Posto Shell Gasolina', category: 'Transporte', amount: 180, type: 'expense', paymentMethod: 'Crédito' },
              { date: '2026-09-05', description: 'Salário Empresa XYZ', category: 'Salário', amount: 7500, type: 'income', paymentMethod: 'Pix' },
            ],
            portfolioItems: [
              { ticker: 'MXRF11', assetName: 'Maxi Renda FII', assetType: 'FIIs', quantity: 600, averagePrice: 10.20, totalCost: 6120 },
              { ticker: 'HGLG11', assetName: 'CSHG Logística', assetType: 'FIIs', quantity: 35, averagePrice: 168.00, totalCost: 5880 },
              { ticker: 'Tesouro Selic 2029', assetName: 'Tesouro Direto', assetType: 'Renda Fixa', quantity: 1, averagePrice: 16500, totalCost: 16500 },
            ],
            investmentAllocations: {
              'Renda Fixa': { amount: 16500, percentage: 57.9 },
              'FIIs': { amount: 12000, percentage: 42.1 },
            },
            goals: [
              { title: 'Reserva de Emergência', targetAmount: 25000, currentAmount: 18000, progressPercentage: 72, deadline: '2026-12-31' },
              { title: 'Viagem em Família', targetAmount: 8000, currentAmount: 4200, progressPercentage: 52.5, deadline: '2027-02-15' },
            ],
            upcomingBills: [
              { title: 'Condomínio', amount: 650, dueDate: '2026-09-10' },
              { title: 'Fatura do Cartão', amount: 1450, dueDate: '2026-09-15' },
            ],
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || `Erro ${res.status}`);
      }

      const data = await res.json();
      const elapsed = Date.now() - startTime;

      setTestResult({
        reply: data.reply,
        modelUsed: data.modelUsed,
        tokens: {
          prompt: data.usage.promptTokens,
          response: data.usage.responseTokens,
          total: data.usage.totalTokens,
        },
        cost: {
          usd: data.usage.costUsd,
          brl: data.usage.costBrl,
        },
        timeMs: elapsed,
      });

      // Reload consolidated metrics after test
      const metrics = await aiCalibrationService.getConsolidatedMetrics();
      setConsolidation(metrics.consolidation);
      setUserSummaries(metrics.userSummaries);
    } catch (err: any) {
      toast({
        title: 'Falha no Teste da IA',
        description: err?.message || 'Verifique a conexão e chave da API.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  // Filtered Users
  const filteredUsers = userSummaries.filter((u) => {
    const matchesSearch =
      u.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = planFilter === 'all' || u.user_plan.toLowerCase() === planFilter.toLowerCase();
    return matchesSearch && matchesPlan;
  });

  if (!isAdmin) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="p-6 text-center">
          <Lock className="h-8 w-8 text-destructive mx-auto mb-2" />
          <h3 className="font-semibold text-destructive">Acesso Negado</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Você não possui autorização para visualizar ou alterar a calibração de IA e relatórios de custos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar with Status & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-4 rounded-xl border">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-base">Assistente de IA & Controle de Custos</h2>
              <Badge variant={settings.is_active ? 'default' : 'secondary'} className="text-xs">
                {settings.is_active ? 'Assistente Ativo' : 'Assistente Pausado'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Calibração comportamental, limites de tokens e auditoria financeira por usuário
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button size="sm" onClick={handleSaveSettings} disabled={saving} className="bg-primary hover:bg-primary/90">
            <Save className={`h-4 w-4 mr-1.5 ${saving ? 'animate-spin' : ''}`} />
            Salvar Calibração
          </Button>
        </div>
      </div>

      {/* 5 Vital Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Custo Total (BRL)</span>
              <DollarSign className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              R$ {consolidation.totalCostBrl.toFixed(4)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              ${consolidation.totalCostUsd.toFixed(4)} USD
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tokens Totais</span>
              <Coins className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold mt-1">
              {consolidation.totalTokens.toLocaleString('pt-BR')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {consolidation.totalPromptTokens.toLocaleString('pt-BR')} in / {consolidation.totalResponseTokens.toLocaleString('pt-BR')} out
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Interações</span>
              <MessageSquare className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1">
              {consolidation.totalInteractions.toLocaleString('pt-BR')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">mensagens respondidas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Custo Médio / Msg</span>
              <Coins className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-xl font-bold mt-1">
              R$ {consolidation.averageCostPerMessageBrl.toFixed(5)}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">&lt; 1 centavo por resposta</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Usuários Atendidos</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-xl font-bold mt-1">
              {consolidation.uniqueUsersCount}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">contas únicas no mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Internal Tabs: 1. Custos por Usuário | 2. Calibração da IA | 3. Console de Teste */}
      <Tabs defaultValue="costs" className="space-y-4">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto h-auto p-1 bg-muted rounded-lg">
          <TabsTrigger value="costs" className="text-xs sm:text-sm py-1.5 flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            <span>Custos por Usuário</span>
          </TabsTrigger>
          <TabsTrigger value="calibration" className="text-xs sm:text-sm py-1.5 flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5" />
            <span>Calibração da IA</span>
          </TabsTrigger>
          <TabsTrigger value="test" className="text-xs sm:text-sm py-1.5 flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5" />
            <span>Simulador & Testes</span>
          </TabsTrigger>
        </TabsList>

        {/* SUB-TAB 1: CUSTOS POR USUÁRIO */}
        <TabsContent value="costs" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Consolidação de Custos por Cliente</CardTitle>
                  <CardDescription className="text-xs">
                    Acompanhe em tempo real quais usuários mais utilizam o assistente e os custos em Reais
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative w-48 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por e-mail..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-8 text-xs"
                    />
                  </div>
                  <Select value={planFilter} onValueChange={setPlanFilter}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue placeholder="Plano" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Planos</SelectItem>
                      <SelectItem value="gratuito">Gratuito</SelectItem>
                      <SelectItem value="básico">Básico</SelectItem>
                      <SelectItem value="avançado">Avançado</SelectItem>
                      <SelectItem value="pro">Pro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <div className="text-center py-10 border rounded-lg border-dashed">
                  <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-muted-foreground">Nenhum registro de uso encontrado</p>
                  <p className="text-xs text-muted-foreground/75 mt-1">
                    Assim que os usuários interagirem com o chat de suporte, o consumo aparecerá discriminado aqui.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-muted/60 text-muted-foreground border-b uppercase text-[10px]">
                      <tr>
                        <th className="p-3">Usuário</th>
                        <th className="p-3">Plano</th>
                        <th className="p-3 text-center">Interações</th>
                        <th className="p-3 text-right">Tokens In / Out</th>
                        <th className="p-3 text-right">Custo Estimado (R$)</th>
                        <th className="p-3 text-right">Último Acesso</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredUsers.map((u) => (
                        <tr key={u.user_id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">
                            <div className="flex flex-col">
                              <span className="text-foreground">{u.user_email}</span>
                              <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[140px]">
                                {u.user_id}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className="text-[10px] uppercase font-normal">
                              {u.user_plan}
                            </Badge>
                          </td>
                          <td className="p-3 text-center font-semibold">
                            {u.total_messages}
                          </td>
                          <td className="p-3 text-right font-mono text-[11px]">
                            {u.prompt_tokens.toLocaleString()} / {u.response_tokens.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                            R$ {u.total_cost_brl.toFixed(4)}
                          </td>
                          <td className="p-3 text-right text-muted-foreground text-[11px]">
                            {new Date(u.last_interaction_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="p-3 text-center">
                            {onOpenUserChat && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs px-2"
                                onClick={() => onOpenUserChat(u.user_id)}
                              >
                                Ver Chat
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUB-TAB 2: CALIBRAÇÃO DA IA */}
        <TabsContent value="calibration" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-primary" /> Parâmetros de Comportamento & Segurança
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Ajuste em tempo real a personalidade, regras de finanças familiares e travas de segurança
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleRestoreDefaults}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Restaurar Padrões
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Controls Row: Status, Model, Quota */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 bg-muted/40 rounded-xl border">
                <div className="flex items-center justify-between sm:justify-start gap-3">
                  <div>
                    <Label className="text-xs font-semibold">Status do Assistente</Label>
                    <p className="text-[10px] text-muted-foreground">Responder no chat de suporte</p>
                  </div>
                  <Switch
                    checked={settings.is_active}
                    onCheckedChange={(val) => setSettings({ ...settings, is_active: val })}
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Modelo Gemini</Label>
                  <Select
                    value={settings.model_name}
                    onValueChange={(val) => setSettings({ ...settings, model_name: val })}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue placeholder="Selecione o modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gemini-3.8-flash">gemini-3.8-flash (Recomendado & Econômico)</SelectItem>
                      <SelectItem value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra Rápido)</SelectItem>
                      <SelectItem value="gemini-flash-latest">gemini-flash-latest (Última Versão)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Limite Gratuito (Mensagens/Mês)</Label>
                  <Input
                    type="number"
                    min="5"
                    max="500"
                    value={settings.free_plan_monthly_limit}
                    onChange={(e) =>
                      setSettings({ ...settings, free_plan_monthly_limit: parseInt(e.target.value) || 20 })
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              {/* Sliders: Max output tokens & Tone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label className="text-xs font-medium">Limite Máximo de Tokens por Resposta</Label>
                    <span className="text-xs font-mono text-muted-foreground">{settings.max_output_tokens} tokens</span>
                  </div>
                  <input
                    type="range"
                    min="200"
                    max="1500"
                    step="50"
                    value={settings.max_output_tokens}
                    onChange={(e) =>
                      setSettings({ ...settings, max_output_tokens: parseInt(e.target.value) })
                    }
                    className="w-full accent-primary h-2 bg-muted rounded-lg cursor-pointer"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Controla o tamanho máximo da resposta para evitar custos desnecessários (~800 tokens = ~600 palavras).
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-medium">Tom de Voz da IA</Label>
                  <Input
                    value={settings.tone}
                    onChange={(e) => setSettings({ ...settings, tone: e.target.value })}
                    placeholder="Ex: didático, acolhedor e focado em finanças familiares"
                    className="h-8 text-xs mt-1"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Define a postura e linguagem utilizada pelo assistente ao interagir.
                  </p>
                </div>
              </div>

              {/* System Prompt */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Prompt do Sistema (Persona & Diretrizes CVM)
                  </Label>
                  <Badge variant="outline" className="text-[10px]">
                    {settings.system_prompt.length} caracteres
                  </Badge>
                </div>
                <Textarea
                  rows={8}
                  value={settings.system_prompt}
                  onChange={(e) => setSettings({ ...settings, system_prompt: e.target.value })}
                  className="font-mono text-xs leading-relaxed"
                  placeholder="Escreva aqui as instruções de personalidade, limites de atuação e regras de negócio..."
                />
              </div>

              {/* App Knowledge Base */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-blue-500" /> Base de Conhecimento do App (FAQ & Funcionalidades)
                  </Label>
                  <Badge variant="outline" className="text-[10px]">
                    {settings.knowledge_base.length} caracteres
                  </Badge>
                </div>
                <Textarea
                  rows={6}
                  value={settings.knowledge_base}
                  onChange={(e) => setSettings({ ...settings, knowledge_base: e.target.value })}
                  className="font-mono text-xs leading-relaxed"
                  placeholder="Instruções sobre como usar o app, regras de cálculo, importações e caminhos de menus..."
                />
              </div>

              {/* Disclaimer */}
              <div>
                <Label className="text-xs font-medium flex items-center gap-1.5 mb-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500" /> Disclaimer Regulatório (Aviso Legal da CVM)
                </Label>
                <Input
                  value={settings.disclaimer}
                  onChange={(e) => setSettings({ ...settings, disclaimer: e.target.value })}
                  className="text-xs h-8"
                  placeholder="Aviso legal exibido em respostas que tocam em investimentos..."
                />
              </div>

              {/* Save Footer */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Última atualização: {new Date(settings.updated_at).toLocaleString('pt-BR')} por {settings.updated_by || 'Sistema'}
                </div>
                <Button onClick={handleSaveSettings} disabled={saving} className="bg-primary hover:bg-primary/90">
                  <Save className={`h-4 w-4 mr-1.5 ${saving ? 'animate-spin' : ''}`} />
                  Salvar Calibração
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUB-TAB 3: SIMULADOR & TESTES */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4 text-emerald-500" /> Teste de Validação em Tempo Real
              </CardTitle>
              <CardDescription className="text-xs">
                Envie uma pergunta de teste simulando um cliente para avaliar a precisão da resposta, tempo de execução e custo exato
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs font-medium">Pergunta de Teste</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={testPrompt}
                    onChange={(e) => setTestPrompt(e.target.value)}
                    placeholder="Digite uma dúvida financeira ou sobre o app..."
                    onKeyDown={(e) => e.key === 'Enter' && handleRunTest()}
                    className="text-xs"
                    disabled={testing}
                  />
                  <Button onClick={handleRunTest} disabled={testing || !testPrompt.trim()} className="shrink-0">
                    <Play className={`h-3.5 w-3.5 mr-1.5 ${testing ? 'animate-spin' : ''}`} />
                    {testing ? 'Testando...' : 'Executar Teste'}
                  </Button>
                </div>
              </div>

              {testResult && (
                <div className="p-4 rounded-xl border bg-muted/30 space-y-3 animate-in fade-in">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                        Modelo: {testResult.modelUsed}
                      </Badge>
                      <span className="text-muted-foreground">Tempo: {testResult.timeMs}ms</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span>{testResult.tokens.prompt} in + {testResult.tokens.response} out = <strong>{testResult.tokens.total} tokens</strong></span>
                      <Badge variant="secondary" className="font-bold text-emerald-600 dark:text-emerald-400">
                        Custo: R$ {testResult.cost.brl.toFixed(6)} (${testResult.cost.usd.toFixed(6)} USD)
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-medium text-muted-foreground">Resposta Gerada:</Label>
                    <div className="p-3 bg-background rounded-lg border text-xs whitespace-pre-wrap leading-relaxed">
                      {testResult.reply}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
