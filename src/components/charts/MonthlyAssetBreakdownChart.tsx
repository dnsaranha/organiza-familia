import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DividendEntry {
  date: string;
  amount: number;
}

interface AssetDividendData {
  ticker: string;
  dividendHistory: DividendEntry[];
}

interface Transaction {
  ticker: string;
  quantity: number;
  price: number;
  fees: number | null;
  transaction_date: string;
  transaction_type: string;
}

interface FinancialAssetRow {
  ticker: string;
  current_price: number | null;
  price_history: any;
}

interface Props {
  data?: AssetDividendData[];
  userAssets?: any[];
  loading?: boolean;
}

const formatCompactCurrency = (v: number) => {
  if (Math.abs(v) >= 1000000) return `R$ ${(v / 1000000).toFixed(1)}M`;
  if (Math.abs(v) >= 1000) return `R$ ${(v / 1000).toFixed(0)}k`;
  return `R$ ${Math.round(v)}`;
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(v);

const normalize = (t: string) => (t || "").replace(".SA", "").toUpperCase().trim();

const MonthlyAssetBreakdownChart = ({ data = [], userAssets = [], loading = false }: Props) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [assets, setAssets] = useState<FinancialAssetRow[]>([]);
  const [cursor, setCursor] = useState<Date>(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const [{ data: txs }, { data: fa }] = await Promise.all([
        supabase
          .from("investment_transactions")
          .select("ticker, quantity, price, fees, transaction_date, transaction_type")
          .eq("user_id", user.id),
        supabase
          .from("financial_assets")
          .select("ticker, current_price, price_history"),
      ]);
      if (txs) setTransactions(txs as Transaction[]);
      if (fa) setAssets(fa as FinancialAssetRow[]);
    };
    load();
  }, [user, data]);

  const dividendByTicker = useMemo(() => {
    const m = new Map<string, DividendEntry[]>();
    data.forEach((a) => m.set(normalize(a.ticker), a.dividendHistory || []));
    return m;
  }, [data]);

  const priceByTicker = useMemo(() => {
    const m = new Map<string, { current: number | null; history: any[] }>();
    assets.forEach((a) =>
      m.set(normalize(a.ticker), {
        current: a.current_price,
        history: Array.isArray(a.price_history) ? a.price_history : [],
      }),
    );
    return m;
  }, [assets]);

  const monthEnd = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59),
    [cursor],
  );
  const monthStart = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor],
  );

  const chartData = useMemo(() => {
    const tickers = new Set<string>();
    transactions.forEach((t) => tickers.add(normalize(t.ticker)));
    dividendByTicker.forEach((_v, k) => tickers.add(k));

    const rows = Array.from(tickers).map((ticker) => {
      const txs = transactions
        .filter((t) => normalize(t.ticker) === ticker)
        .sort(
          (a, b) =>
            new Date(a.transaction_date).getTime() -
            new Date(b.transaction_date).getTime(),
        );

      // quantity & cost basis up to monthEnd
      let qty = 0;
      let cost = 0;
      let operations = 0;
      for (const t of txs) {
        const d = new Date(t.transaction_date);
        if (d > monthEnd) break;
        const inMonth = d >= monthStart && d <= monthEnd;
        if (t.transaction_type === "buy") {
          const c = t.quantity * t.price + (t.fees || 0);
          cost += c;
          qty += t.quantity;
          if (inMonth) operations += c;
        } else if (t.transaction_type === "sell") {
          if (qty > 0) {
            const avg = cost / qty;
            cost -= avg * t.quantity;
            qty -= t.quantity;
          }
          if (inMonth) operations -= t.quantity * t.price;
        } else if (t.transaction_type === "split" || t.transaction_type === "bonus") {
          qty += t.quantity;
        } else if (t.transaction_type === "grouping") {
          qty = Math.max(qty - t.quantity, 0);
          if (qty === 0) cost = 0;
        }
      }

      // price at month end
      const priceInfo = priceByTicker.get(ticker);
      let price = 0;
      if (priceInfo) {
        const entry = priceInfo.history.find((h: any) => {
          if (!h?.date) return false;
          const hd = new Date(h.date);
          return (
            hd.getFullYear() === cursor.getFullYear() &&
            hd.getMonth() === cursor.getMonth()
          );
        });
        if (entry && typeof entry.close === "number") price = entry.close;
        else if (priceInfo.current && cursor.getMonth() === new Date().getMonth() && cursor.getFullYear() === new Date().getFullYear()) {
          price = priceInfo.current;
        } else if (qty > 0 && cost > 0) {
          price = cost / qty;
        }
      }
      const marketValue = qty * price;

      // dividends paid this month (per unit) × qty held at dividend record date
      const divs = dividendByTicker.get(ticker) || [];
      let proventos = 0;
      let proventosAcumulados = 0;
      for (const d of divs) {
        const payDateStr = (d as any).paymentDate || (d as any).payment_date || d.date;
        const recDateStr = (d as any).recordDate || (d as any).record_date || d.date;
        const dd = new Date(payDateStr);
        const recDate = new Date(recDateStr);
        if (dd > monthEnd) continue;
        // qty held at record date
        let q = 0;
        if (txs.length > 0) {
          const firstTxDate = new Date(txs[0].transaction_date);
          if (recDate >= firstTxDate) {
            for (const t of txs) {
              const td = new Date(t.transaction_date);
              if (td > recDate) break;
              if (t.transaction_type === "buy" || t.transaction_type === "bonus" || t.transaction_type === "split") q += t.quantity;
              else if (t.transaction_type === "sell" || t.transaction_type === "grouping") q -= t.quantity;
            }
          }
        } else if (Array.isArray(userAssets) && userAssets.length > 0) {
          const held = userAssets.find(a => normalize(a.symbol || a.ticker || "") === ticker);
          if (held && Number(held.quantity) > 0) {
            const diffYears = new Date().getFullYear() - recDate.getFullYear();
            if (diffYears <= 1) {
              q = Number(held.quantity);
            }
          }
        }
        q = Math.max(0, q);
        const val = (d.amount || 0) * q;
        proventosAcumulados += val;
        if (dd >= monthStart) proventos += val;
      }

      return {
        ticker,
        marketValue: Number(marketValue.toFixed(2)),
        cost: Number(cost.toFixed(2)),
        proventos: Number(proventos.toFixed(2)),
        proventosAcumulados: Number(proventosAcumulados.toFixed(2)),
        operations: Number(operations.toFixed(2)),
        _total: marketValue,
      };
    });

    return rows
      .filter((r) => r.marketValue !== 0 || r.cost !== 0 || r.proventos !== 0 || r.proventosAcumulados !== 0 || r.operations !== 0)
      .sort((a, b) => b._total - a._total);
  }, [transactions, dividendByTicker, priceByTicker, monthStart, monthEnd, cursor]);

  const label = `${String(cursor.getMonth() + 1).padStart(2, "0")}/${cursor.getFullYear()}`;

  const move = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <Card className="border">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold">Operações e Proventos</CardTitle>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => move(-1)}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <div className="px-2.5 py-0.5 rounded border text-xs font-mono font-medium min-w-[70px] text-center bg-muted/40">
            {label}
          </div>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => move(1)}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-1">
        {loading ? (
          <div className="h-72 flex items-center justify-center">
            <div className="animate-pulse text-xs text-muted-foreground">Carregando dados...</div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-xs text-muted-foreground">
            Nenhum dado para {label}.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 32 + 40)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 12, left: -8, bottom: 4 }}
              barCategoryGap={4}
              barGap={1}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.25} />
              <XAxis
                type="number"
                tickFormatter={formatCompactCurrency}
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis
                type="category"
                dataKey="ticker"
                width={50}
                tick={{ fontSize: 10, fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              />
              <Bar dataKey="marketValue" stackId="patrimonio" name="Valor de mercado" fill="#3b82f6" radius={[0, 3, 3, 0]} barSize={6} />
              <Bar dataKey="proventosAcumulados" stackId="patrimonio" name="Proventos acumulados" fill="#1d4ed8" radius={[0, 3, 3, 0]} barSize={6} />
              <Bar dataKey="cost" name="Custo" fill="#f97316" radius={[0, 3, 3, 0]} barSize={6} />
              <Bar dataKey="proventos" name="Proventos (mês)" fill="#10b981" radius={[0, 3, 3, 0]} barSize={6} />
              <Bar dataKey="operations" name="Operações" fill="#8b5cf6" radius={[0, 3, 3, 0]} barSize={6} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthlyAssetBreakdownChart;