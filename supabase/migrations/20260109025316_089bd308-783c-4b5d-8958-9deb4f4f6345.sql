-- Fix SECURITY DEFINER functions to include SET search_path = public

-- 1. Fix bulk_upsert_assets
CREATE OR REPLACE FUNCTION public.bulk_upsert_assets(assets_data jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    asset_record jsonb;
BEGIN
    FOR asset_record IN SELECT * FROM jsonb_array_elements(assets_data)
    LOOP
        INSERT INTO public.financial_assets (
            ticker,
            name,
            sector,
            current_price,
            dividends_12m,
            price_history,
            dividend_history
        )
        VALUES (
            asset_record->>'ticker',
            asset_record->>'name',
            asset_record->>'sector',
            (asset_record->>'current_price')::numeric,
            (asset_record->>'dividends_12m')::numeric,
            COALESCE(asset_record->'price_history', '[]'::jsonb),
            COALESCE(asset_record->'dividend_history', '[]'::jsonb)
        )
        ON CONFLICT (ticker) DO UPDATE
        SET
            name = EXCLUDED.name,
            sector = EXCLUDED.sector,
            current_price = EXCLUDED.current_price,
            dividends_12m = EXCLUDED.dividends_12m,
            price_history = EXCLUDED.price_history,
            dividend_history = EXCLUDED.dividend_history,
            updated_at = NOW();
    END LOOP;
END;
$$;

-- 2. Fix get_unique_tickers
CREATE OR REPLACE FUNCTION public.get_unique_tickers()
RETURNS TABLE(ticker text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ticker
  FROM public.investment_transactions
  WHERE ticker IS NOT NULL
  UNION
  SELECT ticker FROM public.financial_assets
$$;

-- 3. Fix handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id);
  RETURN new;
END;
$$;

-- 4. Fix handle_asset_update
CREATE OR REPLACE FUNCTION public.handle_asset_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. Fix handle_scheduled_task_completion
CREATE OR REPLACE FUNCTION public.handle_scheduled_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    IF NEW.value IS NOT NULL AND NEW.value <> 0 THEN
      INSERT INTO public.transactions (user_id, group_id, type, amount, description, date, category)
      VALUES (
        NEW.user_id,
        NEW.group_id,
        (CASE WHEN NEW.value > 0 THEN 'income' ELSE 'expense' END)::transaction_type,
        abs(NEW.value),
        'Task completed: ' || NEW.title,
        now(),
        NEW.category
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Fix get_user_groups
CREATE OR REPLACE FUNCTION public.get_user_groups()
RETURNS SETOF family_groups
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.*
  FROM family_groups g
  JOIN group_members gm ON g.id = gm.group_id
  WHERE gm.user_id = auth.uid();
$$;

-- 7. Fix handle_task_completion (also has the issue)
CREATE OR REPLACE FUNCTION public.handle_task_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_completed = true AND OLD.is_completed = false THEN
    NEW.completed_at = now();
    NEW.status = 'completed';

    IF NEW.value IS NOT NULL AND NEW.value <> 0 THEN
      INSERT INTO public.transactions (user_id, group_id, type, amount, description, date, category)
      VALUES (
        NEW.user_id,
        NEW.group_id,
        CASE WHEN NEW.value > 0 THEN 'income' ELSE 'expense' END,
        abs(NEW.value),
        'Task completed: ' || NEW.title,
        now(),
        NEW.category
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Fix financial_assets RLS policies - remove overly permissive anonymous write access
DROP POLICY IF EXISTS "Allow public anonymous access to financial assets" ON public.financial_assets;
DROP POLICY IF EXISTS "Allow all users to insert/update financial assets" ON public.financial_assets;

-- Keep only read access for public (stock market data should be readable by all)
CREATE POLICY "Allow public read access to financial assets"
  ON public.financial_assets
  FOR SELECT
  TO public
  USING (true);