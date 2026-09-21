REVOKE EXECUTE ON FUNCTION public.insert_ai_support_message(UUID, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.insert_ai_support_message(UUID, TEXT, BOOLEAN) TO authenticated;