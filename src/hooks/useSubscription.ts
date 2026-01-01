import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { stripeProducts } from '@/stripe-config';

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
  groupsEnabled: boolean;
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

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxTransactionsPerMonth: 50,
    maxGoals: 3,
    maxTasks: 5,
    investmentsEnabled: false,
    maxAssets: 0,
    advancedAnalytics: false,
    groupsEnabled: false,
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [currentPeriodEnd, setCurrentPeriodEnd] = useState<Date | null>(null);

  const fetchSubscription = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPlan('free');
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

      if (subscription && subscription.subscription_status === 'active') {
        const detectedPlan = getPlanFromPriceId(subscription.price_id);
        setPlan(detectedPlan);
        setSubscriptionStatus(subscription.subscription_status);
        
        if (subscription.current_period_end) {
          setCurrentPeriodEnd(new Date(subscription.current_period_end * 1000));
        }
      } else {
        setPlan('free');
        setSubscriptionStatus(subscription?.subscription_status || null);
      }
    } catch (err) {
      console.error('Error in fetchSubscription:', err);
      setError('Erro ao carregar informações do plano');
      setPlan('free');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  return {
    plan,
    limits: PLAN_LIMITS[plan],
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
