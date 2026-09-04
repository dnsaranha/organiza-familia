-- Adiciona colunas para vincular ativos de investimentos às metas
ALTER TABLE public.savings_goals
ADD COLUMN IF NOT EXISTS linked_asset_ticker VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS linked_asset_type VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS reserved_percentage NUMERIC DEFAULT 100;

COMMENT ON COLUMN public.savings_goals.linked_asset_ticker IS 'Ticker ou código do ativo de investimento vinculado a esta meta (ex: CDB-INTER, SELIC29)';
COMMENT ON COLUMN public.savings_goals.linked_asset_type IS 'Tipo do ativo vinculado (FIXED_INCOME, STOCK, FII, etc)';
COMMENT ON COLUMN public.savings_goals.reserved_percentage IS 'Porcentagem do ativo reservada para esta meta (1 a 100%, padrão 100%)';
