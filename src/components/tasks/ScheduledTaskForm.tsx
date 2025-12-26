import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Mail, Smartphone, PlusIcon, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Combobox } from "@/components/ui/combobox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface ScheduledTask {
  id: string;
  title: string;
  description?: string;
  task_type: 'payment_reminder' | 'budget_alert' | 'income_reminder' | 'custom';
  schedule_date: string;
  notification_email: boolean;
  notification_push: boolean;
  is_completed: boolean;
  created_at: string;
  group_id?: string;
  value?: number;
  category?: string;
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_interval?: number;
  recurrence_end_date?: string;
  parent_task_id?: string;
}

interface FamilyGroup {
  id: string;
  name: string;
}

const taskTypes = [
  { value: 'payment_reminder', label: 'Lembrete de Pagamento' },
  { value: 'budget_alert', label: 'Alerta de Orçamento' },
  { value: 'income_reminder', label: 'Lembrete de Receita' },
  { value: 'custom', label: 'Personalizado' },
];

interface ScheduledTaskFormProps {
  initialData?: ScheduledTask | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ScheduledTaskForm({ initialData, onSuccess, onCancel }: ScheduledTaskFormProps) {
  const { toast } = useToast();
  const { permission, requestPermission, scheduleNotification } = useNotifications();
  const { user } = useAuth();

  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'custom' as 'payment_reminder' | 'budget_alert' | 'income_reminder' | 'custom',
    schedule_date: '',
    schedule_time: '',
    notification_email: true,
    notification_push: true,
    group_id: 'personal',
    value: 0,
    category: '',
    is_recurring: false,
    recurrence_pattern: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    recurrence_interval: 1,
    recurrence_end_date: '',
  });

  useEffect(() => {
    if (user) {
      loadGroups();
      loadCategories();
    }
  }, [user]);

  useEffect(() => {
    if (initialData) {
      setTransactionType(initialData.value && initialData.value > 0 ? 'income' : 'expense');
      setFormData({
        title: initialData.title || '',
        description: initialData.description || '',
        task_type: initialData.task_type || 'custom',
        schedule_date: initialData.schedule_date ? new Date(initialData.schedule_date).toISOString().split('T')[0] : '',
        schedule_time: initialData.schedule_date ? new Date(initialData.schedule_date).toTimeString().slice(0, 5) : '',
        notification_email: initialData.notification_email ?? true,
        notification_push: initialData.notification_push ?? true,
        group_id: initialData.group_id || 'personal',
        value: initialData.value ? Math.abs(initialData.value) : 0,
        category: initialData.category || '',
        is_recurring: initialData.is_recurring || false,
        recurrence_pattern: initialData.recurrence_pattern || 'monthly',
        recurrence_interval: initialData.recurrence_interval || 1,
        recurrence_end_date: initialData.recurrence_end_date ? new Date(initialData.recurrence_end_date).toISOString().split('T')[0] : '',
      });
    } else {
      setFormData({
        title: '',
        description: '',
        task_type: 'custom' as 'payment_reminder' | 'budget_alert' | 'income_reminder' | 'custom',
        schedule_date: '',
        schedule_time: '',
        notification_email: true,
        notification_push: true,
        group_id: 'personal',
        value: 0,
        category: '',
        is_recurring: false,
        recurrence_pattern: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
        recurrence_interval: 1,
        recurrence_end_date: '',
      });
      setTransactionType('expense');
    }
  }, [initialData]);

  const loadGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any).rpc('get_user_groups');

      if (error) throw error;
      setGroups((data || []) as FamilyGroup[]);
    } catch (error) {
       // Silent fail or console error as per original code
       if (error instanceof Error && !error.message.includes("Failed to fetch") && !error.message.includes("aborted")) {
        console.error('Erro ao carregar grupos:', error);
      }
    }
  };

  const loadCategories = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('category')
        .not('category', 'is', null)
        .order('category', { ascending: true });

      if (error) throw error;

      const transactionCategories = [...new Set(data.map(item => item.category))];

      // Import all categories from budget-categories
      const { incomeCategories, expenseCategories } = await import('@/lib/budget-categories');
      const allCategories = [...new Set([...incomeCategories, ...expenseCategories, ...transactionCategories])];

      setCategories(allCategories.sort().map(c => ({ label: c, value: c })));

    } catch (error) {
      if (error instanceof Error && !error.message.includes("Failed to fetch") && !error.message.includes("aborted")) {
        console.error('Erro ao carregar categorias:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.schedule_date || !formData.schedule_time || (formData.value !== 0 && !formData.category)) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o título, data, horário e categoria (se houver valor).",
        variant: "destructive",
      });
      return;
    }

    if (formData.notification_push && permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') {
        toast({
          title: "Permissão negada",
          description: "Para receber notificações push, é necessário permitir as notificações no navegador.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const localDateTimeString = `${formData.schedule_date}T${formData.schedule_time}:00`;
      const localDate = new Date(localDateTimeString);
      const scheduleDateTime = localDate.toISOString();

      const localCreatedAt = new Date().toISOString();

      const valueWithSign = formData.value * (transactionType === 'income' ? 1 : -1);

      const taskData = {
          title: formData.title,
          description: formData.description,
          task_type: formData.task_type,
          schedule_date: scheduleDateTime,
          notification_email: formData.notification_email,
          notification_push: formData.notification_push,
          user_id: user?.id,
          group_id: formData.group_id === 'personal' ? null : formData.group_id,
          value: valueWithSign,
          category: formData.category,
          created_at: initialData?.created_at || localCreatedAt,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
          recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
          recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? new Date(formData.recurrence_end_date).toISOString() : null,
      };

      let error;
      if (initialData?.id) {
          const { error: updateError } = await supabase
              .from('scheduled_tasks')
              .update(taskData)
              .eq('id', initialData.id);
          error = updateError;
      } else {
          const { error: insertError } = await supabase
              .from('scheduled_tasks')
              .insert(taskData)
              .select()
              .single();
          error = insertError;
      }

      if (error) throw error;

      if (formData.notification_push) {
        const scheduleTime = new Date(scheduleDateTime);
        scheduleNotification(formData.title, {
          body: formData.description,
          scheduleTime,
          icon: '/favicon.ico',
        });
      }

      toast({
        title: initialData?.id ? "Tarefa atualizada" : "Tarefa agendada",
        description: `Sua tarefa "${formData.title}" foi salva com sucesso!`,
      });

      onSuccess();
    } catch (error) {
      console.error('Erro ao criar/atualizar tarefa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a tarefa.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="pr-4">
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="Ex: Pagar conta de luz"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task_type">Tipo de Tarefa</Label>
          <Select value={formData.task_type} onValueChange={(value: any) => setFormData({ ...formData, task_type: value })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {taskTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
              <Label htmlFor="value">Valor (R$)</Label>
              <div className="flex items-center gap-2">
                <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                    placeholder="Ex: 150.50"
                />
                {formData.value > 0 && (
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={transactionType}
                        onValueChange={(value: 'income' | 'expense') => {
                            if (value) setTransactionType(value);
                        }}
                    >
                        <ToggleGroupItem value="income" aria-label="Toggle income" className="data-[state=on]:bg-green-500 data-[state=on]:text-white hover:bg-green-100">
                            <PlusIcon className="h-4 w-4" />
                        </ToggleGroupItem>
                        <ToggleGroupItem value="expense" aria-label="Toggle expense" className="data-[state=on]:bg-red-500 data-[state=on]:text-white hover:bg-red-100">
                            <Minus className="h-4 w-4" />
                        </ToggleGroupItem>
                    </ToggleGroup>
                )}
              </div>
          </div>
          <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Combobox
                    options={categories}
                    value={formData.category}
                    onChange={(value) => {
                        const newCategory = !categories.some(c => c.value === value);
                        if (newCategory && value) {
                            setCategories([...categories, { label: value, value }]);
                        }
                        setFormData({ ...formData, category: value })
                    }}
                    placeholder="Selecione ou crie..."
                    searchPlaceholder="Buscar categoria..."
                    noResultsMessage="Nenhuma categoria encontrada."
                />
          </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="group">Compartilhar com Grupo (opcional)</Label>
        <Select value={formData.group_id} onValueChange={(value) => setFormData({ ...formData, group_id: value })}>
          <SelectTrigger><SelectValue placeholder="Selecione um grupo ou deixe pessoal" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="personal">Apenas pessoal</SelectItem>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Adicione detalhes sobre a tarefa..."
          className="resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="schedule_date">Data *</Label>
          <Input
            id="schedule_date"
            type="date"
            value={formData.schedule_date}
            onChange={(e) => setFormData({ ...formData, schedule_date: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="schedule_time">Horário *</Label>
          <Input
            id="schedule_time"
            type="time"
            value={formData.schedule_time}
            onChange={(e) => setFormData({ ...formData, schedule_time: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-3">
        <Label className="text-sm font-medium">Notificações</Label>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Email</span>
            </div>
            <Switch
              checked={formData.notification_email}
              onCheckedChange={(checked) => setFormData({ ...formData, notification_email: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Notificação Push</span>
            </div>
            <Switch
              checked={formData.notification_push}
              onCheckedChange={(checked) => setFormData({ ...formData, notification_push: checked })}
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-center justify-between">
          <Label htmlFor="is_recurring" className="text-sm font-medium">Tarefa Recorrente</Label>
          <Switch
            id="is_recurring"
            checked={formData.is_recurring}
            onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
          />
        </div>

        {formData.is_recurring && (
          <div className="space-y-3 pl-4 border-l-2 border-primary/20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recurrence_pattern">Repetir a cada</Label>
                <Select
                  value={formData.recurrence_pattern}
                  onValueChange={(value: any) => setFormData({ ...formData, recurrence_pattern: value })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Dia(s)</SelectItem>
                    <SelectItem value="weekly">Semana(s)</SelectItem>
                    <SelectItem value="monthly">Mês(es)</SelectItem>
                    <SelectItem value="yearly">Ano(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="recurrence_interval">Intervalo</Label>
                <Input
                  id="recurrence_interval"
                  type="number"
                  min="1"
                  value={formData.recurrence_interval}
                  onChange={(e) => setFormData({ ...formData, recurrence_interval: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurrence_end_date">Repetir até (opcional)</Label>
              <Input
                id="recurrence_end_date"
                type="date"
                value={formData.recurrence_end_date}
                onChange={(e) => setFormData({ ...formData, recurrence_end_date: e.target.value })}
                min={formData.schedule_date}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para repetir indefinidamente
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit">
          {initialData?.id ? 'Salvar Alterações' : 'Agendar Tarefa'}
        </Button>
      </div>
    </form>
    </div>
  );
}
