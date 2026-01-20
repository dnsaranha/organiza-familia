-- Add fields for bidirectional Google Calendar sync
-- Add calendar_id to store which calendar the event is in
ALTER TABLE public.scheduled_tasks 
ADD COLUMN IF NOT EXISTS calendar_id text;

-- Add last_modified_source to track where the last change came from
ALTER TABLE public.scheduled_tasks 
ADD COLUMN IF NOT EXISTS last_modified_source text DEFAULT 'organiza';

-- Add status field for task lifecycle (ativo, cancelado, concluido)
ALTER TABLE public.scheduled_tasks 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'ativo';

-- Add end_date for event duration (optional, defaults to start + 1 hour)
ALTER TABLE public.scheduled_tasks 
ADD COLUMN IF NOT EXISTS end_date timestamp with time zone;

-- Create table for Google Calendar sync tokens (for incremental sync)
CREATE TABLE IF NOT EXISTS public.google_calendar_sync (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  calendar_id text NOT NULL,
  sync_token text,
  channel_id text,
  channel_expiration timestamp with time zone,
  resource_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, calendar_id)
);

-- Enable RLS on google_calendar_sync
ALTER TABLE public.google_calendar_sync ENABLE ROW LEVEL SECURITY;

-- Users can view their own sync data
CREATE POLICY "Users can view their own sync data"
ON public.google_calendar_sync
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own sync data
CREATE POLICY "Users can insert their own sync data"
ON public.google_calendar_sync
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own sync data
CREATE POLICY "Users can update their own sync data"
ON public.google_calendar_sync
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own sync data
CREATE POLICY "Users can delete their own sync data"
ON public.google_calendar_sync
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_google_event 
ON public.scheduled_tasks(google_calendar_event_id) 
WHERE google_calendar_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_status 
ON public.scheduled_tasks(status);

-- Add comment explaining the fields
COMMENT ON COLUMN public.scheduled_tasks.calendar_id IS 'Google Calendar ID where this task is synced';
COMMENT ON COLUMN public.scheduled_tasks.last_modified_source IS 'Source of last modification: organiza or google';
COMMENT ON COLUMN public.scheduled_tasks.status IS 'Task status: ativo, cancelado, or concluido';
COMMENT ON COLUMN public.scheduled_tasks.end_date IS 'End date/time for the task event';