-- Migration: Fix AI Support Messages RLS and provide secure insertion RPC
-- Allows authenticated users to save messages in their own support thread (including AI responses)

-- 1. Ensure users can insert messages into support_messages where user_id = auth.uid()
-- regardless of whether is_from_admin is true (for AI assistant responses) or false (for user queries)
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.support_messages;
CREATE POLICY "Users can insert their own messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Provide a dedicated SECURITY DEFINER RPC to safely store AI responses in support_messages
-- This allows any authenticated user to persist the AI Assistant response to their thread
-- without hitting any RLS check failure on the client side.
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
    -- Verify caller owns the thread or is an administrator
    IF auth.uid() IS NULL OR (auth.uid() != p_user_id AND NOT public.is_admin()) THEN
        RAISE EXCEPTION 'Not authorized to insert messages for this user';
    END IF;

    INSERT INTO public.support_messages (
        user_id,
        message,
        is_from_admin,
        is_read,
        created_at,
        updated_at
    )
    VALUES (
        p_user_id,
        p_message,
        true,
        p_is_read,
        now(),
        now()
    )
    RETURNING * INTO new_row;

    RETURN to_jsonb(new_row);
END;
$$;
