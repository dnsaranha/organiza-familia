// Definição dos limites de cada plano de assinatura

export type PlanType = 'free' | 'basic' | 'advanced';

export interface PlanLimits {
  name: string;
  price: number;
  accounts: number; // -1 = ilimitado
  transactionsPerMonth: number; // -1 = ilimitado
  goals: number; // -1 = ilimitado
  tasks: number; // -1 = ilimitado
  assets: number; // -1 = ilimitado
  groups: number; // 0 = bloqueado, -1 = ilimitado
  groupMembers: number; // -1 = ilimitado
  reportsHistoryMonths: number; // -1 = completo
  forecastMonths: number; // 0 = bloqueado
  canExportReports: boolean;
  hasAdvancedAnalytics: boolean;
  hasAdvancedForecast: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    name: 'Plano Gratuito',
    price: 0,
    accounts: 1,
    transactionsPerMonth: 50,
    goals: 3,
    tasks: 5,
    assets: 0, // bloqueado
    groups: 0, // bloqueado
    groupMembers: 0,
    reportsHistoryMonths: 1,
    forecastMonths: 0, // bloqueado
    canExportReports: false,
    hasAdvancedAnalytics: false,
    hasAdvancedForecast: false,
  },
  basic: {
    name: 'Plano Básico',
    price: 9.90,
    accounts: 3,
    transactionsPerMonth: -1, // ilimitado
    goals: 10,
    tasks: -1, // ilimitado
    assets: 20,
    groups: 1,
    groupMembers: 3,
    reportsHistoryMonths: 12,
    forecastMonths: 3,
    canExportReports: false,
    hasAdvancedAnalytics: false,
    hasAdvancedForecast: false,
  },
  advanced: {
    name: 'Plano Avançado',
    price: 15.90,
    accounts: -1, // ilimitado
    transactionsPerMonth: -1, // ilimitado
    goals: -1, // ilimitado
    tasks: -1, // ilimitado
    assets: -1, // ilimitado
    groups: 3,
    groupMembers: -1, // ilimitado
    reportsHistoryMonths: -1, // completo
    forecastMonths: 12,
    canExportReports: true,
    hasAdvancedAnalytics: true,
    hasAdvancedForecast: true,
  },
};

// Tabela de funcionalidades para exibição
export interface FeatureRow {
  feature: string;
  free: string;
  basic: string;
  advanced: string;
}

export const FEATURES_TABLE: FeatureRow[] = [
  { feature: 'Dashboard (Home)', free: '✅ Completo', basic: '✅ Completo', advanced: '✅ Completo' },
  { feature: 'Contas de Orçamento', free: '1 conta', basic: '3 contas', advanced: 'Ilimitadas' },
  { feature: 'Transações/mês', free: '50 transações', basic: 'Ilimitadas', advanced: 'Ilimitadas' },
  { feature: 'Metas Financeiras', free: '3 metas', basic: '10 metas', advanced: 'Ilimitadas' },
  { feature: 'Tarefas/Lembretes', free: '5 tarefas', basic: 'Ilimitadas', advanced: 'Ilimitadas' },
  { feature: 'Calendário de Tarefas', free: '✅ Completo', basic: '✅ Completo', advanced: '✅ Completo' },
  { feature: 'Relatórios', free: 'Último mês', basic: 'Últimos 12 meses', advanced: 'Histórico completo' },
  { feature: 'Exportar Relatórios', free: '❌', basic: '❌', advanced: '✅' },
  { feature: 'Investimentos', free: '❌ Bloqueado', basic: '20 ativos', advanced: 'Ilimitados + análises' },
  { feature: 'Grupos Familiares', free: '❌ Bloqueado', basic: '1 grupo (3 membros)', advanced: '3 grupos (ilimitados)' },
  { feature: 'Previsão Financeira', free: '❌ Bloqueado', basic: '3 meses', advanced: '12 meses + cenários' },
  { feature: 'Configurações PWA', free: '✅ Completo', basic: '✅ Completo', advanced: '✅ Completo' },
  { feature: 'Open Finance', free: '🚧 Em construção', basic: '🚧 Em construção', advanced: '🚧 Em construção' },
  { feature: 'Pluggy', free: '🚧 Em construção', basic: '🚧 Em construção', advanced: '🚧 Em construção' },
  { feature: 'Notificações Push', free: '🚧 Em construção', basic: '🚧 Em construção', advanced: '🚧 Em construção' },
];

// Helper para verificar limites
export const checkLimit = (current: number, limit: number): boolean => {
  if (limit === -1) return true; // ilimitado
  return current < limit;
};

export const isFeatureBlocked = (limit: number): boolean => {
  return limit === 0;
};

export const getLimitDisplay = (limit: number, suffix: string = ''): string => {
  if (limit === -1) return 'Ilimitado';
  if (limit === 0) return 'Bloqueado';
  return `${limit}${suffix}`;
};
