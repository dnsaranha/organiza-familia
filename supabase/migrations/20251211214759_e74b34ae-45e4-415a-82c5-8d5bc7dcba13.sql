-- Enable RLS on manual_investments table
ALTER TABLE public.manual_investments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for manual_investments
CREATE POLICY "Users can view their own manual investments" 
ON public.manual_investments 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR (group_id IS NOT NULL AND is_group_member(group_id, auth.uid()))
);

CREATE POLICY "Users can insert their own manual investments" 
ON public.manual_investments 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (group_id IS NULL OR is_group_member(group_id, auth.uid()))
);

CREATE POLICY "Users can update their own manual investments" 
ON public.manual_investments 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manual investments" 
ON public.manual_investments 
FOR DELETE 
USING (auth.uid() = user_id);