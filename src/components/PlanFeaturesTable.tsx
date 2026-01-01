import { FEATURES_TABLE } from '@/lib/subscription-limits';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface PlanFeaturesTableProps {
  currentPlan?: 'free' | 'basic' | 'advanced';
}

export function PlanFeaturesTable({ currentPlan }: PlanFeaturesTableProps) {
  const getPlanBadge = (plan: 'free' | 'basic' | 'advanced') => {
    if (currentPlan === plan) {
      return <Badge variant="default" className="ml-2">Atual</Badge>;
    }
    return null;
  };

  const getCellClass = (plan: 'free' | 'basic' | 'advanced') => {
    if (currentPlan === plan) {
      return 'bg-primary/5 font-medium';
    }
    return '';
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Comparativo de Planos</CardTitle>
        <CardDescription>
          Veja todas as funcionalidades disponíveis em cada plano
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Funcionalidade</TableHead>
              <TableHead className={`text-center min-w-[150px] ${getCellClass('free')}`}>
                Gratuito (R$ 0)
                {getPlanBadge('free')}
              </TableHead>
              <TableHead className={`text-center min-w-[150px] ${getCellClass('basic')}`}>
                Básico (R$ 9,90/mês)
                {getPlanBadge('basic')}
              </TableHead>
              <TableHead className={`text-center min-w-[150px] ${getCellClass('advanced')}`}>
                Avançado (R$ 15,90/mês)
                {getPlanBadge('advanced')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FEATURES_TABLE.map((row, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{row.feature}</TableCell>
                <TableCell className={`text-center ${getCellClass('free')}`}>
                  <span className={getStatusClass(row.free)}>{row.free}</span>
                </TableCell>
                <TableCell className={`text-center ${getCellClass('basic')}`}>
                  <span className={getStatusClass(row.basic)}>{row.basic}</span>
                </TableCell>
                <TableCell className={`text-center ${getCellClass('advanced')}`}>
                  <span className={getStatusClass(row.advanced)}>{row.advanced}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function getStatusClass(status: string): string {
  if (status.includes('❌') || status.includes('Bloqueado')) {
    return 'text-red-500';
  }
  if (status.includes('🚧')) {
    return 'text-yellow-600';
  }
  if (status.includes('✅') || status.includes('Ilimitad')) {
    return 'text-green-600';
  }
  return '';
}
