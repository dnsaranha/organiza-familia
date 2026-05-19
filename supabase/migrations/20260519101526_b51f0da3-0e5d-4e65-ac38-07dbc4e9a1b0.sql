
CREATE OR REPLACE FUNCTION public.get_users_last_activity(_user_ids uuid[])
RETURNS TABLE(user_id uuid, last_activity_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.id AS user_id,
    GREATEST(
      COALESCE((SELECT MAX(created_at) FROM public.transactions t WHERE t.user_id = u.id), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(updated_at) FROM public.scheduled_tasks st WHERE st.user_id = u.id), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(created_at) FROM public.investment_transactions it WHERE it.user_id = u.id), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(created_at) FROM public.support_messages sm WHERE sm.user_id = u.id), 'epoch'::timestamptz),
      COALESCE((SELECT MAX(updated_at) FROM public.savings_goals sg WHERE sg.user_id = u.id), 'epoch'::timestamptz)
    ) AS last_activity_at
  FROM unnest(_user_ids) AS u(id);
$$;

REVOKE ALL ON FUNCTION public.get_users_last_activity(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.get_users_last_activity(uuid[]) TO authenticated, service_role;
