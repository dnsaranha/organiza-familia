import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
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
import { useState } from "react";

interface PortfolioEvolutionData {
  month: string;
  profitability: number;
  cdi: number;
  marketValue: number;
  operations: number;
  costs: number;
  dividends: number;
}

interface PortfolioEvolutionChartProps {
  data?: PortfolioEvolutionData[];
  loading?: boolean;
}

const PortfolioEvolutionChart = ({
  data = [],
  loading = false,
}: PortfolioEvolutionChartProps) => {
  const [period, setPeriod] = useState("12m");

  const filteredData = data && data.length > 0 ? data.slice(-12) : []; // Default to last 12 months

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => `${value.toFixed(2)}%`;

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução Patrimonial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <div className="animate-pulse text-muted-foreground">
                Carregando dados...
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Evolution Chart */}
      <Card className="w-full h-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Rentabilidade Histórica</CardTitle>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6m">6 meses</SelectItem>
              <SelectItem value="12m">12 meses</SelectItem>
              <SelectItem value="5y">5 anos</SelectItem>
              <SelectItem value="all">Desde o início</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={filteredData.length > 0 ? filteredData : []}>
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
                  if (name === "Valor de Mercado")
                    return [formatCurrency(value), name];
                  return [formatPercent(value), name];
                }}
              />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="profitability"
                stroke="#2563eb"
                strokeWidth={2}
                name="Rentabilidade"
                dot={{ fill: "#2563eb", strokeWidth: 2, r: 4 }}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cdi"
                stroke="#f97316"
                strokeWidth={2}
                name="CDI"
                dot={{ fill: "#f97316", strokeWidth: 2, r: 4 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="marketValue"
                stroke="#6b7280"
                strokeWidth={2}
                name="Valor de Mercado"
                dot={{ fill: "#6b7280", strokeWidth: 2, r: 4 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default PortfolioEvolutionChart;
