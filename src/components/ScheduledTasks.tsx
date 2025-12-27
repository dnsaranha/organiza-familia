import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight, CheckCircle2, Eye, Undo2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ScheduledTask {
  id: string;
  title: string;
  description?: string;
  schedule_date: string;
  is_completed: boolean;
  task_type: string;
  notification_email: boolean;
  notification_push: boolean;
  group_id?: string;
  value?: number;
  category?: string;
  is_recurring?: boolean;
  recurrence_pattern?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrence_interval?: number;
  recurrence_end_date?: string;
  parent_task_id?: string;
  user_id?: string;
}

export const ScheduledTasks = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user?.id]);

  const loadTasks = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .eq('is_completed', false)
        .order('schedule_date', { ascending: true })
        .limit(5);

      if (error) throw error;
      setTasks((data || []) as ScheduledTask[]);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
    }
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

  return (
    <Card className="bg-gradient-card shadow-card border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Próximas Tarefas
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link to="/tasks">
              Ver todas
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma tarefa futura.</p>
          </div>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-2 p-3 rounded-md hover:bg-muted/50 transition-colors">
                <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                        {new Date(task.schedule_date).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                        })}
                    </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate('/tasks')}
                      className="h-7 w-7 p-0"
                      title="Visualizar tarefa"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    {!task.is_completed ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => markAsCompleted(task.id)}
                        className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                        title="Marcar como concluída"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => undoCompletion(task.id)}
                        className="h-7 w-7 p-0 text-orange-600 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-950"
                        title="Desfazer conclusão"
                      >
                        <Undo2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
