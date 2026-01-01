import React, { createContext, useContext, ReactNode } from 'react';
import { useSubscription, SubscriptionState, PlanLimits, PLAN_LIMITS, PlanType } from '@/hooks/useSubscription';

const SubscriptionContext = createContext<SubscriptionState | null>(null);

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const subscription = useSubscription();
  
  return (
    <SubscriptionContext.Provider value={subscription}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionState {
  const context = useContext(SubscriptionContext);
  
  if (!context) {
    // Return default free plan values if used outside provider
    return {
      plan: 'free' as PlanType,
      limits: PLAN_LIMITS.free,
      isLoading: false,
      error: null,
      subscriptionStatus: null,
      currentPeriodEnd: null,
      refetch: async () => {},
    };
  }
  
  return context;
}
