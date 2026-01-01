import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Sparkles } from 'lucide-react';

interface UpgradePromptProps {
  feature: string;
  requiredPlan: 'basic' | 'advanced';
  description?: string;
}

export function UpgradePrompt({ feature, requiredPlan, description }: UpgradePromptProps) {
  const planName = requiredPlan === 'basic' ? 'Básico' : 'Avançado';
  const planPrice = requiredPlan === 'basic' ? 'R$ 9,90' : 'R$ 15,90';

  return (
    <Card className="bg-gradient-card shadow-card border border-border">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-xl text-foreground">{feature}</CardTitle>
        <CardDescription className="text-muted-foreground">
          {description || `Esta funcionalidade está disponível a partir do Plano ${planName}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          <span>Desbloqueie com o Plano {planName} por apenas {planPrice}/mês</span>
        </div>
        <Button asChild className="w-full sm:w-auto bg-gradient-primary text-primary-foreground shadow-button hover:scale-105 transition-smooth">
          <Link to="/pricing">Ver Planos</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

interface LimitReachedPromptProps {
  feature: string;
  currentCount: number;
  limit: number;
  upgradePlan: 'basic' | 'advanced';
}

export function LimitReachedPrompt({ feature, currentCount, limit, upgradePlan }: LimitReachedPromptProps) {
  const planName = upgradePlan === 'basic' ? 'Básico' : 'Avançado';

  return (
    <Card className="bg-gradient-card shadow-card border border-warning/30">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="font-medium text-foreground">
              Limite atingido: {currentCount}/{limit} {feature}
            </p>
            <p className="text-sm text-muted-foreground">
              Faça upgrade para o Plano {planName} para adicionar mais.
            </p>
          </div>
          <Button asChild className="bg-gradient-expense text-expense-foreground shadow-expense hover:scale-105 transition-smooth">
            <Link to="/pricing">Fazer Upgrade</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
