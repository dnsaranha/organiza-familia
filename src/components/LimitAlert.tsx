import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSubscriptionContext } from '@/contexts/SubscriptionContext';
import { PlanLimits } from '@/hooks/useSubscription';

type LimitKey = keyof PlanLimits;

interface LimitAlertProps {
  limitKey: LimitKey;
  currentCount: number;
  itemName: string;
  className?: string;
}

const limitLabels: Partial<Record<LimitKey, string>> = {
  maxTransactionsPerMonth: 'transações este mês',
  maxGoals: 'metas',
  maxTasks: 'tarefas',
  maxAssets: 'ativos',
  maxGroups: 'grupos',
  maxAccounts: 'contas',
};

export function LimitAlert({
  limitKey,
  currentCount,
  itemName,
  className = '',
}: LimitAlertProps) {
  const navigate = useNavigate();
  const { limits, plan } = useSubscriptionContext();
  
  const limit = limits[limitKey];
  
  if (typeof limit !== 'number' || limit === Infinity) {
    return null;
  }

  const isAtLimit = currentCount >= limit;
  const isNearLimit = currentCount >= limit * 0.8;

  if (!isNearLimit) {
    return null;
  }

  const remaining = Math.max(0, limit - currentCount);
  const label = limitLabels[limitKey] || itemName;

  return (
    <Alert
      variant={isAtLimit ? 'destructive' : 'default'}
      className={`${className} ${!isAtLimit ? 'border-amber-500/50 bg-amber-500/10' : ''}`}
    >
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>
        {isAtLimit
          ? `Limite de ${label} atingido`
          : `Você está próximo do limite de ${label}`}
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-4 flex-wrap">
        <span>
          {isAtLimit
            ? `Seu plano ${plan === 'free' ? 'gratuito' : plan} permite até ${limit} ${label}.`
            : `Você usou ${currentCount} de ${limit} ${label}. Restam ${remaining}.`}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/pricing')}
          className={!isAtLimit ? 'border-amber-500 text-amber-600 hover:bg-amber-500/10' : ''}
        >
          Fazer Upgrade
          <ArrowRight className="ml-2 h-3 w-3" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}

// Hook to check if user can add more items
export function useCanAdd(limitKey: LimitKey, currentCount: number): {
  canAdd: boolean;
  remaining: number;
  limit: number | null;
} {
  const { limits } = useSubscriptionContext();
  const limit = limits[limitKey];
  
  if (typeof limit !== 'number' || limit === Infinity) {
    return { canAdd: true, remaining: Infinity, limit: null };
  }

  return {
    canAdd: currentCount < limit,
    remaining: Math.max(0, limit - currentCount),
    limit,
  };
}
