-- Migration: Create AI Assistant calibration and usage logs tables
-- Security: Strict Row Level Security (RLS) policies enforcing that only admins can modify calibration or view consolidated costs

-- 1. Table for AI Assistant calibration settings
CREATE TABLE IF NOT EXISTS public.ai_assistant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    model_name TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
    system_prompt TEXT NOT NULL,
    tone TEXT NOT NULL DEFAULT 'didático, acolhedor e focado em finanças familiares',
    max_output_tokens INTEGER NOT NULL DEFAULT 800,
    free_plan_monthly_limit INTEGER NOT NULL DEFAULT 20,
    knowledge_base TEXT NOT NULL DEFAULT '',
    disclaimer TEXT NOT NULL DEFAULT 'Este assistente tem caráter estritamente educativo e não constitui recomendação de compra/venda de ativos.',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_by TEXT
);

-- 2. Table for tracking AI token consumption and financial costs
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_email TEXT,
    user_plan TEXT DEFAULT 'Gratuito',
    message_excerpt TEXT,
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    response_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
    cost_brl NUMERIC(12, 6) NOT NULL DEFAULT 0,
    model_used TEXT NOT NULL DEFAULT 'gemini-3.8-flash',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for lightning-fast aggregation and filtering in Admin panel
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at);

-- Enable RLS
ALTER TABLE public.ai_assistant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS for ai_assistant_settings:
-- Anyone authenticated can read active settings to run the chat, but ONLY admins can insert or update!
CREATE POLICY "Authenticated users can read ai settings"
ON public.ai_assistant_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only admins can insert or update ai settings"
ON public.ai_assistant_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- RLS for ai_usage_logs:
-- Users can only see their own usage count
CREATE POLICY "Users can view their own ai usage logs"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view ALL usage logs for consolidated financial metrics
CREATE POLICY "Admins can view all ai usage logs"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Server/users can insert their own usage log
CREATE POLICY "Authenticated users can insert ai usage logs"
ON public.ai_usage_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_admin());
