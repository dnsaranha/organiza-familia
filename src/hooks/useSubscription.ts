import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PlanType = 'free' | 'basic' | 'advanced';

export interface PlanLimits {
  // Transações
  maxTransactionsPerMonth: number;
  
  // Metas
  maxGoals: number;
  
  // Tarefas
  maxTasks: number;
  
  // Investimentos
  investmentsEnabled: boolean;
  maxAssets: number;
  advancedAnalytics: boolean;
  
  // Grupos
  groupsEnabled: boolean; // Can CREATE groups
  canBeGroupMember: boolean; // Can be invited to groups
  maxGroups: number;
  maxMembersPerGroup: number;
  
  // Relatórios
  reportsHistoryMonths: number;
  exportEnabled: boolean;
  
  // Previsão
  forecastEnabled: boolean;
  forecastMonths: number;
  scenariosEnabled: boolean;
  
  // Contas
  maxAccounts: number;
}

// Default limits as fallback when database is not available
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxTransactionsPerMonth: 50,
    maxGoals: 3,
    maxTasks: 5,
    investmentsEnabled: false,
    maxAssets: 0,
    advancedAnalytics: false,
    groupsEnabled: false,
    canBeGroupMember: true,
    maxGroups: 0,
    maxMembersPerGroup: 0,
    reportsHistoryMonths: 1,
    exportEnabled: false,
    forecastEnabled: false,
    forecastMonths: 0,
    scenariosEnabled: false,
    maxAccounts: 1,
  },
  basic: {
    maxTransactionsPerMonth: Infinity,
    maxGoals: 10,
    maxTasks: Infinity,
    investmentsEnabled: true,
    maxAssets: 20,
    advancedAnalytics: false,
    groupsEnabled: true,
    canBeGroupMember: true,
    maxGroups: 1,
    maxMembersPerGroup: 3,
    reportsHistoryMonths: 12,
    exportEnabled: false,
    forecastEnabled: true,
    forecastMonths: 3,
    scenariosEnabled: false,
    maxAccounts: 3,
  },
  advanced: {
    maxTransactionsPerMonth: Infinity,
    maxGoals: Infinity,
    maxTasks: Infinity,
    investmentsEnabled: true,
    maxAssets: Infinity,
    advancedAnalytics: true,
    groupsEnabled: true,
    canBeGroupMember: true,
    maxGroups: 3,
    maxMembersPerGroup: Infinity,
    reportsHistoryMonths: Infinity,
    exportEnabled: true,
    forecastEnabled: true,
    forecastMonths: 12,
    scenariosEnabled: true,
    maxAccounts: Infinity,
  },
};

// Price IDs from Stripe
const PRICE_ID_BASIC = 'price_1Sk1CAQWn2kjGtoM0Wlz1Xql';
const PRICE_ID_ADVANCED = 'price_1Sk1MbQWn2kjGtoMSDAU65sj';

function getPlanFromPriceId(priceId: string | null): PlanType {
  if (priceId === PRICE_ID_ADVANCED) return 'advanced';
  if (priceId === PRICE_ID_BASIC) return 'basic';
  return 'free';
}

// Database permission record interface
interface SubscriptionPermission {
  subscription_status: string;
  // Dashboard
  dashboard_access: string;
  // Orçamento
  budget_access: string;
  max_budget_accounts: number;
  // Transações
  transactions_access: string;
  max_transactions_per_month: number;
  // Metas
  goals_access: string;
  max_goals: number;
  // Tarefas
  tasks_access: string;
  max_tasks: number;
  // Relatórios
  reports_access: string;
  reports_months_limit: number;
  reports_export: boolean;
  // Investimentos
  investments_access: string;
  max_investment_assets: number;
  investments_analytics: boolean;
  // Grupos
  groups_access: string;
  max_groups: number;
  max_members_per_group: number;
  can_create_groups: boolean;
  // Previsão
  forecast_access: string;
  forecast_months_limit: number;
  forecast_scenarios: boolean;
}

