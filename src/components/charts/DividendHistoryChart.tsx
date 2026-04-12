import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface DividendData {
  month: string;
  yieldOnCost: number;
  totalDividends: number;
  assets: {
    symbol: string;
    amount: number;
  }[];
}

interface DividendHistoryChartProps {
  data?: DividendData[];
  loading?: boolean;
}

const DividendHistoryChart = ({
  data = [],
  loading = false,
}: DividendHistoryChartProps) => {
  const [period, setPeriod] = useState("12m");
  const [groupBy, setGroupBy] = useState("monthly");

  let months = 12;
  if (period === "6m") months = 6;
  if (period === "24m") months = 24;
  if (period === "all") months = 120; // up to 10 years

  const filteredData = data && data.length > 0 ? data.slice(-months) : [];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  // Get top dividend paying assets for the period
  const topDividendAssets = filteredData
    .flatMap((d) => d.assets)
    .reduce(
      (acc, asset) => {
        acc[asset.symbol] = (acc[asset.symbol] || 0) + asset.amount;
        return acc;
      },
      {} as Record<string, number>,
    );

  const sortedAssets = Object.entries(topDividendAssets)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([symbol, amount]) => ({ symbol, amount }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Proventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">
              Carregando dados...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dividend Yield Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap">
          <CardTitle>Histórico de Proventos</CardTitle>
          <div className="flex gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6m">6 meses</SelectItem>
                <SelectItem value="12m">12 meses</SelectItem>
                <SelectItem value="24m">24 meses</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Mensal</SelectItem>
                <SelectItem value="quarterly">Trimestral</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredData.length > 0 ? filteredData : []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" tickFormatter={formatPercent} />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={formatCurrency}
              />
              <Tooltip
                formatter={(value: number, name: string) => {
                  if (name === "Total de Proventos")
                    return [formatCurrency(value), name];
                  return [formatPercent(value), name];
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="yieldOnCost"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Yield on Cost (%)"
                dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
              />
              <Bar
                yAxisId="right"
                dataKey="totalDividends"
                fill="#10b981"
                name="Total de Proventos"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      {/* Top Dividend Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Maiores Pagadores de Proventos</CardTitle>
          <p className="text-sm text-muted-foreground">
            Proventos de{" "}
            {new Date().toLocaleDateString("pt-BR", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sortedAssets.map((asset, index) => (
              <div
                key={asset.symbol}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="w-12 text-center">
                    {index + 1}º
                  </Badge>
                  <div>
                    <p className="font-medium">{asset.symbol}</p>
                    <p className="text-sm text-muted-foreground">
                      {asset.symbol.includes("11") ? "FII" : "Ação"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(asset.amount)}</p>
                  <p className="text-sm text-muted-foreground">
                    {(
                      (asset.amount /
                        sortedAssets.reduce((sum, a) => sum + a.amount, 0)) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DividendHistoryChart;
