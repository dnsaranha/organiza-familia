import { useMemo, useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import { Filter, TrendingUp, TrendingDown, DollarSign, Percent } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";

interface DividendEntry {
  date: string;
  amount: number;
}

interface AssetDividendData {
  ticker: string;
  dividendHistory: DividendEntry[];
}

interface TransactionData {
  ticker: string;
  quantity: number;
  transaction_date: string;
  transaction_type: string;
  asset_type?: string | null;
}

interface DividendMonthlyTableProps {
  assetsData: AssetDividendData[];
  loading?: boolean;
}

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type PeriodFilter = "current_year" | "12_months" | "all";
type DisplayMode = "value" | "yield";

export function DividendMonthlyTable({ assetsData, loading = false }: DividendMonthlyTableProps) {
  const [showFilter, setShowFilter] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [selectedTickers, setSelectedTickers] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>("value");
  const [transactions, setTransactions] = useState<TransactionData[]>([]);
  const [assetPrices, setAssetPrices] = useState<Map<string, number>>(new Map());

  // Fetch user transactions
  useEffect(() => {
    const fetchTransactions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("investment_transactions")
        .select("ticker, quantity, transaction_date, transaction_type, asset_type")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: true });

      if (!error && data) {
        setTransactions(data);
      }
    };

    fetchTransactions();
  }, [assetsData]);

  // Fetch current prices for yield calculation
  useEffect(() => {
    const fetchPrices = async () => {
      if (assetsData.length === 0) return;

      const tickers = assetsData.map(a => a.ticker);
      const { data, error } = await supabase
        .from("financial_assets")
        .select("ticker, current_price")
        .in("ticker", tickers);

      if (!error && data) {
        const priceMap = new Map<string, number>();
        data.forEach(asset => {
          if (asset.current_price) {
            priceMap.set(asset.ticker, asset.current_price);
          }
        });
        setAssetPrices(priceMap);
      }
    };

    fetchPrices();
  }, [assetsData]);

  // Get unique tickers and asset types
  const availableTickers = useMemo(() => {
    return [...new Set(assetsData.map(a => a.ticker.replace(".SA", "")))];
  }, [assetsData]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    transactions.forEach(tx => {
      if (tx.asset_type) types.add(tx.asset_type);
    });
    return Array.from(types);
  }, [transactions]);

  // Calculate quantity held at a specific date for a ticker
  const getQuantityAtDate = (ticker: string, date: Date): number => {
    const normalizedTicker = ticker.replace(".SA", "");
    let quantity = 0;

    const sortedTxs = transactions
      .filter(tx => tx.ticker.replace(".SA", "") === normalizedTicker)
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());

    for (const tx of sortedTxs) {
      const txDate = new Date(tx.transaction_date);
      if (txDate > date) break;

      if (tx.transaction_type === "buy") {
        quantity += tx.quantity;
      } else if (tx.transaction_type === "sell") {
        quantity -= tx.quantity;
      }
    }

    return Math.max(0, quantity);
  };

  // Filter assets by selected tickers and types
  const filteredAssetsData = useMemo(() => {
    let filtered = assetsData;

    if (selectedTickers.length > 0) {
      filtered = filtered.filter(a => 
        selectedTickers.includes(a.ticker.replace(".SA", ""))
      );
    }

    if (selectedTypes.length > 0) {
      const tickersByType = new Set<string>();
      transactions.forEach(tx => {
        if (tx.asset_type && selectedTypes.includes(tx.asset_type)) {
          tickersByType.add(tx.ticker.replace(".SA", ""));
        }
      });
      filtered = filtered.filter(a => 
        tickersByType.has(a.ticker.replace(".SA", ""))
      );
    }

    return filtered;
  }, [assetsData, selectedTickers, selectedTypes, transactions]);

  // Process data grouped by year and month with quantity multiplication
  const { yearlyData, years, maxValue } = useMemo(() => {
    const dataByYear: Record<number, Record<number, number>> = {};
    let max = 0;
    const now = new Date();
    const currentYear = now.getFullYear();
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    filteredAssetsData.forEach(asset => {
      if (!asset.dividendHistory || !Array.isArray(asset.dividendHistory)) return;

      asset.dividendHistory.forEach(div => {
        if (!div.date || typeof div.amount !== "number") return;

        const date = new Date(div.date);
        const year = date.getFullYear();
        const month = date.getMonth();

        // Apply period filter
        if (periodFilter === "current_year" && year !== currentYear) return;
        if (periodFilter === "12_months" && date < twelveMonthsAgo) return;

        // Get quantity at dividend date
        const quantity = getQuantityAtDate(asset.ticker, date);
        if (quantity === 0) return;

        // Calculate value based on display mode
        let value: number;
        if (displayMode === "yield") {
          const price = assetPrices.get(asset.ticker) || 1;
          value = (div.amount / price) * 100 * quantity;
        } else {
          value = div.amount * quantity;
        }

        if (!dataByYear[year]) {
          dataByYear[year] = {};
        }

        dataByYear[year][month] = (dataByYear[year][month] || 0) + value;

        if (dataByYear[year][month] > max) {
          max = dataByYear[year][month];
        }
      });
    });

    const sortedYears = Object.keys(dataByYear)
      .map(Number)
      .sort((a, b) => b - a);

    return { yearlyData: dataByYear, years: sortedYears, maxValue: max };
  }, [filteredAssetsData, periodFilter, displayMode, transactions, assetPrices]);

  const formatValue = (value: number) => {
    if (value === 0) return "-";
    if (displayMode === "yield") {
      return `${value.toFixed(2)}%`;
    }
    return value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const getIntensityClass = (value: number): string => {
    if (value === 0 || maxValue === 0) return "";
    const ratio = value / maxValue;

    if (ratio > 0.75) return "bg-primary/30";
    if (ratio > 0.5) return "bg-primary/20";
    if (ratio > 0.25) return "bg-primary/10";
    return "bg-primary/5";
  };

  const getYearStats = (year: number) => {
    const yearData = yearlyData[year] || {};
    const values = Object.values(yearData).filter(v => v > 0);

    if (values.length === 0) {
      return { average: 0, total: 0, variation: 0 };
    }

    const total = values.reduce((sum, v) => sum + v, 0);
    const average = total / 12;

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

  const handleTickerToggle = (ticker: string) => {
    setSelectedTickers(prev =>
      prev.includes(ticker)
        ? prev.filter(t => t !== ticker)
        : [...prev, ticker]
    );
  };

  const handleTypeToggle = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedTickers([]);
    setSelectedTypes([]);
    setPeriodFilter("all");
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

  if (years.length === 0 && assetsData.length === 0) {
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
          <Popover open={showFilter} onOpenChange={setShowFilter}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  (selectedTickers.length > 0 || selectedTypes.length > 0 || periodFilter !== "all") &&
                    "border-primary text-primary"
                )}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filtrar
                {(selectedTickers.length > 0 || selectedTypes.length > 0) && (
                  <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 text-xs">
                    {selectedTickers.length + selectedTypes.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Período</Label>
                  <Select
                    value={periodFilter}
                    onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo histórico</SelectItem>
                      <SelectItem value="current_year">Ano atual</SelectItem>
                      <SelectItem value="12_months">Últimos 12 meses</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {availableTypes.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Tipo de Ativo</Label>
                    <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                      {availableTypes.map(type => (
                        <div key={type} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${type}`}
                            checked={selectedTypes.includes(type)}
                            onCheckedChange={() => handleTypeToggle(type)}
                          />
                          <label
                            htmlFor={`type-${type}`}
                            className="text-sm cursor-pointer"
                          >
                            {type}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {availableTickers.length > 0 && (
                  <div>
                    <Label className="text-sm font-medium">Ativos</Label>
                    <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                      {availableTickers.map(ticker => (
                        <div key={ticker} className="flex items-center space-x-2">
                          <Checkbox
                            id={`ticker-${ticker}`}
                            checked={selectedTickers.includes(ticker)}
                            onCheckedChange={() => handleTickerToggle(ticker)}
                          />
                          <label
                            htmlFor={`ticker-${ticker}`}
                            className="text-sm cursor-pointer font-mono"
                          >
                            {ticker}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="w-full"
                >
                  Limpar filtros
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button
            variant={displayMode === "value" ? "default" : "outline"}
            size="sm"
            onClick={() => setDisplayMode(displayMode === "value" ? "yield" : "value")}
          >
            {displayMode === "value" ? (
              <>
                <DollarSign className="h-4 w-4 mr-1" />
                Valor
              </>
            ) : (
              <>
                <Percent className="h-4 w-4 mr-1" />
                Yield
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {years.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum resultado encontrado com os filtros selecionados.
          </p>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}
