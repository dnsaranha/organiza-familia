-- Tabela para controlar as restrições e permissões por tipo de assinatura
-- Baseado na tabela "Comparativo de Planos" do PlanComparisonTable.tsx
DROP TABLE IF EXISTS subscription_permissions;

CREATE TABLE subscription_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_status TEXT NOT NULL UNIQUE,
  
  -- Dashboard (Home) - Completo para todos
  dashboard_access TEXT DEFAULT 'full',
  dashboard_detail TEXT DEFAULT 'Completo',
  
  -- Orçamento
  budget_access TEXT DEFAULT 'partial',
  budget_detail TEXT DEFAULT '1 conta pessoal',
  max_budget_accounts INTEGER DEFAULT 1,
  
  -- Transações
  transactions_access TEXT DEFAULT 'partial',
  transactions_detail TEXT DEFAULT '50/mês',
  max_transactions_per_month INTEGER DEFAULT 50,
  
  -- Metas Financeiras
  goals_access TEXT DEFAULT 'partial',
  goals_detail TEXT DEFAULT 'Até 3',
  max_goals INTEGER DEFAULT 3,
  
  -- Tarefas/Lembretes
  tasks_access TEXT DEFAULT 'partial',
  tasks_detail TEXT DEFAULT 'Até 5',
  max_tasks INTEGER DEFAULT 5,
  
  -- Calendário de Tarefas - Completo para todos
  calendar_access TEXT DEFAULT 'full',
  calendar_detail TEXT DEFAULT 'Completo',
  
  -- Relatórios
  reports_access TEXT DEFAULT 'partial',
  reports_detail TEXT DEFAULT 'Último mês',
  reports_months_limit INTEGER DEFAULT 1,
  reports_export BOOLEAN DEFAULT false,
  
  -- Investimentos
  investments_access TEXT DEFAULT 'blocked',
  investments_detail TEXT DEFAULT 'Bloqueado',
  max_investment_assets INTEGER DEFAULT 0,
  investments_analytics BOOLEAN DEFAULT false,
  
  -- Grupos
  groups_access TEXT DEFAULT 'partial',
  groups_detail TEXT DEFAULT 'Somente membro convidado',
  max_groups INTEGER DEFAULT 0,
  max_members_per_group INTEGER DEFAULT 0,
  can_create_groups BOOLEAN DEFAULT false,
  
  -- Previsão Financeira
  forecast_access TEXT DEFAULT 'blocked',
  forecast_detail TEXT DEFAULT 'Bloqueado',
  forecast_months_limit INTEGER DEFAULT 0,
  forecast_scenarios BOOLEAN DEFAULT false,
  
  -- Configurações PWA - Completo para todos
  pwa_settings_access TEXT DEFAULT 'full',
  pwa_settings_detail TEXT DEFAULT 'Completo',
  
  -- Open Finance - Em construção para todos
  open_finance_access TEXT DEFAULT 'construction',
  open_finance_detail TEXT DEFAULT 'Em construção',
  
  -- Pluggy - Em construção para todos
  pluggy_access TEXT DEFAULT 'construction',
  pluggy_detail TEXT DEFAULT 'Em construção',
  
  -- Notificações Push - Em construção para todos
  push_notifications_access TEXT DEFAULT 'construction',
  push_notifications_detail TEXT DEFAULT 'Em construção',
  
  -- Metadados
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir permissões padrão para cada tipo de assinatura
INSERT INTO subscription_permissions (
  subscription_status,
  -- Dashboard
  dashboard_access, dashboard_detail,
  -- Orçamento
  budget_access, budget_detail, max_budget_accounts,
  -- Transações
  transactions_access, transactions_detail, max_transactions_per_month,
  -- Metas
  goals_access, goals_detail, max_goals,
  -- Tarefas
  tasks_access, tasks_detail, max_tasks,
  -- Calendário
  calendar_access, calendar_detail,
  -- Relatórios
  reports_access, reports_detail, reports_months_limit, reports_export,
  -- Investimentos
  investments_access, investments_detail, max_investment_assets, investments_analytics,
  -- Grupos
  groups_access, groups_detail, max_groups, max_members_per_group, can_create_groups,
  -- Previsão
  forecast_access, forecast_detail, forecast_months_limit, forecast_scenarios,
  -- PWA
  pwa_settings_access, pwa_settings_detail,
  -- Open Finance
  open_finance_access, open_finance_detail,
  -- Pluggy
  pluggy_access, pluggy_detail,
  -- Notificações Push
  push_notifications_access, push_notifications_detail
) VALUES 
-- Plano Gratuito (free)
(
  'free',
  'full', 'Completo',
  'partial', '1 conta pessoal', 1,
  'partial', '50/mês', 50,
  'partial', 'Até 3', 3,
  'partial', 'Até 5', 5,
  'full', 'Completo',
  'partial', 'Último mês', 1, false,
  'blocked', 'Bloqueado', 0, false,
  'partial', 'Somente membro convidado', 0, 0, false,
  'blocked', 'Bloqueado', 0, false,
  'full', 'Completo',
  'construction', 'Em construção',
  'construction', 'Em construção',
  'construction', 'Em construção'
),
-- Plano Básico (basic)
(
  'basic',
  'full', 'Completo',
  'partial', 'Até 3 contas', 3,
  'full', 'Ilimitadas', 999999,
  'partial', 'Até 10', 10,
  'full', 'Ilimitadas', 999999,
  'full', 'Completo',
  'full', '12 meses', 12, false,
  'partial', 'Até 20 ativos', 20, false,
  'partial', '1 grupo (3 membros)', 1, 3, true,
  'partial', '3 meses', 3, false,
  'full', 'Completo',
  'construction', 'Em construção',
  'construction', 'Em construção',
  'construction', 'Em construção'
),
-- Plano Avançado (premium)
(
  'premium',
  'full', 'Completo',
  'full', 'Ilimitadas', 999999,
  'full', 'Ilimitadas', 999999,
  'full', 'Ilimitadas', 999999,
  'full', 'Ilimitadas', 999999,
  'full', 'Completo',
  'full', 'Completo + Exportação', 999, true,
  'full', 'Ilimitados + Análises', 999999, true,
  'full', '3 grupos (ilimitado)', 3, 999999, true,
  'full', '12 meses + Cenários', 12, true,
  'full', 'Completo',
  'construction', 'Em construção',
  'construction', 'Em construção',
  'construction', 'Em construção'
),
-- Assinatura expirada/cancelada (equivalente ao gratuito)
(
  'expired',
  'full', 'Completo',
  'partial', '1 conta pessoal', 1,
  'partial', '50/mês', 50,
  'partial', 'Até 3', 3,
  'partial', 'Até 5', 5,
  'full', 'Completo',
  'partial', 'Último mês', 1, false,
  'blocked', 'Bloqueado', 0, false,
  'partial', 'Somente membro convidado', 0, 0, false,
  'blocked', 'Bloqueado', 0, false,
  'full', 'Completo',
  'construction', 'Em construção',
  'construction', 'Em construção',
  'construction', 'Em construção'
),
-- Assinatura em trial (acesso completo temporário)
(
  'trialing',
  'full', 'Completo',
  'full', 'Ilimitadas', 999999,
  'full', 'Ilimitadas', 999999,
  'full', 'Ilimitadas', 999999,
  'full', 'Ilimitadas', 999999,
  'full', 'Completo',
  'full', 'Completo + Exportação', 999, true,
  'full', 'Ilimitados + Análises', 999999, true,
  'full', '3 grupos (ilimitado)', 3, 999999, true,
  'full', '12 meses + Cenários', 12, true,
  'full', 'Completo',
  'construction', 'Em construção',
  'construction', 'Em construção',
  'construction', 'Em construção'
);

-- Função para atualizar o timestamp
CREATE OR REPLACE FUNCTION update_subscription_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar o timestamp automaticamente
DROP TRIGGER IF EXISTS subscription_permissions_updated_at ON subscription_permissions;
CREATE TRIGGER subscription_permissions_updated_at
  BEFORE UPDATE ON subscription_permissions
  FOR EACH ROW EXECUTE FUNCTION update_subscription_permissions_updated_at();

-- Enable RLS
ALTER TABLE subscription_permissions ENABLE ROW LEVEL SECURITY;

-- Policy para leitura pública (todos podem ver as permissões dos planos)
CREATE POLICY "Allow public read access" ON subscription_permissions
  FOR SELECT USING (true);
