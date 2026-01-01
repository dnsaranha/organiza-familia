import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PlanType, PLAN_LIMITS, PlanLimits, checkLimit, isFeatureBlocked } from '@/lib/subscription-limits';

interface SubscriptionState {
  plan: PlanType;
  limits: PlanLimits;
  isLoading: boolean;
}

export function useSubscription() {
  const [state, setState] = useState<SubscriptionState>({
    plan: 'free',
    limits: PLAN_LIMITS.free,
    isLoading: true,
  });

  useEffect(() => {
    let isMounted = true;
    
    const fetchSubscription = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          if (isMounted) {
            setState({ plan: 'free', limits: PLAN_LIMITS.free, isLoading: false });
          }
          return;
        }

        // Buscar assinatura do usuário na tabela de profiles ou subscriptions
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('subscription_plan')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.warn('Error fetching profile:', profileError);
        }

        const plan = (profile?.subscription_plan as PlanType) || 'free';
        if (isMounted) {
          setState({
            plan,
            limits: PLAN_LIMITS[plan],
            isLoading: false,
          });
        }
      } catch (error) {
        console.warn('Network error fetching subscription:', error);
        if (isMounted) {
          setState({ plan: 'free', limits: PLAN_LIMITS.free, isLoading: false });
        }
      }
    };

    fetchSubscription();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchSubscription();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Helpers para verificar permissões
  const canAddAccount = (currentCount: number) => checkLimit(currentCount, state.limits.accounts);
  const canAddTransaction = (currentMonthCount: number) => checkLimit(currentMonthCount, state.limits.transactionsPerMonth);
  const canAddGoal = (currentCount: number) => checkLimit(currentCount, state.limits.goals);
  const canAddTask = (currentCount: number) => checkLimit(currentCount, state.limits.tasks);
  const canAddAsset = (currentCount: number) => checkLimit(currentCount, state.limits.assets);
  const canAddGroup = (currentCount: number) => checkLimit(currentCount, state.limits.groups);
  const canAddGroupMember = (currentCount: number) => checkLimit(currentCount, state.limits.groupMembers);

  const canAccessInvestments = () => !isFeatureBlocked(state.limits.assets);
  const canAccessGroups = () => !isFeatureBlocked(state.limits.groups);
  const canAccessForecast = () => !isFeatureBlocked(state.limits.forecastMonths);
  const canExportReports = () => state.limits.canExportReports;
  const hasAdvancedAnalytics = () => state.limits.hasAdvancedAnalytics;

  return {
    ...state,
    canAddAccount,
    canAddTransaction,
    canAddGoal,
    canAddTask,
    canAddAsset,
    canAddGroup,
    canAddGroupMember,
    canAccessInvestments,
    canAccessGroups,
    canAccessForecast,
    canExportReports,
    hasAdvancedAnalytics,
  };
}
