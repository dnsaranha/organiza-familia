
-- Set immutable search_path on functions missing it for security
ALTER FUNCTION public.update_subscription_permissions_updated_at() SET search_path = public;
ALTER FUNCTION public.get_group_members(uuid) SET search_path = public;
ALTER FUNCTION public.set_updated_at() SET search_path = public;
ALTER FUNCTION public.set_updated_at_metadata() SET search_path = public;
ALTER FUNCTION public.delete_user_data(uuid) SET search_path = public;
