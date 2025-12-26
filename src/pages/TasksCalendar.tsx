import { useState, useEffect, useMemo } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Calendar as CalendarIcon, Clock, CheckCircle, List, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScheduledTaskForm, ScheduledTask } from "@/components/tasks/ScheduledTaskForm";

const TasksCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      const { data, error } = await supabase
        .from('scheduled_tasks')
        .select('*')
        .order('schedule_date', { ascending: true });

      if (error) throw error;
      setTasks((data || []) as ScheduledTask[]);
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as tarefas agendadas.",
        variant: "destructive",
      });
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-8 gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Calendário de Tarefas</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Visualize suas tarefas no calendário
          </p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => navigate('/tasks')}
            >
                <List className="h-4 w-4 sm:mr-2" />
                <span className="sm:inline">Ver Lista</span>
            </Button>
            <Button
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => setIsFormOpen(true)}
            >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="sm:inline">Nova Tarefa</span>
            </Button>
        </div>
      </div>

       <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-auto flex justify-center md:block">
             <div className="border rounded-md p-4 bg-background shadow-sm">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="p-0"
                    locale={ptBR}
                    modifiers={{
                        hasTask: daysWithTasks
                    }}
                    modifiersClassNames={{
                        hasTask: "relative after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1 after:h-1 after:bg-primary after:rounded-full"
                    }}
                />
             </div>
          </div>

          <div className="flex-1 space-y-4">
             <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Tarefas de {date ? date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) : '...'}
             </h2>

             {selectedDateTasks.length === 0 ? (
                 <div className="text-center py-12 border rounded-lg bg-muted/20">
                     <p className="text-muted-foreground">Nenhuma tarefa agendada para este dia.</p>
                 </div>
             ) : (
                 selectedDateTasks.map(task => (
                    <Card key={task.id} className="overflow-hidden border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <h3 className={`font-medium ${task.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                        {task.title}
                                    </h3>
                                    {task.is_completed && <CheckCircle className="h-3 w-3 text-green-500" />}
                                </div>
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {new Date(task.schedule_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {task.category && (
                                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
                                            {task.category}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {task.value !== undefined && task.value !== 0 && (
                                <Badge
                                    className="text-base px-3 py-1 bg-primary hover:bg-primary/90 text-primary-foreground font-medium whitespace-nowrap"
                                >
                                    R$ {Math.abs(task.value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                 ))
             )}
          </div>
       </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <ScheduledTaskForm
            onSuccess={() => {
              setIsFormOpen(false);
              loadTasks();
            }}
            onCancel={() => setIsFormOpen(false)}
            initialData={date ? { schedule_date: date.toISOString() } as unknown as ScheduledTask : null}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TasksCalendar;
