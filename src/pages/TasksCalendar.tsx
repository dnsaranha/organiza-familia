import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, Clock, CheckCircle, List, Plus, Edit, Trash2, Undo2, CalendarPlus, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScheduledTaskForm, ScheduledTask } from "@/components/tasks/ScheduledTaskForm";
import { LimitAlert, useCanAdd } from "@/components/LimitAlert";

// Adicione a propriedade opcional ao tipo aqui para ter um IntelliSense melhor
interface ScheduledTaskWithGoogle extends ScheduledTask {
  google_calendar_event_id?: string | null;
}

const TasksCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [tasks, setTasks] = useState<ScheduledTaskWithGoogle[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ScheduledTaskWithGoogle | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { canAdd: canAddTask } = useCanAdd('maxTasks', tasks.length);

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user?.id]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .select('*') // O '*' vai buscar a nova coluna `google_calendar_event_id`
        .order('schedule_date', { ascending: true });

      if (error) throw error;
      setTasks((data || []) as ScheduledTaskWithGoogle[]);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as tarefas agendadas.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (task: ScheduledTaskWithGoogle) => {
    setSelectedTask(task);
    setIsFormOpen(true);
  };

  const markAsCompleted = async (taskId: string) => {
    // ... (código existente sem modificação)
  };

  const undoCompletion = async (taskId: string) => {
    // ... (código existente sem modificação)
  };

  const deleteTask = async (taskId: string) => {
    // ... (código existente sem modificação)
  };

  // NOVA FUNÇÃO PARA INTEGRAR COM O GOOGLE CALENDAR
  const handleAddToGoogleCalendar = async (task: ScheduledTaskWithGoogle) => {
    toast({ title: "Sincronizando...", description: "Adicionando tarefa ao Google Calendar." });
    try {
      const taskPayload = {
        id: task.id,
        title: task.title,
        description: task.description,
        date: task.schedule_date,
      };

      const { data, error } = await supabase.functions.invoke('google-calendar-integration', {
        body: JSON.stringify(taskPayload),
      });

      if (error) {
        throw error; // Joga para o bloco catch tratar
      }

      toast({
        title: "Sucesso!",
        description: "Tarefa adicionada ao seu Google Calendar.",
      });
      
      loadTasks(); // Recarrega as tarefas para mostrar o novo status (botão "Ver no Google")

    } catch (error: any) {
      // LÓGICA PARA USUÁRIOS ANTIGOS QUE PRECISAM DAR NOVA PERMISSÃO
      if (error.context?.response_status === 403) {
        toast({
          title: "Permissão necessária",
          description: "Vamos te redirecionar para autorizar o acesso ao seu calendário.",
        });

        const { error: signInError } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            scopes: 'https://www.googleapis.com/auth/calendar',
            redirectTo: window.location.href,
            queryParams: {
              prompt: 'consent',
              access_type: 'offline',
            }
          }
        });

        if (signInError) {
          console.error('Erro ao tentar re-autenticar:', signInError);
          toast({
            title: "Erro de Autenticação",
            description: "Ocorreu um erro ao obter a permissão. Tente novamente.",
            variant: "destructive",
          });
        }
      } else {
        console.error('Erro ao adicionar ao Google Calendar:', error);
        toast({
          title: "Erro",
          description: "Falha ao adicionar o evento ao Google Calendar.",
          variant: "destructive",
        });
      }
    }
  };

  const daysWithTasks = useMemo(() => {
    return tasks.map(t => new Date(t.schedule_date));
  }, [tasks]);

  const selectedDateTasks = useMemo(() => {
    if (!date) return [];
    return tasks.filter(task => {
        const taskDate = new Date(task.schedule_date);
        return (
            taskDate.getDate() === date.getDate() &&
            taskDate.getMonth() === date.getMonth() &&
            taskDate.getFullYear() === date.getFullYear()
        );
    });
  }, [tasks, date]);

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
      {/* ... (código JSX existente) ... */}
      
       <div className="flex flex-col md:flex-row gap-8">
          {/* ... (código do calendário à esquerda) ... */}

          <div className="flex-1 space-y-4">
             {/* ... (código do título da lista de tarefas) ... */}

             {selectedDateTasks.length === 0 ? (
                 <div className="text-center py-12 border rounded-lg bg-muted/20">
                     <p className="text-muted-foreground">Nenhuma tarefa agendada para este dia.</p>
                 </div>
             ) : (
                 selectedDateTasks.map(task => (
                    <Card key={task.id} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                {/* ... (código dos detalhes da tarefa) ... */}
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div className="flex items-center gap-2">
                                    {/* ... (botões de Concluir, Editar, Excluir) ... */}

                                    {/* NOVOS BOTÕES DO GOOGLE CALENDAR */}
                                    {task.google_calendar_event_id ? (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.open(`https://calendar.google.com/calendar/r/eventedit/${task.google_calendar_event_id}`, '_blank')}
                                            className="h-8 px-3 text-blue-600 hover:text-blue-700"
                                            title="Ver no Google Calendar"
                                        >
                                            <ExternalLink className="h-3 w-3" />
                                        </Button>
                                    ) : (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleAddToGoogleCalendar(task)}
                                            className="h-8 px-3"
                                            title="Adicionar ao Google Calendar"
                                        >
                                            <CalendarPlus className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>

                                {/* ... (código do Badge de valor) ... */}
                            </div>
                        </CardContent>
                    </Card>
                 ))
             )}
          </div>
       </div>

      {/* ... (código do Dialog/Modal) ... */}
    </div>
  )
}

export default TasksCalendar;
