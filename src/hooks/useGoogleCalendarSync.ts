import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SyncResult {
  success: boolean;
  action: string;
  created?: number;
  updated?: number;
  deleted?: number;
  failed?: number;
  errors?: string[];
}

export function useGoogleCalendarSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const { toast } = useToast();

  const getProviderToken = useCallback(async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.provider_token || null;
  }, []);

  const requestReauth = useCallback(async () => {
    toast({
      title: 'Permissão necessária',
      description: 'Redirecionando para autorizar acesso ao Google Calendar...',
    });
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: 'https://www.googleapis.com/auth/calendar',
        redirectTo: window.location.href,
        queryParams: { prompt: 'consent', access_type: 'offline' },
      },
    });
  }, [toast]);

  const invokeCalendarFunction = useCallback(async (body: any): Promise<any> => {
    const providerToken = await getProviderToken();
    
    if (!providerToken) {
      await requestReauth();
      return { needsReauth: true };
    }

    const { data, error } = await supabase.functions.invoke('google-calendar-integration', {
      body: { ...body, provider_token: providerToken },
    });

    if (error) throw error;
    
    if (data?.needsReauth) {
      await requestReauth();
      return data;
    }

    return data;
  }, [getProviderToken, requestReauth]);

  // Create event in Google Calendar
  const createEvent = useCallback(async (task: {
    id: string;
    title: string;
    description?: string;
    schedule_date: string;
    end_date?: string;
    category?: string;
    value?: number;
    task_type?: string;
  }) => {
    setIsSyncing(true);
    try {
      const result = await invokeCalendarFunction({
        action: 'create',
        id: task.id,
        title: task.title,
        description: task.description,
        date: task.schedule_date,
        end_date: task.end_date,
        category: task.category,
        value: task.value,
        task_type: task.task_type,
      });

      if (!result.needsReauth) {
        toast({
          title: 'Sincronizado!',
          description: 'Tarefa adicionada ao Google Calendar.',
        });
      }

      return result;
    } catch (error: any) {
      console.error('Create event error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao criar evento no Google Calendar.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [invokeCalendarFunction, toast]);

  // Update event in Google Calendar
  const updateEvent = useCallback(async (task: {
    id: string;
    title: string;
    description?: string;
    schedule_date: string;
    end_date?: string;
    category?: string;
    value?: number;
    task_type?: string;
    google_calendar_event_id: string;
  }) => {
    setIsSyncing(true);
    try {
      const result = await invokeCalendarFunction({
        action: 'update',
        id: task.id,
        title: task.title,
        description: task.description,
        date: task.schedule_date,
        end_date: task.end_date,
        category: task.category,
        value: task.value,
        task_type: task.task_type,
        google_calendar_event_id: task.google_calendar_event_id,
      });

      return result;
    } catch (error: any) {
      console.error('Update event error:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [invokeCalendarFunction]);

  // Delete event from Google Calendar
  const deleteEvent = useCallback(async (taskId: string, googleEventId: string) => {
    setIsSyncing(true);
    try {
      const result = await invokeCalendarFunction({
        action: 'delete',
        id: taskId,
        google_calendar_event_id: googleEventId,
      });

      return result;
    } catch (error: any) {
      console.error('Delete event error:', error);
      // Don't throw, just log - task deletion should succeed even if Google sync fails
    } finally {
      setIsSyncing(false);
    }
  }, [invokeCalendarFunction]);

  // Sync all tasks to Google Calendar
  const syncAllToGoogle = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await invokeCalendarFunction({
        action: 'sync_to_google',
      });

      if (!result.needsReauth) {
        setLastSyncResult(result);
        toast({
          title: 'Sincronização completa!',
          description: `${result.created || 0} tarefas criadas, ${result.failed || 0} falhas.`,
        });
      }

      return result;
    } catch (error: any) {
      console.error('Sync all error:', error);
      toast({
        title: 'Erro na sincronização',
        description: error.message || 'Falha ao sincronizar tarefas.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [invokeCalendarFunction, toast]);

  // Setup webhook for bidirectional sync
  const setupWebhook = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await invokeCalendarFunction({
        action: 'setup_webhook',
      });

      if (!result.needsReauth && result.success) {
        toast({
          title: 'Webhook configurado!',
          description: 'Você receberá atualizações do Google Calendar.',
        });
      }

      return result;
    } catch (error: any) {
      console.error('Setup webhook error:', error);
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao configurar webhook.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [invokeCalendarFunction, toast]);

  // Perform incremental sync from Google
  const incrementalSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const result = await invokeCalendarFunction({
        action: 'incremental_sync',
      });

      if (!result.needsReauth) {
        setLastSyncResult(result);
        if (result.updated > 0 || result.deleted > 0) {
          toast({
            title: 'Sincronizado com Google!',
            description: `${result.updated || 0} atualizadas, ${result.deleted || 0} canceladas.`,
          });
        }
      }

      return result;
    } catch (error: any) {
      console.error('Incremental sync error:', error);
      // Silent fail for incremental sync
    } finally {
      setIsSyncing(false);
    }
  }, [invokeCalendarFunction, toast]);

  return {
    isSyncing,
    lastSyncResult,
    createEvent,
    updateEvent,
    deleteEvent,
    syncAllToGoogle,
    setupWebhook,
    incrementalSync,
    requestReauth,
  };
}
