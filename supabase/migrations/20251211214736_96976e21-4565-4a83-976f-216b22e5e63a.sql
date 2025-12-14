-- Create savings_goals table
CREATE TABLE public.savings_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  target_amount NUMERIC NOT NULL DEFAULT 0,
  current_amount NUMERIC NOT NULL DEFAULT 0,
  deadline DATE,
  category TEXT NOT NULL DEFAULT 'Outro',
  icon TEXT NOT NULL DEFAULT 'target',
  color TEXT NOT NULL DEFAULT 'hsl(var(--primary))',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.savings_goals ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own goals" 
ON public.savings_goals 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (group_id IS NOT NULL AND is_group_member(group_id, auth.uid()))
);

CREATE POLICY "Users can insert their own goals" 
ON public.savings_goals 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (group_id IS NULL OR is_group_member(group_id, auth.uid()))
);

CREATE POLICY "Users can update their own goals" 
ON public.savings_goals 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" 
ON public.savings_goals 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_savings_goals_updated_at
BEFORE UPDATE ON public.savings_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();