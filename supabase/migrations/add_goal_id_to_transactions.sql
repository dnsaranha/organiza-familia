-- 1. Adiciona a coluna 'goal_id' na tabela 'transactions'.
-- Esta coluna irá armazenar a referência para a meta associada, se houver.
ALTER TABLE public.transactions
ADD COLUMN goal_id UUID;

-- 2. Adiciona uma restrição de chave estrangeira.
-- Isso garante que o 'goal_id' inserido na tabela 'transactions' deve corresponder a um 'id' válido na tabela 'savings_goals'.
-- A opção ON DELETE SET NULL garante que, se uma meta for excluída, o 'goal_id' nas transações associadas se tornará nulo, em vez de excluir a transação.
ALTER TABLE public.transactions
ADD CONSTRAINT fk_savings_goals
FOREIGN KEY (goal_id)
REFERENCES public.savings_goals(id)
ON DELETE SET NULL;

-- 3. Recria a política de INSERT para incluir a nova coluna.
-- É necessário remover a política antiga para atualizá-la.
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.transactions;

CREATE POLICY "Enable insert for authenticated users only"
ON public.transactions
FOR INSERT
WITH CHECK ( (auth.uid() = user_id) );

-- 4. Recria a política de SELECT para incluir a nova coluna.
DROP POLICY IF EXISTS "Enable read access for own and group transactions" ON public.transactions;

CREATE POLICY "Enable read access for own and group transactions"
ON public.transactions
FOR SELECT
USING (
  (auth.uid() = user_id) OR
  (group_id IN (
    SELECT group_id
    FROM group_members
    WHERE (group_members.user_id = auth.uid())
  ))
);

-- 5. Recria a política de UPDATE para incluir a nova coluna.
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.transactions;

CREATE POLICY "Enable update for users based on user_id"
ON public.transactions
FOR UPDATE
USING ( (auth.uid() = user_id) );

-- 6. Recria a política de DELETE.
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.transactions;

CREATE POLICY "Enable delete for users based on user_id"
ON public.transactions
FOR DELETE
USING ( (auth.uid() = user_id) );

-- Confirmação final
SELECT 'Migration to add goal_id to transactions completed successfully.';

