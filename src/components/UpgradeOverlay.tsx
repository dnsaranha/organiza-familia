import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Sparkles, Crown, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PlanType } from '@/hooks/useSubscription';

interface UpgradeOverlayProps {
  feature: string;
  description?: string;
  requiredPlan: 'basic' | 'advanced';
  currentPlan: PlanType;
}

const planDetails = {
  basic: {
    name: 'Plano Básico',
    price: 'R$ 9,90/mês',
    icon: Sparkles,
    color: 'from-blue-500 to-cyan-500',
  },
  advanced: {
    name: 'Plano Avançado',
    price: 'R$ 15,90/mês',
    icon: Crown,
    color: 'from-amber-500 to-orange-500',
  },
};

export function UpgradeOverlay({
  feature,
  description,
  requiredPlan,
  currentPlan,
}: UpgradeOverlayProps) {
  const navigate = useNavigate();
  const details = planDetails[requiredPlan];
  const Icon = details.icon;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
      <div className="mx-4 max-w-md animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 shadow-2xl">
          {/* Decorative gradient */}
          <div
            className={`absolute -right-20 -top-20 h-40 w-40 rounded-full bg-gradient-to-br ${details.color} opacity-20 blur-3xl`}
          />

          {/* Lock icon */}
          <div className="mb-4 flex justify-center">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br ${details.color}`}
            >
              <Lock className="h-8 w-8 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center">
            <h3 className="mb-2 text-xl font-bold text-foreground">
              {feature}
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {description ||
                `Este recurso está disponível a partir do ${details.name}`}
            </p>

            {/* Plan card */}
            <div className="mb-4 rounded-xl border border-border/50 bg-muted/30 p-4">
              <div className="flex items-center justify-center gap-2">
                <Icon className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">
                  {details.name}
                </span>
              </div>
              <p className="mt-1 text-lg font-bold text-primary">
                {details.price}
              </p>
            </div>

            {/* Current plan badge */}
            {currentPlan !== 'free' && (
              <p className="mb-4 text-xs text-muted-foreground">
                Seu plano atual:{' '}
                <span className="font-medium capitalize">{currentPlan}</span>
              </p>
            )}

            {/* CTA Button */}
            <Button
              onClick={() => navigate('/pricing')}
              className={`w-full bg-gradient-to-r ${details.color} text-white hover:opacity-90`}
            >
              Fazer Upgrade
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