// Map database permissions to PlanLimits
function mapPermissionsToLimits(permissions: SubscriptionPermission): PlanLimits {
  const infinityValue = 999999;
  
  return {
    maxTransactionsPerMonth: permissions.max_transactions_per_month >= infinityValue 
      ? Infinity 
      : permissions.max_transactions_per_month,
    maxGoals: permissions.max_goals >= infinityValue 
      ? Infinity 
      : permissions.max_goals,
    maxTasks: permissions.max_tasks >= infinityValue 
      ? Infinity 
      : permissions.max_tasks,
    investmentsEnabled: permissions.investments_access !== 'blocked',
    maxAssets: permissions.max_investment_assets >= infinityValue 
      ? Infinity 
      : permissions.max_investment_assets,
    advancedAnalytics: permissions.investments_analytics,
    groupsEnabled: permissions.can_create_groups,
    canBeGroupMember: permissions.groups_access !== 'blocked',
    maxGroups: permissions.max_groups >= infinityValue 
      ? Infinity 
      : permissions.max_groups,
    maxMembersPerGroup: permissions.max_members_per_group >= infinityValue 
      ? Infinity 
      : permissions.max_members_per_group,
    reportsHistoryMonths: permissions.reports_months_limit >= 999 
      ? Infinity 
      : permissions.reports_months_limit,
    exportEnabled: permissions.reports_export,
    forecastEnabled: permissions.forecast_access !== 'blocked',
    forecastMonths: permissions.forecast_months_limit,
    scenariosEnabled: permissions.forecast_scenarios,
    maxAccounts: permissions.max_budget_accounts >= infinityValue 
      ? Infinity 
      : permissions.max_budget_accounts,
  };
}

// Map subscription status to PlanType
function mapStatusToPlanType(status: string): PlanType {
  switch (status) {
    case 'premium':
      return 'advanced';
    case 'basic':
      return 'basic';
    case 'trialing':
      return 'advanced'; // Trial users get full access
    default:
      return 'free';
  }
}

export interface SubscriptionState {
  plan: PlanType;
  limits: PlanLimits;
  isLoading: boolean;
  error: string | null;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  refetch: () => Promise<void>;
}

export function useSubscription(): SubscriptionState {
  const [plan, setPlan] = useState<PlanType>('free');
  const [limits, setLimits] = useState<PlanLimits>(PLAN_LIMITS.free);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First check if there's a valid session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      // If there's an auth error or no session, default to free plan
      if (sessionError || !session) {
        setPlan('free');
        await fetchPermissions('free');
        setIsLoading(false);
        return;
      }

      // Fetch subscription from stripe_user_subscriptions view
      const { data: subscription, error: subError } = await supabase
        .from('stripe_user_subscriptions')
        .select('*')
        .single();

      if (subError && subError.code !== 'PGRST116') {
        console.error('Error fetching subscription:', subError);
      }

      let permissionStatus = 'free';

      if (subscription && subscription.subscription_status === 'active') {
        const detectedPlan = getPlanFromPriceId(subscription.price_id);
        setPlan(detectedPlan);
        setSubscriptionStatus(subscription.subscription_status);
        
        // Map plan type to permission status
        permissionStatus = detectedPlan === 'advanced' ? 'premium' : detectedPlan;
        
        if (subscription.current_period_end) {
          setCurrentPeriodEnd(new Date(subscription.current_period_end * 1000));
        }
      } else if (subscription && subscription.subscription_status === 'trialing') {
        setPlan('advanced'); // Trial gets full access
        setSubscriptionStatus('trialing');
        permissionStatus = 'trialing';
      } else {
        setPlan('free');
        setSubscriptionStatus(subscription?.subscription_status || null);
        permissionStatus = subscription?.subscription_status === 'canceled' ? 'expired' : 'free';
      }

      // Fetch permissions from database
      await fetchPermissions(permissionStatus);

    } catch (err) {
      // Silently handle errors and default to free plan
      console.warn('Error in fetchSubscription:', err);
      setPlan('free');
      setLimits(PLAN_LIMITS.free);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchPermissions = useCallback(async (status: string) => {
    try {
      const { data: permissions, error: permError } = await supabase
        .from('subscription_permissions')
        .select('*')
        .eq('subscription_status', status)
        .single();

      if (permError) {
        console.warn('Error fetching permissions, using defaults:', permError);
        const fallbackPlan = mapStatusToPlanType(status);
        setLimits(PLAN_LIMITS[fallbackPlan]);
        return;
      }

      if (permissions) {
        const mappedLimits = mapPermissionsToLimits(permissions as SubscriptionPermission);
        setLimits(mappedLimits);
      } else {
        const fallbackPlan = mapStatusToPlanType(status);
        setLimits(PLAN_LIMITS[fallbackPlan]);
      }
    } catch (err) {
      console.warn('Error in fetchPermissions:', err);
      const fallbackPlan = mapStatusToPlanType(status);
      setLimits(PLAN_LIMITS[fallbackPlan]);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    plan,
    limits,
    isLoading,
    error,
    subscriptionStatus,
    currentPeriodEnd,
    refetch: fetchSubscription,
  };
}

// Helper function to check if a feature is available
export function isFeatureAvailable(
  limits: PlanLimits,
  feature: keyof PlanLimits
): boolean {
  const value = limits[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return false;
}

// Helper function to check if a limit is exceeded
export function isLimitExceeded(
  limits: PlanLimits,
  feature: keyof PlanLimits,
  currentCount: number
): boolean {
  const limit = limits[feature];
  if (typeof limit !== 'number') return false;
  return currentCount >= limit;
}
