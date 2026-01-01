import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bell, Mail, Plus, Clock, CheckCircle, Trash2, Edit, Undo2, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useNavigate } from "react-router-dom";
import { ScheduledTaskForm, ScheduledTask } from "@/components/tasks/ScheduledTaskForm";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";

const taskTypes = [
  { value: 'payment_reminder', label: 'Lembrete de Pagamento' },
  { value: 'budget_alert', label: 'Alerta de Orçamento' },
  { value: 'income_reminder', label: 'Lembrete de Receita' },
  { value: 'custom', label: 'Personalizado' },
];

const TasksPage = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledTask | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [periodFilter, setPeriodFilter] = useState<'all' | 'current_month' | 'next_month' | 'custom'>('all');

  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

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
      
      return () => {
        abortController.abort();
      };
    }
  }, [user?.id]);

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
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Tarefas Agendadas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Gerencie e acompanhe suas tarefas futuras
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => navigate('/tasks/calendar')}
            >
                <CalendarIcon className="h-4 w-4 sm:mr-2" />
                <span className="sm:inline">Ver Calendário</span>
            </Button>
            <Button
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => {
                    setSelectedTask(null);
                    setIsFormOpen(true);
                }}
            >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="sm:inline">Nova Tarefa</span>
            </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4 sm:mb-6">
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

      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa agendada ainda.</p>
            <p className="text-sm">Clique em "Nova Tarefa" para começar!</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <Card key={task.id} className={`border ${task.is_completed ? 'bg-muted/50 opacity-75' : 'bg-background'}`}>
              <CardContent className="p-3 sm:p-4">
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
            <ScheduledTaskForm
              initialData={selectedTask}
              onSuccess={() => {
                setIsFormOpen(false);
                setSelectedTask(null);
                loadTasks();
              }}
              onCancel={() => {
                setIsFormOpen(false);
                setSelectedTask(null);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TasksPage;