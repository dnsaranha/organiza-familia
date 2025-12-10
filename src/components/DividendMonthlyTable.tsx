import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Filter, TrendingUp, TrendingDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DividendEntry {
  date: string;
  amount: number;
}

interface AssetDividendData {
  ticker: string;
  dividendHistory: DividendEntry[];
}

interface DividendMonthlyTableProps {
  assetsData: AssetDividendData[];
  loading?: boolean;
}

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function DividendMonthlyTable({ assetsData, loading = false }: DividendMonthlyTableProps) {
  const [showFilter, setShowFilter] = useState(false);

  // Processa os dados para agrupar por ano e mês
  const { yearlyData, years, maxValue } = useMemo(() => {
    const dataByYear: Record<number, Record<number, number>> = {};
    let max = 0;

    // Agregar dividendos de todos os ativos por mês/ano
    assetsData.forEach(asset => {
      if (!asset.dividendHistory || !Array.isArray(asset.dividendHistory)) return;
      
      asset.dividendHistory.forEach(div => {
        if (!div.date || typeof div.amount !== 'number') return;
        
        const date = new Date(div.date);
        const year = date.getFullYear();
        const month = date.getMonth();

        if (!dataByYear[year]) {
          dataByYear[year] = {};
        }
        
        dataByYear[year][month] = (dataByYear[year][month] || 0) + div.amount;
        
        if (dataByYear[year][month] > max) {
          max = dataByYear[year][month];
        }
      });
    });

    // Ordenar anos (mais recente primeiro)
    const sortedYears = Object.keys(dataByYear)
      .map(Number)
      .sort((a, b) => b - a);

    return { yearlyData: dataByYear, years: sortedYears, maxValue: max };
  }, [assetsData]);

  const formatCurrency = (value: number) => {
    if (value === 0) return "-";
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calcula a intensidade da cor baseada no valor
  const getIntensityClass = (value: number): string => {
    if (value === 0 || maxValue === 0) return "";
    const ratio = value / maxValue;
    
    if (ratio > 0.75) return "bg-primary/30";
    if (ratio > 0.5) return "bg-primary/20";
    if (ratio > 0.25) return "bg-primary/10";
    return "bg-primary/5";
  };

  // Calcula estatísticas por ano
  const getYearStats = (year: number) => {
    const yearData = yearlyData[year] || {};
    const values = Object.values(yearData).filter(v => v > 0);
    
    if (values.length === 0) {
      return { average: 0, total: 0, variation: 0 };
    }

    const total = values.reduce((sum, v) => sum + v, 0);
    const average = total / 12; // Média considerando 12 meses

    // Calcula variação em relação ao ano anterior
    const prevYear = year - 1;
    const prevYearData = yearlyData[prevYear];
    let variation = 0;
    
    if (prevYearData) {
      const prevTotal = Object.values(prevYearData).reduce((sum, v) => sum + v, 0);
      if (prevTotal > 0) {
        variation = ((total - prevTotal) / prevTotal) * 100;
      }
    }

    return { average, total, variation };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório Mensal de Proventos</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (years.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relatório Mensal de Proventos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhum histórico de dividendos disponível.
            <br />
            <span className="text-sm">
              Adicione ativos com histórico de dividendos para visualizar o relatório.
            </span>
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Relatório Mensal de Proventos</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilter(!showFilter)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filtrar
          </Button>
          <Button variant="outline" size="sm">
            Valor
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 sticky left-0 bg-background">Ano</TableHead>
                {months.map(month => (
                  <TableHead key={month} className="text-center min-w-[60px] text-xs">
                    {month}
                  </TableHead>
                ))}
                <TableHead className="text-center min-w-[70px] text-xs bg-muted/50">x̄ Média</TableHead>
                <TableHead className="text-center min-w-[80px] text-xs bg-muted/50">Σ Total</TableHead>
                <TableHead className="text-center min-w-[70px] text-xs bg-muted/50">∿ Var</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {years.map(year => {
                const stats = getYearStats(year);
                
                return (
                  <TableRow key={year}>
                    <TableCell className="font-medium sticky left-0 bg-background">
                      <div className="flex items-center gap-1">
                        {year}
                        <span className="text-muted-foreground">▶</span>
                      </div>
                    </TableCell>
                    {Array.from({ length: 12 }, (_, monthIndex) => {
                      const value = yearlyData[year]?.[monthIndex] || 0;
                      return (
                        <TableCell
                          key={monthIndex}
                          className={cn(
                            "text-center text-xs tabular-nums",
                            getIntensityClass(value)
                          )}
                        >
                          {formatCurrency(value)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center text-xs tabular-nums bg-muted/30 font-medium">
                      {formatCurrency(stats.average)}
                    </TableCell>
                    <TableCell className="text-center text-xs tabular-nums bg-muted/30 font-medium">
                      {formatCurrency(stats.total)}
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {stats.variation !== 0 ? (
                        <div className={cn(
                          "flex items-center justify-center gap-1",
                          stats.variation > 0 ? "text-success" : "text-destructive"
                        )}>
                          {stats.variation > 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          <span>{Math.abs(stats.variation).toFixed(2)}%</span>
                        </div>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
