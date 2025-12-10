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
import { Filter, TrendingUp, TrendingDown, Check } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DividendEntry {
  date: string;
  amount: number;
  yield?: number;
}

interface AssetDividendData {
  ticker: string;
  type: string;
  dividendHistory: DividendEntry[];
}

interface DividendMonthlyTableProps {
  assetsData: AssetDividendData[];
  loading?: boolean;
}

type PeriodFilter = "current_year" | "12_months" | "all" | "custom";
type DisplayMode = "value" | "yield";

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export function DividendMonthlyTable({ assetsData, loading = false }: DividendMonthlyTableProps) {
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("value");

  // Extract unique types and assets for filters
  const { allTypes, allAssets } = useMemo(() => {
    const types = new Set<string>();
    const assets = new Set<string>();
    assetsData.forEach(a => {
      if (a.type) types.add(a.type);
      assets.add(a.ticker);
    });
    return {
      allTypes: Array.from(types).sort(),
      allAssets: Array.from(assets).sort()
    };
  }, [assetsData]);

  // Initialize selected types/assets if empty (meaning all selected)
  // Logic: if selected array is empty, it means "All".

  // Processa os dados para agrupar por ano e mês
  const { yearlyData, years, maxValue } = useMemo(() => {
    const dataByYear: Record<number, Record<number, number>> = {};
    const countByYearMonth: Record<number, Record<number, number>> = {}; // Para média do yield
    let max = 0;

    const now = new Date();
    const currentYear = now.getFullYear();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(now.getFullYear() - 1);

    // Filtragem
    const filteredAssets = assetsData.filter(asset => {
      // Filter by Type
      if (selectedTypes.length > 0 && !selectedTypes.includes(asset.type)) return false;
      // Filter by Asset Ticker
      if (selectedAssets.length > 0 && !selectedAssets.includes(asset.ticker)) return false;
      return true;
    });

    // Agregar dividendos
    filteredAssets.forEach(asset => {
      if (!asset.dividendHistory || !Array.isArray(asset.dividendHistory)) return;
      
      asset.dividendHistory.forEach(div => {
        if (!div.date || typeof div.amount !== 'number') return;
        
        const date = new Date(div.date);
        const year = date.getFullYear();
        const month = date.getMonth();

        // Filter by Period
        if (periodFilter === "current_year" && year !== currentYear) return;
        if (periodFilter === "12_months" && date < oneYearAgo) return;
        // Custom not implemented in UI yet, treating as All

        if (!dataByYear[year]) {
          dataByYear[year] = {};
          countByYearMonth[year] = {};
        }
        
        const valueToAdd = displayMode === 'value' ? div.amount : (div.yield || 0);

        // Se for yield, vamos somar para depois fazer a média?
        // Agregando yield mensal de portfólio:
        // Se eu recebi 0.5% de A e 0.5% de B...
        // O correto seria soma ponderada, mas aqui estamos somando yields individuais de ativos o que pode ser confuso.
        // Se displayMode == yield, vamos somar os yields dos eventos.
        // Ex: tenho PETR4 (yield 1%) e VALE3 (yield 0.5%) no mesmo mês. Soma = 1.5%? Não.
        // Deveria ser (Div Total / Valor Total Portfolio).
        // Como não temos valor total portfolio histórico fácil aqui, vamos usar Soma dos Yields individuais
        // como uma aproximação de "Retorno sobre Custo acumulado" naquele mês?
        // Ou média simples?
        // O usuário pediu "trocar entre Valor e Yield".
        // Vamos assumir Soma dos Yields por enquanto (Yield on Cost acumulado do mês).

        dataByYear[year][month] = (dataByYear[year][month] || 0) + valueToAdd;
        
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
  }, [assetsData, periodFilter, selectedTypes, selectedAssets, displayMode]);

  const formatValue = (value: number) => {
    if (value === 0) return "-";
    if (displayMode === 'yield') {
      return `${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
    }
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
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-1" />
                Filtrar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Período</Label>
                  <Select
                    value={periodFilter}
                    onValueChange={(v: PeriodFilter) => setPeriodFilter(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o período" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="current_year">Ano Atual</SelectItem>
                      <SelectItem value="12_months">Últimos 12 Meses</SelectItem>
                      <SelectItem value="all">Todo o Histórico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Ativo</Label>
                  <ScrollArea className="h-24 border rounded-md p-2">
                    <div className="space-y-2">
                      {allTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={selectedTypes.includes(type)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedTypes([...selectedTypes, type]);
                              } else {
                                setSelectedTypes(selectedTypes.filter(t => t !== type));
                              }
                            }}
                          />
                          <label
                            htmlFor={`type-${type}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {type}
                          </label>
                        </div>
                      ))}
                      {allTypes.length === 0 && <span className="text-xs text-muted-foreground">Nenhum tipo encontrado</span>}
                    </div>
                  </ScrollArea>
                </div>

                <div className="space-y-2">
                  <Label>Ativos</Label>
                  <ScrollArea className="h-32 border rounded-md p-2">
                    <div className="space-y-2">
                      {allAssets.map(asset => (
                        <div key={asset} className="flex items-center space-x-2">
                          <Checkbox
                            id={`asset-${asset}`}
                            checked={selectedAssets.includes(asset)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedAssets([...selectedAssets, asset]);
                              } else {
                                setSelectedAssets(selectedAssets.filter(a => a !== asset));
                              }
                            }}
                          />
                          <label
                            htmlFor={`asset-${asset}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {asset}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                        setPeriodFilter("all");
                        setSelectedTypes([]);
                        setSelectedAssets([]);
                    }}
                >
                    Limpar Filtros
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant={displayMode === 'yield' ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayMode(prev => prev === 'value' ? 'yield' : 'value')}
          >
            {displayMode === 'value' ? 'Valor (R$)' : 'Yield (%)'}
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
                          {formatValue(value)}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center text-xs tabular-nums bg-muted/30 font-medium">
                      {formatValue(stats.average)}
                    </TableCell>
                    <TableCell className="text-center text-xs tabular-nums bg-muted/30 font-medium">
                      {formatValue(stats.total)}
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
