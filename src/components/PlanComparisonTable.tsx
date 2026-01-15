import { useState, useEffect } from "react";
import { Check, X, Minus, Construction, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type AccessLevel = 'full' | 'partial' | 'blocked' | 'construction';

interface FeatureRow {
  feature: string;
  free: { level: AccessLevel; detail?: string };
  basic: { level: AccessLevel; detail?: string };
  advanced: { level: AccessLevel; detail?: string };
}

interface SubscriptionPermission {
  subscription_status: string;
  dashboard_access: string;
  dashboard_detail: string;
  budget_access: string;
  budget_detail: string;
  transactions_access: string;
  transactions_detail: string;
  goals_access: string;
  goals_detail: string;
  tasks_access: string;
  tasks_detail: string;
  calendar_access: string;
  calendar_detail: string;
  reports_access: string;
  reports_detail: string;
  investments_access: string;
  investments_detail: string;
  groups_access: string;
  groups_detail: string;
  forecast_access: string;
  forecast_detail: string;
  pwa_settings_access: string;
  pwa_settings_detail: string;
  open_finance_access: string;
  open_finance_detail: string;
  pluggy_access: string;
  pluggy_detail: string;
  push_notifications_access: string;
  push_notifications_detail: string;
}

// Fallback static data
const defaultFeatures: FeatureRow[] = [
  {
    feature: "Dashboard (Home)",
    free: { level: 'full', detail: "Completo" },
    basic: { level: 'full', detail: "Completo" },
    advanced: { level: 'full', detail: "Completo" },
  },
  {
    feature: "Orçamento",
    free: { level: 'partial', detail: "1 conta pessoal" },
    basic: { level: 'partial', detail: "Até 3 contas" },
    advanced: { level: 'full', detail: "Ilimitadas" },
  },
  {
    feature: "Transações",
    free: { level: 'partial', detail: "50/mês" },
    basic: { level: 'full', detail: "Ilimitadas" },
    advanced: { level: 'full', detail: "Ilimitadas" },
  },
  {
    feature: "Metas Financeiras",
    free: { level: 'partial', detail: "Até 3" },
    basic: { level: 'partial', detail: "Até 10" },
    advanced: { level: 'full', detail: "Ilimitadas" },
  },
  {
    feature: "Tarefas/Lembretes",
    free: { level: 'partial', detail: "Até 5" },
    basic: { level: 'full', detail: "Ilimitadas" },
    advanced: { level: 'full', detail: "Ilimitadas" },
  },
  {
    feature: "Calendário de Tarefas",
    free: { level: 'full', detail: "Completo" },
    basic: { level: 'full', detail: "Completo" },
    advanced: { level: 'full', detail: "Completo" },
  },
  {
    feature: "Relatórios",
    free: { level: 'partial', detail: "Último mês" },
    basic: { level: 'full', detail: "12 meses" },
    advanced: { level: 'full', detail: "Completo + Exportação" },
  },
  {
    feature: "Investimentos",
    free: { level: 'blocked' },
    basic: { level: 'partial', detail: "Até 20 ativos" },
    advanced: { level: 'full', detail: "Ilimitados + Análises" },
  },
  {
    feature: "Grupos",
    free: { level: 'partial', detail: "Somente membro convidado" },
    basic: { level: 'partial', detail: "1 grupo (3 membros)" },
    advanced: { level: 'full', detail: "3 grupos (ilimitado)" },
  },
  {
    feature: "Previsão Financeira",
    free: { level: 'blocked' },
    basic: { level: 'partial', detail: "3 meses" },
    advanced: { level: 'full', detail: "12 meses + Cenários" },
  },
  {
    feature: "Configurações PWA",
    free: { level: 'full', detail: "Completo" },
    basic: { level: 'full', detail: "Completo" },
    advanced: { level: 'full', detail: "Completo" },
  },
  {
    feature: "Open Finance",
    free: { level: 'construction' },
    basic: { level: 'construction' },
    advanced: { level: 'construction' },
  },
  {
    feature: "Pluggy",
    free: { level: 'construction' },
    basic: { level: 'construction' },
    advanced: { level: 'construction' },
  },
  {
    feature: "Notificações Push",
    free: { level: 'construction' },
    basic: { level: 'construction' },
    advanced: { level: 'construction' },
  },
];

function buildFeaturesFromPermissions(permissions: SubscriptionPermission[]): FeatureRow[] {
  const free = permissions.find(p => p.subscription_status === 'free');
  const basic = permissions.find(p => p.subscription_status === 'basic');
  const premium = permissions.find(p => p.subscription_status === 'premium');

  if (!free || !basic || !premium) {
    return defaultFeatures;
  }

  return [
    {
      feature: "Dashboard (Home)",
      free: { level: free.dashboard_access as AccessLevel, detail: free.dashboard_detail },
      basic: { level: basic.dashboard_access as AccessLevel, detail: basic.dashboard_detail },
      advanced: { level: premium.dashboard_access as AccessLevel, detail: premium.dashboard_detail },
    },
    {
      feature: "Orçamento",
      free: { level: free.budget_access as AccessLevel, detail: free.budget_detail },
      basic: { level: basic.budget_access as AccessLevel, detail: basic.budget_detail },
      advanced: { level: premium.budget_access as AccessLevel, detail: premium.budget_detail },
    },
    {
      feature: "Transações",
      free: { level: free.transactions_access as AccessLevel, detail: free.transactions_detail },
      basic: { level: basic.transactions_access as AccessLevel, detail: basic.transactions_detail },
      advanced: { level: premium.transactions_access as AccessLevel, detail: premium.transactions_detail },
    },
    {
      feature: "Metas Financeiras",
      free: { level: free.goals_access as AccessLevel, detail: free.goals_detail },
      basic: { level: basic.goals_access as AccessLevel, detail: basic.goals_detail },
      advanced: { level: premium.goals_access as AccessLevel, detail: premium.goals_detail },
    },
    {
      feature: "Tarefas/Lembretes",
      free: { level: free.tasks_access as AccessLevel, detail: free.tasks_detail },
      basic: { level: basic.tasks_access as AccessLevel, detail: basic.tasks_detail },
      advanced: { level: premium.tasks_access as AccessLevel, detail: premium.tasks_detail },
    },
    {
      feature: "Calendário de Tarefas",
      free: { level: free.calendar_access as AccessLevel, detail: free.calendar_detail },
      basic: { level: basic.calendar_access as AccessLevel, detail: basic.calendar_detail },
      advanced: { level: premium.calendar_access as AccessLevel, detail: premium.calendar_detail },
    },
    {
      feature: "Relatórios",
      free: { level: free.reports_access as AccessLevel, detail: free.reports_detail },
      basic: { level: basic.reports_access as AccessLevel, detail: basic.reports_detail },
      advanced: { level: premium.reports_access as AccessLevel, detail: premium.reports_detail },
    },
    {
      feature: "Investimentos",
      free: { level: free.investments_access as AccessLevel, detail: free.investments_detail },
      basic: { level: basic.investments_access as AccessLevel, detail: basic.investments_detail },
      advanced: { level: premium.investments_access as AccessLevel, detail: premium.investments_detail },
    },
    {
      feature: "Grupos",
      free: { level: free.groups_access as AccessLevel, detail: free.groups_detail },
      basic: { level: basic.groups_access as AccessLevel, detail: basic.groups_detail },
      advanced: { level: premium.groups_access as AccessLevel, detail: premium.groups_detail },
    },
    {
      feature: "Previsão Financeira",
      free: { level: free.forecast_access as AccessLevel, detail: free.forecast_detail },
      basic: { level: basic.forecast_access as AccessLevel, detail: basic.forecast_detail },
      advanced: { level: premium.forecast_access as AccessLevel, detail: premium.forecast_detail },
    },
    {
      feature: "Configurações PWA",
      free: { level: free.pwa_settings_access as AccessLevel, detail: free.pwa_settings_detail },
      basic: { level: basic.pwa_settings_access as AccessLevel, detail: basic.pwa_settings_detail },
      advanced: { level: premium.pwa_settings_access as AccessLevel, detail: premium.pwa_settings_detail },
    },
    {
      feature: "Open Finance",
      free: { level: free.open_finance_access as AccessLevel, detail: free.open_finance_detail },
      basic: { level: basic.open_finance_access as AccessLevel, detail: basic.open_finance_detail },
      advanced: { level: premium.open_finance_access as AccessLevel, detail: premium.open_finance_detail },
    },
    {
      feature: "Pluggy",
      free: { level: free.pluggy_access as AccessLevel, detail: free.pluggy_detail },
      basic: { level: basic.pluggy_access as AccessLevel, detail: basic.pluggy_detail },
      advanced: { level: premium.pluggy_access as AccessLevel, detail: premium.pluggy_detail },
    },
    {
      feature: "Notificações Push",
      free: { level: free.push_notifications_access as AccessLevel, detail: free.push_notifications_detail },
      basic: { level: basic.push_notifications_access as AccessLevel, detail: basic.push_notifications_detail },
      advanced: { level: premium.push_notifications_access as AccessLevel, detail: premium.push_notifications_detail },
    },
  ];
}

function AccessIndicator({ level, detail }: { level: AccessLevel; detail?: string }) {
  switch (level) {
    case 'full':
      return (
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-success" />
          {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
        </div>
      );
    case 'partial':
      return (
        <div className="flex items-center gap-2">
          <Minus className="h-5 w-5 text-warning" />
          {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
        </div>
      );
    case 'blocked':
      return (
        <div className="flex items-center gap-2">
          <X className="h-5 w-5 text-destructive" />
          <span className="text-sm text-muted-foreground">Bloqueado</span>
        </div>
      );
    case 'construction':
      return (
        <div className="flex items-center gap-2">
          <Construction className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Em construção</span>
        </div>
      );
    default:
      return null;
  }
}

export function PlanComparisonTable() {
  const [features, setFeatures] = useState<FeatureRow[]>(defaultFeatures);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        const { data, error } = await supabase
          .from('subscription_permissions')
          .select('*')
          .in('subscription_status', ['free', 'basic', 'premium']);

        if (error) {
          console.warn('Error fetching permissions:', error);
          setFeatures(defaultFeatures);
        } else if (data && data.length > 0) {
          const builtFeatures = buildFeaturesFromPermissions(data as SubscriptionPermission[]);
          setFeatures(builtFeatures);
        }
      } catch (err) {
        console.warn('Error in fetchPermissions:', err);
        setFeatures(defaultFeatures);
      } finally {
        setIsLoading(false);
      }
    }

    fetchPermissions();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Comparativo de Planos</CardTitle>
        <div className="flex gap-4 flex-wrap text-sm">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-success" />
            <span>Disponível</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-warning" />
            <span>Parcial</span>
          </div>
          <div className="flex items-center gap-2">
            <X className="h-4 w-4 text-destructive" />
            <span>Bloqueado</span>
          </div>
          <div className="flex items-center gap-2">
            <Construction className="h-4 w-4 text-muted-foreground" />
            <span>Em construção</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Funcionalidade</TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span>Gratuito</span>
                    <Badge variant="secondary">R$ 0,00</Badge>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span>Básico</span>
                    <Badge variant="default">R$ 9,90/mês</Badge>
                  </div>
                </TableHead>
                <TableHead className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span>Avançado</span>
                    <Badge className="bg-gradient-primary text-primary-foreground">R$ 15,90/mês</Badge>
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell className="font-medium">{row.feature}</TableCell>
                  <TableCell>
                    <AccessIndicator level={row.free.level} detail={row.free.detail} />
                  </TableCell>
                  <TableCell>
                    <AccessIndicator level={row.basic.level} detail={row.basic.detail} />
                  </TableCell>
                  <TableCell>
                    <AccessIndicator level={row.advanced.level} detail={row.advanced.detail} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}