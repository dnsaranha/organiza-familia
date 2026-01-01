-- Fix missing profiles and ensure permissions
-- This migration ensures that all users have a profile and resets permissions to avoid RLS issues.

-- 1. Backfill profiles for existing users who might have been missed by the trigger
INSERT INTO public.profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Ensure RLS policies for 'transactions' table are correct and permissive for authenticated users
-- Drop existing policies to be safe and recreate them
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.transactions;
CREATE POLICY "Enable insert for authenticated users only"
ON public.transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable read access for own and group transactions" ON public.transactions;
CREATE POLICY "Enable read access for own and group transactions"
ON public.transactions
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = transactions.group_id
    AND group_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.transactions;
CREATE POLICY "Enable update for users based on user_id"
ON public.transactions
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.transactions;
CREATE POLICY "Enable delete for users based on user_id"
ON public.transactions
FOR DELETE
USING (auth.uid() = user_id);


-- 3. Ensure RLS policies for 'investment_transactions' table
-- Drop existing policies and recreate them
DROP POLICY IF EXISTS "Users can view their own or group investment transactions" ON public.investment_transactions;
CREATE POLICY "Users can view their own or group investment transactions"
ON public.investment_transactions
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_members.group_id = investment_transactions.group_id
    AND group_members.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can insert their own investment transactions" ON public.investment_transactions;
CREATE POLICY "Users can insert their own investment transactions"
ON public.investment_transactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

DROP POLICY IF EXISTS "Users can update their own investment transactions" ON public.investment_transactions;
CREATE POLICY "Users can update their own investment transactions"
ON public.investment_transactions
FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own investment transactions" ON public.investment_transactions;
CREATE POLICY "Users can delete their own investment transactions"
ON public.investment_transactions
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Ensure RLS policies for 'stripe_customers' and 'stripe_subscriptions' are correct
-- (Based on 20250824142216_cool_portal.sql but ensuring no "needs to be logged in" loops)

DROP POLICY IF EXISTS "Users can view their own customer data" ON stripe_customers;
CREATE POLICY "Users can view their own customer data"
    ON stripe_customers
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can view their own subscription data" ON stripe_subscriptions;
CREATE POLICY "Users can view their own subscription data"
    ON stripe_subscriptions
    FOR SELECT
    TO authenticated
    USING (
        customer_id IN (
            SELECT customer_id
            FROM stripe_customers
            WHERE user_id = auth.uid()
        )
        AND deleted_at IS NULL
    );

-- 5. Ensure 'profiles' table has correct RLS
DROP POLICY IF EXISTS "Users can select their own profile" ON public.profiles;
CREATE POLICY "Users can select their own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 6. Grant usage on schema public just in case (though usually default)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
