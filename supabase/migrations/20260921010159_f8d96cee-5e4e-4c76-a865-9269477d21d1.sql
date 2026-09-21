CREATE OR REPLACE FUNCTION public.insert_ai_support_message(
    p_user_id UUID,
    p_message TEXT,
    p_is_read BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_row public.support_messages%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.is_admin()) THEN
        RAISE EXCEPTION 'Not authorized to insert messages for this user';
    END IF;

    INSERT INTO public.support_messages (
        user_id, message, is_from_admin, is_read, created_at, updated_at
    ) VALUES (
        p_user_id, p_message, true, p_is_read, now(), now()
    )
    RETURNING * INTO new_row;

    RETURN to_jsonb(new_row);
END;
$$;

GRANT EXECUTE ON FUNCTION public.insert_ai_support_message(UUID, TEXT, BOOLEAN) TO authenticated;