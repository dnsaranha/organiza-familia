import { useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScheduledTask } from "@/components/tasks/ScheduledTaskForm";

export const useTaskActions = (onTaskUpdated: () => void) => {
  const { toast } = useToast();

  const markAsCompleted = async (task: ScheduledTask) => {
    try {
      // Mark current task as completed
      const { error: updateError } = await supabase
        .from('scheduled_tasks')
        .update({ is_completed: true })
        .eq('id', task.id);

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
              user_id: task.user_id as string, // Ensure user_id is handled if available, types might need refinement
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

      onTaskUpdated();
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

      onTaskUpdated();
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

      onTaskUpdated();
    } catch (error) {
      console.error('Erro ao remover tarefa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a tarefa.",
        variant: "destructive",
      });
    }
  };

  return { markAsCompleted, undoCompletion, deleteTask };
};
