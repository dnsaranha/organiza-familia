import React from 'react';
import { UpgradeOverlay } from './UpgradeOverlay';
import { useSubscription, PlanLimits, PlanType } from '@/hooks/useSubscription';

type FeatureKey = 
  | 'investments'
  | 'groups'
  | 'forecast'
  | 'advancedReports'
  | 'export'
  | 'advancedAnalytics'
  | 'scenarios';

interface FeatureConfig {
  checkEnabled: (limits: PlanLimits) => boolean;
  requiredPlan: 'basic' | 'advanced';
  name: string;
  description: string;
}

const featureConfigs: Record<FeatureKey, FeatureConfig> = {
  investments: {
    checkEnabled: (limits) => limits.investmentsEnabled,
    requiredPlan: 'basic',
    name: 'Investimentos',
    description: 'Gerencie sua carteira de investimentos com ativos, dividendos e análises.',
  },
  groups: {
    checkEnabled: (limits) => limits.groupsEnabled,
    requiredPlan: 'basic',
    name: 'Grupos Familiares',
    description: 'Compartilhe finanças com sua família e gerencie orçamentos em grupo.',
  },
  forecast: {
    checkEnabled: (limits) => limits.forecastEnabled,
    requiredPlan: 'basic',
    name: 'Previsão Financeira',
    description: 'Visualize projeções e planeje seu futuro financeiro.',
  },
  advancedReports: {
    checkEnabled: (limits) => limits.reportsHistoryMonths > 1,
    requiredPlan: 'basic',
    name: 'Relatórios Avançados',
    description: 'Acesse histórico completo e relatórios detalhados.',
  },
  export: {
    checkEnabled: (limits) => limits.exportEnabled,
    requiredPlan: 'advanced',
    name: 'Exportação de Dados',
    description: 'Exporte seus dados para Excel, PDF e outros formatos.',
  },
  advancedAnalytics: {
    checkEnabled: (limits) => limits.advancedAnalytics,
    requiredPlan: 'advanced',
    name: 'Análises Avançadas',
    description: 'Análises detalhadas com insights sobre sua carteira de investimentos.',
  },
  scenarios: {
    checkEnabled: (limits) => limits.scenariosEnabled,
    requiredPlan: 'advanced',
    name: 'Cenários de Previsão',
    description: 'Simule diferentes cenários para suas projeções financeiras.',
  },
};

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  className?: string;
  fallback?: React.ReactNode;
}

export function FeatureGate({
  feature,
  children,
  className = '',
  fallback,
}: FeatureGateProps) {
  const { limits, plan, isLoading } = useSubscription();
  const config = featureConfigs[feature];
  
  const isEnabled = config.checkEnabled(limits);

  if (isLoading) {
    return <div className={className}>{children}</div>;
  }

  if (!isEnabled) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className={`relative min-h-[400px] ${className}`}>
        {/* Blurred content */}
        <div className="pointer-events-none select-none blur-sm">
          {children}
        </div>
        
        {/* Overlay */}
        <UpgradeOverlay
          feature={config.name}
          description={config.description}
          requiredPlan={config.requiredPlan}
          currentPlan={plan}
        />
      </div>
    );
  }

  return <>{children}</>;
}

// Component to check limits with current count
interface LimitGateProps {
  limitKey: keyof PlanLimits;
  currentCount: number;
  children: React.ReactNode;
  onLimitReached?: () => void;
}

export function LimitGate({
  limitKey,
  currentCount,
  children,
  onLimitReached,
}: LimitGateProps) {
  const { limits, plan } = useSubscription();
  const limit = limits[limitKey];
  
  if (typeof limit !== 'number') {
    return <>{children}</>;
  }

  const isLimitReached = currentCount >= limit && limit !== Infinity;

  if (isLimitReached && onLimitReached) {
    React.useEffect(() => {
      onLimitReached();
    }, [isLimitReached]);
  }

  return <>{children}</>;
}

// Hook to use feature gate logic imperatively
export function useFeatureGate(feature: FeatureKey) {
  const { limits, plan, isLoading } = useSubscription();
  const config = featureConfigs[feature];
  
  return {
    isEnabled: config.checkEnabled(limits),
    isLoading,
    plan,
    requiredPlan: config.requiredPlan,
    featureName: config.name,
    featureDescription: config.description,
  };
}
