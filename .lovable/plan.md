## Problema

Na aba **Usuários** do `/admin`, a coluna **"Última Atividade"** mostra `profiles.updated_at`, que só muda quando o perfil é editado (nome/avatar/plano). Não reflete a atividade real do usuário (login, transação, tarefa, etc.).

Revisando o restante da tabela e dos cards, encontrei outras informações incorretas ou imprecisas:

1. **Última Atividade** → vem de `profiles.updated_at`. Errado.
2. **Plano** → vem de `profiles.subscription_plan`, que frequentemente está desatualizado. A fonte real é `stripe_subscriptions` (status `active`/`trialing` + `price_id`).
3. **Ordenação da lista** → ordenada por `profiles.updated_at desc`, mesmo problema da coluna.
4. **Card "Novos Hoje"** → conta `profiles` com `updated_at >= hoje`, ou seja, conta quem editou o perfil hoje, não quem se cadastrou hoje. O correto é `auth.users.created_at`.
5. **Nome do usuário nas conversas de Suporte** → a variável chama `email` mas recebe `full_name`. O e-mail real nunca é mostrado.

Como `auth.users` (que contém `email`, `created_at`, `last_sign_in_at`) só é acessível com `service_role`, a correção precisa de uma edge function admin.

## Solução

### 1. Nova edge function `admin-list-users`
- Valida JWT do chamador e confirma `user_roles.role = 'admin'` via `has_role`.
- Usa `service_role` para:
  - `auth.admin.listUsers()` → email, created_at, last_sign_in_at.
  - `profiles` → full_name, avatar_url.
  - `stripe_customers` + `stripe_subscriptions` → plano real (status ativo + price_id mapeado para Basic/Advanced via `src/stripe-config.ts`).
  - Maior data entre: `last_sign_in_at`, último `transactions.created_at`, último `scheduled_tasks.updated_at`, último `investment_transactions.created_at`, último `support_messages.created_at` → **última atividade real**.
- Retorna lista paginada (limite 100) ordenada por última atividade desc.

### 2. Nova edge function `admin-user-stats` (ou estender)
- Conta `auth.users` criados hoje para o card "Novos Hoje".
- Conta assinantes ativos em `stripe_subscriptions` (já está correto).

### 3. Ajustes em `src/pages/Admin.tsx`
- Trocar `fetchUsers` para chamar `admin-list-users` via `supabase.functions.invoke`.
- Atualizar `UserInfo` para incluir `email`, `last_activity_at`, `plan_label`.
- Mostrar **Nome**, **Email**, **Plano (real)**, **Última atividade (data + hora)**, **Ações**.
- Trocar `fetchStats` "Novos Hoje" para usar a nova edge function.
- Corrigir o agrupamento de conversas de suporte para exibir o email real (campo `email`) e manter `full_name` separado.

### 4. `supabase/config.toml`
- Registrar as novas funções com `verify_jwt = true` (chamadas autenticadas do frontend).

## Detalhes técnicos

- Mapeamento de planos: usar `STRIPE_PRODUCTS` em `src/stripe-config.ts` no lado da edge function (replicar mapping `price_id → name`).
- Para "última atividade" usar uma única query SQL com `GREATEST(...)` por usuário via RPC, ou montar via JS em paralelo (`Promise.all` por bloco de IDs). Vou usar uma RPC `get_users_last_activity(user_ids uuid[])` para performance — única migração necessária.
- Não alterar RLS existente; toda leitura privilegiada acontece na edge function.

## Arquivos afetados
- `supabase/functions/admin-list-users/index.ts` (novo)
- `supabase/migrations/<timestamp>_get_users_last_activity.sql` (novo, RPC)
- `supabase/config.toml` (adicionar função)
- `src/pages/Admin.tsx` (consumir nova função, ajustar colunas e label de conversas)
