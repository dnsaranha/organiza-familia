import { Check, X, Minus, Construction } from "lucide-react";
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

type AccessLevel = 'full' | 'partial' | 'blocked' | 'construction';

interface FeatureRow {
  feature: string;
  free: { level: AccessLevel; detail?: string };
  basic: { level: AccessLevel; detail?: string };
  advanced: { level: AccessLevel; detail?: string };
}

const features: FeatureRow[] = [
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
      </CardContent>
    </Card>
  );
}