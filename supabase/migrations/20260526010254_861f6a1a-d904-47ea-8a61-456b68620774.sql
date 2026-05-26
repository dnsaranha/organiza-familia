
CREATE TABLE public.budget_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID,
  monthly_income NUMERIC NOT NULL DEFAULT 0,
  categories JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX budget_settings_user_personal_idx
  ON public.budget_settings (user_id)
  WHERE group_id IS NULL;

CREATE UNIQUE INDEX budget_settings_group_idx
  ON public.budget_settings (group_id)
  WHERE group_id IS NOT NULL;

ALTER TABLE public.budget_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or group budget settings"
  ON public.budget_settings FOR SELECT
  USING (
    (auth.uid() = user_id)
    OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  );

CREATE POLICY "Users can insert own or group budget settings"
  ON public.budget_settings FOR INSERT
  WITH CHECK (
    (auth.uid() = user_id)
    AND (group_id IS NULL OR public.is_group_member(group_id, auth.uid()))
  );

CREATE POLICY "Users can update own budget settings"
  ON public.budget_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own budget settings"
  ON public.budget_settings FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_budget_settings_updated_at
  BEFORE UPDATE ON public.budget_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
