import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
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
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
}

interface DividendHistoryChartProps {
  data?: AssetDividendData[];
  loading?: boolean;
}

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const DividendHistoryChart = ({
  data = [],
  loading = false,
}: DividendHistoryChartProps) => {
  const [period, setPeriod] = useState<"6m" | "12m" | "24m" | "all">("12m");
  const [transactions, setTransactions] = useState<TransactionData[]>([]);

  useEffect(() => {
    const fetchTransactions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: txs } = await supabase
        .from("investment_transactions")
        .select("ticker, quantity, transaction_date, transaction_type")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: true });
      if (txs) setTransactions(txs);
    };
    fetchTransactions();
  }, [data]);

  const getQuantityAtDate = (ticker: string, date: Date): number => {
    const normalized = ticker.replace(".SA", "");
    let qty = 0;
    const sorted = transactions
      .filter(tx => tx.ticker.replace(".SA", "") === normalized)
      .sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime());
    for (const tx of sorted) {
      if (new Date(tx.transaction_date) > date) break;
      if (tx.transaction_type === "buy" || tx.transaction_type === "bonus" || tx.transaction_type === "split") {
        qty += tx.quantity;
      } else if (tx.transaction_type === "sell" || tx.transaction_type === "grouping") {
        qty -= tx.quantity;
      }
    }
    return Math.max(0, qty);
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  const { chartData, topAssets } = useMemo(() => {
    const monthMap = new Map<string, { total: number; assets: Record<string, number> }>();
    const assetTotals: Record<string, number> = {};

    const now = new Date();
    let cutoff: Date | null = null;
    if (period === "6m") cutoff = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    else if (period === "12m") cutoff = new Date(now.getFullYear(), now.getMonth() - 11, 1);
    else if (period === "24m") cutoff = new Date(now.getFullYear(), now.getMonth() - 23, 1);

    data.forEach(asset => {
      if (!Array.isArray(asset.dividendHistory)) return;
      asset.dividendHistory.forEach(div => {
        if (!div.date || typeof div.amount !== "number") return;
        const date = new Date(div.date);
        if (cutoff && date < cutoff) return;

        const qty = getQuantityAtDate(asset.ticker, date);
        if (qty === 0) return;

        const value = div.amount * qty;
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        const symbol = asset.ticker.replace(".SA", "");

        if (!monthMap.has(key)) monthMap.set(key, { total: 0, assets: {} });
        const entry = monthMap.get(key)!;
        entry.total += value;
        entry.assets[symbol] = (entry.assets[symbol] || 0) + value;
        assetTotals[symbol] = (assetTotals[symbol] || 0) + value;
      });
    });

    const sortedKeys = Array.from(monthMap.keys()).sort();
    const chart = sortedKeys.map(key => {
      const [y, m] = key.split("-");
      const entry = monthMap.get(key)!;
      return {
        month: `${months[Number(m) - 1]}/${y.slice(2)}`,
        totalDividends: Number(entry.total.toFixed(2)),
      };
    });

    const top = Object.entries(assetTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([symbol, amount]) => ({ symbol, amount }));

    return { chartData: chart, topAssets: top };
  }, [data, transactions, period]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Proventos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Carregando dados...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const topTotal = topAssets.reduce((s, a) => s + a.amount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle>Histórico de Proventos</CardTitle>
          <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
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
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Nenhum provento no período selecionado.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(v) => formatCurrency(v)} width={90} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), "Proventos"]}
                />
                <Legend />
                <Bar dataKey="totalDividends" fill="hsl(var(--primary))" name="Proventos do mês" />
                <Line
                  type="monotone"
                  dataKey="totalDividends"
                  stroke="hsl(var(--chart-2, var(--primary)))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name="Tendência"
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {topAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Maiores Pagadores de Proventos</CardTitle>
            <p className="text-sm text-muted-foreground">Período selecionado</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAssets.map((asset, index) => (
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
                      {topTotal > 0 ? ((asset.amount / topTotal) * 100).toFixed(1) : "0.0"}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DividendHistoryChart;
