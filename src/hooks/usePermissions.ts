import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';

// Types for permission checking
export type FeatureAccess = 'full' | 'partial' | 'blocked' | 'construction';

export interface PermissionDetails {
  access: FeatureAccess;
  detail: string;
  limit?: number;
  enabled: boolean;
}

export interface AllPermissions {
  dashboard: PermissionDetails;
  budget: PermissionDetails;
  transactions: PermissionDetails;
  goals: PermissionDetails;
  tasks: PermissionDetails;
  calendar: PermissionDetails;
  reports: PermissionDetails;
  investments: PermissionDetails;
  groups: PermissionDetails;
  forecast: PermissionDetails;
  pwaSettings: PermissionDetails;
  openFinance: PermissionDetails;
  pluggy: PermissionDetails;
  pushNotifications: PermissionDetails;
}

// Hook to get all permissions for current user
export function usePermissions() {
  const { subscriptionStatus } = useSubscriptionContext();
  const [permissions, setPermissions] = useState<AllPermissions | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // Determine which subscription_status to query
      let status = 'free';
      if (subscriptionStatus === 'active') {
        // Will need to determine from plan, using context
        status = 'basic'; // Default, will be overridden if needed
      } else if (subscriptionStatus === 'trialing') {
        status = 'trialing';
      }

      const { data, error } = await supabase
        .from('subscription_permissions')
        .select('*')
        .eq('subscription_status', status)
        .single();

      if (error) {
        console.warn('Error fetching permissions:', error);
        setPermissions(null);
      } else if (data) {
        setPermissions({
          dashboard: {
            access: data.dashboard_access as FeatureAccess,
            detail: data.dashboard_detail,
            enabled: data.dashboard_access !== 'blocked',
          },
          budget: {
            access: data.budget_access as FeatureAccess,
            detail: data.budget_detail,
            limit: data.max_budget_accounts,
            enabled: data.budget_access !== 'blocked',
          },
          transactions: {
            access: data.transactions_access as FeatureAccess,
            detail: data.transactions_detail,
            limit: data.max_transactions_per_month,
            enabled: data.transactions_access !== 'blocked',
          },
          goals: {
            access: data.goals_access as FeatureAccess,
            detail: data.goals_detail,
            limit: data.max_goals,
            enabled: data.goals_access !== 'blocked',
          },
          tasks: {
            access: data.tasks_access as FeatureAccess,
            detail: data.tasks_detail,
            limit: data.max_tasks,
            enabled: data.tasks_access !== 'blocked',
          },
          calendar: {
            access: data.calendar_access as FeatureAccess,
            detail: data.calendar_detail,
            enabled: data.calendar_access !== 'blocked',
          },
          reports: {
            access: data.reports_access as FeatureAccess,
            detail: data.reports_detail,
            limit: data.reports_months_limit,
            enabled: data.reports_access !== 'blocked',
          },
          investments: {
            access: data.investments_access as FeatureAccess,
            detail: data.investments_detail,
            limit: data.max_investment_assets,
            enabled: data.investments_access !== 'blocked',
          },
          groups: {
            access: data.groups_access as FeatureAccess,
            detail: data.groups_detail,
            limit: data.max_groups,
            enabled: data.can_create_groups,
          },
          forecast: {
            access: data.forecast_access as FeatureAccess,
            detail: data.forecast_detail,
            limit: data.forecast_months_limit,
            enabled: data.forecast_access !== 'blocked',
          },
          pwaSettings: {
            access: data.pwa_settings_access as FeatureAccess,
            detail: data.pwa_settings_detail,
            enabled: data.pwa_settings_access !== 'blocked',
          },
          openFinance: {
            access: data.open_finance_access as FeatureAccess,
            detail: data.open_finance_detail,
            enabled: data.open_finance_access !== 'blocked' && data.open_finance_access !== 'construction',
          },
          pluggy: {
            access: data.pluggy_access as FeatureAccess,
            detail: data.pluggy_detail,
            enabled: data.pluggy_access !== 'blocked' && data.pluggy_access !== 'construction',
          },
          pushNotifications: {
            access: data.push_notifications_access as FeatureAccess,
            detail: data.push_notifications_detail,
            enabled: data.push_notifications_access !== 'blocked' && data.push_notifications_access !== 'construction',
          },
        });
      }
    } catch (err) {
      console.warn('Error in fetchPermissions:', err);
      setPermissions(null);
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionStatus]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return { permissions, isLoading, refetch: fetchPermissions };
}

// Helper to check if user can perform action based on current count
export function useCanPerformAction(
  featureLimit: number | undefined,
  currentCount: number
): { canPerform: boolean; remaining: number; isAtLimit: boolean } {
  if (featureLimit === undefined || featureLimit >= 999999) {
    return { canPerform: true, remaining: Infinity, isAtLimit: false };
  }

  const remaining = Math.max(0, featureLimit - currentCount);
  const isAtLimit = currentCount >= featureLimit;

  return {
    canPerform: currentCount < featureLimit,
    remaining,
    isAtLimit,
  };
}
