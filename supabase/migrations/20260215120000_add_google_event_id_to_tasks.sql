-- Adiciona a coluna para armazenar o ID do evento do Google Calendar
ALTER TABLE public.scheduled_tasks
ADD COLUMN google_calendar_event_id TEXT NULL;

-- Opcional: Adiciona um índice para consultas mais rápidas
CREATE INDEX IF NOT EXISTS idx_google_calendar_event_id ON public.scheduled_tasks(google_calendar_event_id);
