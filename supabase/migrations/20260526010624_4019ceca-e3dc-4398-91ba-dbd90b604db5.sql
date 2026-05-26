
-- 1) Remove duplicate over-permissive policies on scheduled_tasks
DROP POLICY IF EXISTS "Allow users to access their own and group tasks" ON public.scheduled_tasks;
DROP POLICY IF EXISTS "Allow users to insert their own and group tasks" ON public.scheduled_tasks;
DROP POLICY IF EXISTS "Allow users to update their own and group tasks" ON public.scheduled_tasks;
DROP POLICY IF EXISTS "Allow users to delete their own and group tasks" ON public.scheduled_tasks;

-- 2) Allow users to delete their own avatar files
DROP POLICY IF EXISTS "Users can delete their own avatars" ON storage.objects;
CREATE POLICY "Users can delete their own avatars"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars' AND owner = auth.uid());

-- 3) Remove manual_investments from realtime publication (no client subscribes to it)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'manual_investments'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.manual_investments';
  END IF;
END $$;
