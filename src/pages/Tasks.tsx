import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Calendar, Bell, Mail, Smartphone, Plus, Clock, CheckCircle, Trash2, Edit, Minus, PlusIcon, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Combobox } from "@/components/ui/combobox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ScheduledTask {
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

const TasksPage = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [groups, setGroups] = useState<FamilyGroup[]>([]);
  const [categories, setCategories] = useState<{ label: string; value: string }[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [periodFilter, setPeriodFilter] = useState<'all' | 'current_month' | 'next_month' | 'custom'>('all');
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

  const { toast } = useToast();
  const { permission, requestPermission, scheduleNotification } = useNotifications();
  const { user } = useAuth();

  useTaskNotifications();

  // Load saved period filter from localStorage
  useEffect(() => {
    const savedPeriodFilter = localStorage.getItem('tasksPeriodFilter');
    const savedDateRange = localStorage.getItem('tasksDateRange');
    
    if (savedPeriodFilter) {
      setPeriodFilter(savedPeriodFilter as 'all' | 'current_month' | 'next_month' | 'custom');
    }
    
    if (savedDateRange) {
      try {
        const parsed = JSON.parse(savedDateRange);
        if (parsed.from) parsed.from = new Date(parsed.from);
        if (parsed.to) parsed.to = new Date(parsed.to);
        setDateRange(parsed);
      } catch (e) {
        console.error('Error parsing saved date range:', e);
      }
    }
  }, []);

  // Save period filter to localStorage
  useEffect(() => {
    localStorage.setItem('tasksPeriodFilter', periodFilter);
  }, [periodFilter]);

  // Save date range to localStorage
  useEffect(() => {
    if (periodFilter === 'custom') {
      localStorage.setItem('tasksDateRange', JSON.stringify(dateRange));
    }
  }, [dateRange, periodFilter]);

  useEffect(() => {
    if (user) {
      const abortController = new AbortController();
      
      loadTasks();
      loadGroups();
      loadCategories();
      
      return () => {
        abortController.abort();
      };
    }
  }, [user]);

  useEffect(() => {
    if (selectedTask) {
      setTransactionType(selectedTask.value && selectedTask.value > 0 ? 'income' : 'expense');
      setFormData({
        title: selectedTask.title,
        description: selectedTask.description || '',
        task_type: selectedTask.task_type,
        schedule_date: new Date(selectedTask.schedule_date).toISOString().split('T')[0],
        schedule_time: new Date(selectedTask.schedule_date).toTimeString().slice(0, 5),
        notification_email: selectedTask.notification_email,
        notification_push: selectedTask.notification_push,
        group_id: selectedTask.group_id || 'personal',
        value: selectedTask.value ? Math.abs(selectedTask.value) : 0,
        category: selectedTask.category || '',
        is_recurring: selectedTask.is_recurring || false,
        recurrence_pattern: selectedTask.recurrence_pattern || 'monthly',
        recurrence_interval: selectedTask.recurrence_interval || 1,
        recurrence_end_date: selectedTask.recurrence_end_date ? new Date(selectedTask.recurrence_end_date).toISOString().split('T')[0] : '',
      });
    } else {
      resetForm();
    }
  }, [selectedTask]);

  const resetForm = () => {
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

  const loadTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .order('schedule_date', { ascending: true });

      if (error) throw error;
      setTasks((data || []) as ScheduledTask[]);
    } catch (error) {
      // Only log non-network errors
      if (error instanceof Error && !error.message.includes("Failed to fetch") && !error.message.includes("aborted")) {
        console.error('Erro ao carregar tarefas:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as tarefas agendadas.",
          variant: "destructive",
        });
      }
    }
  };

  const loadGroups = async () => {
    if (!user) return;

    try {
      const { data, error } = await (supabase as any).rpc('get_user_groups');

      if (error) throw error;
      setGroups((data || []) as FamilyGroup[]);
    } catch (error) {
      // Only log non-network errors
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
      // Only log non-network errors
      if (error instanceof Error && !error.message.includes("Failed to fetch") && !error.message.includes("aborted")) {
        console.error('Erro ao carregar categorias:', error);
      }
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const searchLower = searchTerm.toLowerCase().split(' ');
      const matchesSearch = searchLower.every(word =>
        task.title.toLowerCase().includes(word) ||
        (task.description && task.description.toLowerCase().includes(word)) ||
        (task.category && task.category.toLowerCase().includes(word)) ||
        (task.value && task.value.toString().toLowerCase().includes(word))
      );

      const taskDate = new Date(task.schedule_date);
      const now = new Date();
      
      let matchesDate = true;

      // Apply period filter
      if (periodFilter === 'current_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        matchesDate = taskDate >= startOfMonth && taskDate <= endOfMonth;
      } else if (periodFilter === 'next_month') {
        const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const endOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59);
        matchesDate = taskDate >= startOfNextMonth && taskDate <= endOfNextMonth;
      } else if (periodFilter === 'custom') {
        matchesDate =
          (!dateRange.from || taskDate >= dateRange.from) &&
          (!dateRange.to || taskDate <= dateRange.to);
      }
      // 'all' filter doesn't restrict by date

      return matchesSearch && matchesDate;
    });
  }, [tasks, searchTerm, dateRange, periodFilter]);

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
          created_at: selectedTask ? selectedTask.created_at : localCreatedAt,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
          recurrence_interval: formData.is_recurring ? formData.recurrence_interval : null,
          recurrence_end_date: formData.is_recurring && formData.recurrence_end_date ? new Date(formData.recurrence_end_date).toISOString() : null,
      };

      let error;
      if (selectedTask) {
          const { error: updateError } = await supabase
              .from('scheduled_tasks')
              .update(taskData)
              .eq('id', selectedTask.id);
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
        title: selectedTask ? "Tarefa atualizada" : "Tarefa agendada",
        description: `Sua tarefa "${formData.title}" foi salva com sucesso!`,
      });

      resetForm();
      setIsFormOpen(false);
      setSelectedTask(null);
      loadTasks();
    } catch (error) {
      console.error('Erro ao criar/atualizar tarefa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a tarefa.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (task: ScheduledTask) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const markAsCompleted = async (taskId: string) => {
    try {
      // Get the task details first
      const { data: task, error: fetchError } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (fetchError) throw fetchError;

      // Mark current task as completed
      const { error: updateError } = await supabase
        .from('scheduled_tasks')
        .update({ is_completed: true })
        .eq('id', taskId);

      if (updateError) throw updateError;

      // If it's a recurring task, create the next occurrence
      if (task.is_recurring && task.recurrence_pattern) {
        const currentDate = new Date(task.schedule_date);
        let nextDate = new Date(currentDate);

        // Calculate next occurrence based on pattern
        switch (task.recurrence_pattern) {
          case 'daily':
            nextDate.setDate(nextDate.getDate() + (task.recurrence_interval || 1));
            break;
          case 'weekly':
            nextDate.setDate(nextDate.getDate() + (7 * (task.recurrence_interval || 1)));
            break;
          case 'monthly':
            nextDate.setMonth(nextDate.getMonth() + (task.recurrence_interval || 1));
            break;
          case 'yearly':
            nextDate.setFullYear(nextDate.getFullYear() + (task.recurrence_interval || 1));
            break;
        }

        // Check if we should create the next occurrence (not past end date)
        const shouldCreateNext = !task.recurrence_end_date || 
          nextDate <= new Date(task.recurrence_end_date);

        if (shouldCreateNext) {
          // Create new task for next occurrence
          const { error: insertError } = await supabase
            .from('scheduled_tasks')
            .insert({
              title: task.title,
              description: task.description,
              task_type: task.task_type,
              schedule_date: nextDate.toISOString(),
              notification_email: task.notification_email,
              notification_push: task.notification_push,
              user_id: task.user_id,
              group_id: task.group_id,
              value: task.value,
              category: task.category,
              is_recurring: true,
              recurrence_pattern: task.recurrence_pattern,
              recurrence_interval: task.recurrence_interval,
              recurrence_end_date: task.recurrence_end_date,
              parent_task_id: task.parent_task_id || task.id,
            });

          if (insertError) throw insertError;
        }
      }

      toast({
        title: "Tarefa concluída",
        description: task.is_recurring 
          ? "Tarefa concluída e próxima ocorrência criada."
          : "A tarefa foi marcada como concluída.",
      });

      loadTasks();
    } catch (error) {
      console.error('Erro ao concluir tarefa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a tarefa como concluída.",
        variant: "destructive",
      });
    }
  };

  const undoCompletion = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_tasks')
        .update({ is_completed: false })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Conclusão desfeita",
        description: "A tarefa foi marcada como pendente novamente.",
      });

      loadTasks();
    } catch (error) {
      console.error('Erro ao desfazer conclusão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível desfazer a conclusão da tarefa.",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_tasks')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: "Tarefa removida",
        description: "A tarefa foi removida com sucesso.",
      });

      loadTasks();
    } catch (error) {
      console.error('Erro ao remover tarefa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a tarefa.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tarefas Agendadas</h1>
        <Button
            onClick={() => {
                setSelectedTask(null);
                setIsFormOpen(true);
            }}
        >
            <Plus className="h-4 w-4 mr-2" />
            Nova Tarefa
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <Input
          placeholder="Buscar tarefas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select 
          value={periodFilter} 
          onValueChange={(value: 'all' | 'current_month' | 'next_month' | 'custom') => {
            setPeriodFilter(value);
            if (value !== 'custom') {
              setDateRange({});
            }
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="current_month">Mês Atual</SelectItem>
            <SelectItem value="next_month">Próximo Mês</SelectItem>
            <SelectItem value="custom">Período Personalizado</SelectItem>
          </SelectContent>
        </Select>
        {periodFilter === 'custom' && (
          <DateRangePicker
            date={{ from: dateRange.from, to: dateRange.to }}
            onDateChange={(range) => setDateRange({ from: range?.from, to: range?.to })}
          />
        )}
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa agendada ainda.</p>
            <p className="text-sm">Clique em "Nova Tarefa" para começar!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className={`border ${task.is_completed ? 'bg-muted/50 opacity-75' : 'bg-background'}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </h4>
                      <Badge variant={task.is_completed ? 'secondary' : 'default'}>
                        {taskTypes.find(t => t.value === task.task_type)?.label}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(task.schedule_date).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        {task.notification_email && <Mail className="h-3 w-3" />}
                        {task.notification_push && <Bell className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!task.is_completed ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markAsCompleted(task.id)}
                        className="h-8 px-3"
                        title="Marcar como concluída"
                      >
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => undoCompletion(task.id)}
                        className="h-8 px-3 text-orange-600 hover:text-orange-700"
                        title="Desfazer conclusão"
                      >
                        <Undo2 className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(task)}
                      className="h-8 px-3"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTask(task.id)}
                      className="h-8 px-3 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTask ? 'Editar Tarefa' : 'Nova Tarefa'}</DialogTitle>
          </DialogHeader>
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
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {selectedTask ? 'Salvar Alterações' : 'Agendar Tarefa'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;