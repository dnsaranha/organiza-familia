import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Sparkles, 
  Check, 
  X, 
  Loader2, 
  TrendingUp, 
  Target, 
  CalendarClock, 
  ArrowDownLeft, 
  ArrowUpRight,
  CheckCircle2
} from 'lucide-react';
import { 
  SmartDraft, 
  SmartDraftTransaction, 
  SmartDraftGoal, 
  SmartDraftInvestment, 
  SmartDraftScheduledTask 
} from '@/types/ai';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SmartDraftCardProps {
  draft: SmartDraft;
  onSaved?: (savedData: any) => void;
  onDiscarded?: () => void;
}

const EXPENSE_CATEGORIES = [
  'Alimentação',
  'Supermercado',
  'Moradia',
  'Transporte',
  'Lazer',
  'Saúde',
  'Educação',
  'Contas',
  'Compras',
  'Outros',
];

const INCOME_CATEGORIES = [
  'Salário',
  'Rendimentos',
  'Investimentos',
  'Freelance',
  'Vendas',
  'Outros',
];

const GOAL_CATEGORIES = [
  'Reserva de Emergência',
  'Viagem',
  'Casa Própria',
  'Veículo',
  'Educação',
  'Aposentadoria',
  'Casamento',
  'Outros',
];

export const SmartDraftCard = ({ draft, onSaved, onDiscarded }: SmartDraftCardProps) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<'pending' | 'saving' | 'saved' | 'discarded'>(draft.status || 'pending');

  // Transaction form state
  const [txType, setTxType] = useState<'expense' | 'income'>(draft.transaction?.type || 'expense');
  const [txAmount, setTxAmount] = useState<string>(String(draft.transaction?.amount || ''));
  const [txDescription, setTxDescription] = useState<string>(draft.transaction?.description || '');
  const [txCategory, setTxCategory] = useState<string>(draft.transaction?.category || 'Alimentação');
  const [txDate, setTxDate] = useState<string>(draft.transaction?.date || new Date().toISOString().split('T')[0]);
  const [txPaymentMethod, setTxPaymentMethod] = useState<string>(draft.transaction?.payment_method || 'Débito');

  // Goal form state
  const [goalTitle, setGoalTitle] = useState<string>(draft.goal?.title || '');
  const [goalTarget, setGoalTarget] = useState<string>(String(draft.goal?.target_amount || ''));
  const [goalCurrent, setGoalCurrent] = useState<string>(String(draft.goal?.current_amount || '0'));
  const [goalCategory, setGoalCategory] = useState<string>(draft.goal?.category || 'Reserva de Emergência');
  const [goalDeadline, setGoalDeadline] = useState<string>(draft.goal?.deadline || '');

  // Investment form state
  const [invTicker, setInvTicker] = useState<string>(draft.investment?.ticker || '');
  const [invName, setInvName] = useState<string>(draft.investment?.asset_name || '');
  const [invType, setInvType] = useState<'buy' | 'sell'>(draft.investment?.transaction_type || 'buy');
  const [invQuantity, setInvQuantity] = useState<string>(String(draft.investment?.quantity || '1'));
  const [invPrice, setInvPrice] = useState<string>(String(draft.investment?.price || ''));
  const [invDate, setInvDate] = useState<string>(draft.investment?.transaction_date || new Date().toISOString().split('T')[0]);

  // Scheduled task form state
  const [taskTitle, setTaskTitle] = useState<string>(draft.scheduled_task?.title || '');
  const [taskType, setTaskType] = useState<'expense' | 'income' | 'reminder'>(draft.scheduled_task?.task_type || 'expense');
  const [taskValue, setTaskValue] = useState<string>(String(draft.scheduled_task?.value || '0'));
  const [taskDate, setTaskDate] = useState<string>(draft.scheduled_task?.schedule_date || new Date().toISOString().split('T')[0]);
  const [taskCategory, setTaskCategory] = useState<string>(draft.scheduled_task?.category || 'Contas');

  if (status === 'discarded') {
    return null;
  }

  const handleSaveTransaction = async () => {
    if (!user) {
      toast.error('Você precisa estar autenticado para salvar.');
      return;
    }

    const numericAmount = parseFloat(txAmount.replace(',', '.'));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    setStatus('saving');
    try {
      const fullDescription = txPaymentMethod 
        ? `${txDescription.trim()} (${txPaymentMethod})` 
        : txDescription.trim();

      const payload = {
        user_id: user.id,
        type: txType,
        amount: numericAmount,
        description: fullDescription || (txType === 'expense' ? 'Despesa' : 'Receita'),
        category: txCategory,
        date: txDate,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await (supabase as any)
        .from('transactions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Broadcast event so dashboard & tables reload seamlessly
      window.dispatchEvent(new CustomEvent('transaction-updated'));

      setStatus('saved');
      toast.success('Transação registrada com sucesso!');
      if (onSaved) onSaved(data);
    } catch (err: any) {
      console.error('Erro ao salvar transação pelo rascunho:', err);
      toast.error(`Falha ao salvar: ${err.message || 'Tente novamente'}`);
      setStatus('pending');
    }
  };

  const handleSaveGoal = async () => {
    if (!user) {
      toast.error('Você precisa estar autenticado para salvar.');
      return;
    }

    const targetVal = parseFloat(goalTarget.replace(',', '.'));
    if (isNaN(targetVal) || targetVal <= 0) {
      toast.error('Informe um valor alvo válido.');
      return;
    }

    setStatus('saving');
    try {
      const payload = {
        user_id: user.id,
        title: goalTitle.trim() || 'Nova Meta',
        target_amount: targetVal,
        current_amount: parseFloat(goalCurrent.replace(',', '.')) || 0,
        category: goalCategory,
        deadline: goalDeadline ? goalDeadline : null,
        icon: 'Target',
        color: '#10B981',
      };

      const { data, error } = await (supabase as any)
        .from('savings_goals')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      window.dispatchEvent(new CustomEvent('goals-updated'));

      setStatus('saved');
      toast.success('Meta salva com sucesso!');
      if (onSaved) onSaved(data);
    } catch (err: any) {
      console.error('Erro ao salvar meta pelo rascunho:', err);
      toast.error(`Falha ao salvar meta: ${err.message || 'Tente novamente'}`);
      setStatus('pending');
    }
  };

  const handleSaveInvestment = async () => {
    if (!user) {
      toast.error('Você precisa estar autenticado para salvar.');
      return;
    }

    const qty = parseFloat(invQuantity.replace(',', '.'));
    const unitPrice = parseFloat(invPrice.replace(',', '.'));

    if (isNaN(qty) || qty <= 0 || isNaN(unitPrice) || unitPrice <= 0) {
      toast.error('Informe quantidade e preço unitário válidos.');
      return;
    }

    setStatus('saving');
    try {
      const payload = {
        user_id: user.id,
        ticker: invTicker.trim().toUpperCase() || 'ATIVO',
        asset_name: invName.trim() || invTicker.trim().toUpperCase(),
        transaction_type: invType,
        quantity: qty,
        price: unitPrice,
        transaction_date: invDate,
        fees: 0,
        notes: 'Lançado via Rascunho Inteligente com IA',
      };

      const { data, error } = await (supabase as any)
        .from('investment_transactions')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      window.dispatchEvent(new CustomEvent('investments-updated'));

      setStatus('saved');
      toast.success('Investimento registrado com sucesso!');
      if (onSaved) onSaved(data);
    } catch (err: any) {
      console.error('Erro ao salvar investimento pelo rascunho:', err);
      toast.error(`Falha ao registrar investimento: ${err.message || 'Tente novamente'}`);
      setStatus('pending');
    }
  };

  const handleSaveScheduledTask = async () => {
    if (!user) {
      toast.error('Você precisa estar autenticado para salvar.');
      return;
    }

    const val = parseFloat(taskValue.replace(',', '.')) || 0;

    setStatus('saving');
    try {
      const payload = {
        user_id: user.id,
        title: taskTitle.trim() || 'Lembrete Financeiro',
        task_type: taskType,
        value: val,
        schedule_date: `${taskDate}T09:00:00`,
        category: taskCategory,
        notification_email: false,
        notification_push: false,
        is_completed: false,
        is_recurring: false,
      };

      const { data, error } = await (supabase as any)
        .from('scheduled_tasks')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      window.dispatchEvent(new CustomEvent('tasks-updated'));

      setStatus('saved');
      toast.success('Agendamento salvo com sucesso!');
      if (onSaved) onSaved(data);
    } catch (err: any) {
      console.error('Erro ao salvar agendamento pelo rascunho:', err);
      toast.error(`Falha ao agendar: ${err.message || 'Tente novamente'}`);
      setStatus('pending');
    }
  };

  // If already saved, show pristine confirmation card
  if (status === 'saved') {
    return (
      <div className="mt-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl flex items-center gap-3 text-emerald-900 dark:text-emerald-200 text-xs">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
        <div className="flex-1">
          <p className="font-semibold">Registro confirmado!</p>
          <p className="text-emerald-700 dark:text-emerald-300">
            Salvo com sucesso e já sincronizado no seu painel financeiro.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2.5 p-3.5 bg-card border border-emerald-500/30 rounded-xl shadow-sm text-foreground text-xs space-y-3 transition-all animate-in fade-in duration-200">
      {/* Header with action tag */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <div className="flex items-center gap-1.5 font-medium text-emerald-600 dark:text-emerald-400">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-[13px]">Rascunho Inteligente</span>
          <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0 px-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300">
            {draft.draftType === 'transaction' && (txType === 'expense' ? 'Despesa' : 'Receita')}
            {draft.draftType === 'goal' && 'Meta'}
            {draft.draftType === 'investment' && 'Investimento'}
            {draft.draftType === 'scheduled_task' && 'Agendamento'}
          </Badge>
        </div>

        <button
          onClick={() => {
            setStatus('discarded');
            if (onDiscarded) onDiscarded();
          }}
          className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
          title="Descartar rascunho"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1. TRANSACTION DRAFT FORM */}
      {draft.draftType === 'transaction' && (
        <div className="space-y-2.5">
          {/* Type toggles */}
          <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-muted/60 rounded-lg">
            <button
              type="button"
              onClick={() => setTxType('expense')}
              className={`py-1 rounded text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                txType === 'expense'
                  ? 'bg-rose-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" /> Despesa
            </button>
            <button
              type="button"
              onClick={() => setTxType('income')}
              className={`py-1 rounded text-xs font-medium flex items-center justify-center gap-1 transition-all ${
                txType === 'income'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" /> Receita
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                placeholder="0.00"
                className="h-8 text-xs font-semibold"
              />
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Descrição</Label>
            <Input
              value={txDescription}
              onChange={(e) => setTxDescription(e.target.value)}
              placeholder="Ex: Mercado Pão de Açúcar"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Categoria</Label>
              <Select value={txCategory} onValueChange={setTxCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(txType === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">Método</Label>
              <Select value={txPaymentMethod} onValueChange={setTxPaymentMethod}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Débito">Débito</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Pix">Pix</SelectItem>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-1 flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveTransaction}
              disabled={status === 'saving'}
              className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
            >
              {status === 'saving' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Salvar Transação
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStatus('discarded');
                if (onDiscarded) onDiscarded();
              }}
              className="h-8 text-xs"
            >
              Descartar
            </Button>
          </div>
        </div>
      )}

      {/* 2. GOAL DRAFT FORM */}
      {draft.draftType === 'goal' && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <Target className="w-3.5 h-3.5" />
            <span>Objetivo / Meta Financeira</span>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Nome da Meta</Label>
            <Input
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="Ex: Reserva de Emergência, Viagem"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Valor Alvo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder="Ex: 5000"
                className="h-8 text-xs font-semibold"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Valor Atual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Categoria</Label>
              <Select value={goalCategory} onValueChange={setGoalCategory}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Prazo Estimado</Label>
              <Input
                type="date"
                value={goalDeadline}
                onChange={(e) => setGoalDeadline(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="pt-1 flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveGoal}
              disabled={status === 'saving'}
              className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
            >
              {status === 'saving' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Salvar Meta
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStatus('discarded');
                if (onDiscarded) onDiscarded();
              }}
              className="h-8 text-xs"
            >
              Descartar
            </Button>
          </div>
        </div>
      )}

      {/* 3. INVESTMENT DRAFT FORM */}
      {draft.draftType === 'investment' && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Operação de Investimento</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-muted/60 rounded-lg">
            <button
              type="button"
              onClick={() => setInvType('buy')}
              className={`py-1 rounded text-xs font-medium transition-all ${
                invType === 'buy' ? 'bg-emerald-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Compra
            </button>
            <button
              type="button"
              onClick={() => setInvType('sell')}
              className={`py-1 rounded text-xs font-medium transition-all ${
                invType === 'sell' ? 'bg-amber-600 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Venda
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Código / Ticker</Label>
              <Input
                value={invTicker}
                onChange={(e) => setInvTicker(e.target.value.toUpperCase())}
                placeholder="Ex: MXRF11, PETR4"
                className="h-8 text-xs font-mono font-semibold"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Nome do Ativo</Label>
              <Input
                value={invName}
                onChange={(e) => setInvName(e.target.value)}
                placeholder="Ex: Maxi Renda FII"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Qtd</Label>
              <Input
                type="number"
                step="1"
                value={invQuantity}
                onChange={(e) => setInvQuantity(e.target.value)}
                placeholder="1"
                className="h-8 text-xs font-semibold"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Preço (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={invPrice}
                onChange={(e) => setInvPrice(e.target.value)}
                placeholder="0.00"
                className="h-8 text-xs font-semibold"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Data</Label>
              <Input
                type="date"
                value={invDate}
                onChange={(e) => setInvDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="pt-1 flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveInvestment}
              disabled={status === 'saving'}
              className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
            >
              {status === 'saving' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Salvar Investimento
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStatus('discarded');
                if (onDiscarded) onDiscarded();
              }}
              className="h-8 text-xs"
            >
              Descartar
            </Button>
          </div>
        </div>
      )}

      {/* 4. SCHEDULED TASK DRAFT FORM */}
      {draft.draftType === 'scheduled_task' && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
            <CalendarClock className="w-3.5 h-3.5" />
            <span>Agendamento / Lembrete de Conta</span>
          </div>

          <div>
            <Label className="text-[11px] text-muted-foreground">Título</Label>
            <Input
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="Ex: Conta de Luz, Aluguel"
              className="h-8 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Valor Previsto (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={taskValue}
                onChange={(e) => setTaskValue(e.target.value)}
                placeholder="0.00"
                className="h-8 text-xs font-semibold"
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Data de Vencimento</Label>
              <Input
                type="date"
                value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Tipo</Label>
              <Select value={taskType} onValueChange={(v: any) => setTaskType(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">Conta a Pagar (Despesa)</SelectItem>
                  <SelectItem value="income">Recebimento (Receita)</SelectItem>
                  <SelectItem value="reminder">Lembrete Neutro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Categoria</Label>
              <Input
                value={taskCategory}
                onChange={(e) => setTaskCategory(e.target.value)}
                placeholder="Ex: Moradia, Contas"
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="pt-1 flex gap-2">
            <Button
              size="sm"
              onClick={handleSaveScheduledTask}
              disabled={status === 'saving'}
              className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium gap-1.5"
            >
              {status === 'saving' ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              Agendar Conta
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setStatus('discarded');
                if (onDiscarded) onDiscarded();
              }}
              className="h-8 text-xs"
            >
              Descartar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
