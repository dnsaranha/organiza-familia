import { useMemo, useState } from "react";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PortfolioEvolutionData {
  month: string;
  profitability: number;
  cdi: number;
  marketValue: number;
  operations?: number;
  costs?: number;
  dividends?: number;
}

interface PortfolioEvolutionChartProps {
  data?: PortfolioEvolutionData[];
  loading?: boolean;
  onPeriodChange?: (period: string) => void;
}

const PERIOD_OPTIONS = [
  { label: "6M", value: "6m", count: 6 },
  { label: "12M", value: "12m", count: 12 },
  { label: "24M", value: "24m", count: 24 },
  { label: "5A", value: "5y", count: 60 },
  { label: "Tudo", value: "all", count: 999 },
];

export const PortfolioEvolutionChart = ({
  data = [],
  loading = false,
  onPeriodChange,
}: PortfolioEvolutionChartProps) => {
  const [period, setPeriod] = useState("12m");

  const handlePeriodSelect = (val: string) => {
    setPeriod(val);
    if (onPeriodChange) {
      onPeriodChange(val);
    }
  };

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    const option = PERIOD_OPTIONS.find((o) => o.value === period);
    const count = option ? option.count : 12;
    if (count >= data.length) return data;
    return data.slice(-count);
  }, [data, period]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader className="py-4">
          <CardTitle className="text-base font-semibold">Rentabilidade Histórica</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground text-sm">
              Carregando histórico de rentabilidade...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-card border">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-3">
        <div>
          <CardTitle className="text-base font-semibold">Rentabilidade Histórica</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Comparativo de retorno acumulado vs. CDI
          </p>
        </div>

        {/* Quick Period Filter Pills */}
        <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-lg self-start sm:self-center">
          {PERIOD_OPTIONS.map((opt) => (
            <Button
              key={opt.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handlePeriodSelect(opt.value)}
              className={cn(
                "h-7 px-2.5 text-xs font-medium rounded-md transition-all",
                period === opt.value
                  ? "bg-background text-foreground shadow-xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {filteredData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-xs text-muted-foreground">
            Nenhum dado histórico registrado no período selecionado.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={filteredData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={formatPercent}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={formatCurrency}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={70}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border border-border rounded-lg p-2.5 shadow-md text-xs space-y-1">
                        <p className="font-semibold text-popover-foreground border-b pb-1 mb-1">
                          {label}
                        </p>
                        {payload.map((entry: any, index: number) => (
                          <div key={`item-${index}`} className="flex justify-between gap-3 items-center">
                            <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                              {entry.name}:
                            </span>
                            <span className="font-semibold text-popover-foreground">
                              {entry.dataKey === "marketValue"
                                ? formatCurrency(entry.value)
                                : formatPercent(entry.value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                iconType="circle"
                iconSize={7}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="profitability"
                stroke="#10b981"
                strokeWidth={2.5}
                name="Rentabilidade"
                dot={{ fill: "#10b981", strokeWidth: 1.5, r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cdi"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="4 4"
                name="CDI"
                dot={{ fill: "#f97316", strokeWidth: 1, r: 2.5 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="marketValue"
                stroke="#6366f1"
                strokeWidth={1.5}
                name="Valor de Mercado"
                dot={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default PortfolioEvolutionChart;
