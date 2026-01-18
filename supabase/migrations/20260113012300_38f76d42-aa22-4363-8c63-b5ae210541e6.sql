-- Create user_categories table for custom categories with icons
CREATE TABLE public.user_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  group_id UUID REFERENCES public.family_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT NOT NULL DEFAULT 'circle',
  color TEXT NOT NULL DEFAULT 'hsl(var(--primary))',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name, group_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own categories or group categories"
ON public.user_categories
FOR SELECT
USING (
  (auth.uid() = user_id) OR 
  ((group_id IS NOT NULL) AND is_group_member(group_id, auth.uid()))
);

CREATE POLICY "Users can create their own categories"
ON public.user_categories
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) AND 
  ((group_id IS NULL) OR is_group_member(group_id, auth.uid()))
);

CREATE POLICY "Users can update their own categories"
ON public.user_categories
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
ON public.user_categories
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_categories_updated_at
BEFORE UPDATE ON public.user_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();