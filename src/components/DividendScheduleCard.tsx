import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, PieChart as PieChartIcon, List } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

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
  transaction_date: string;
  transaction_type: string;
}

interface Props {
  data?: AssetDividendData[];
  loading?: boolean;
}

const normalize = (t: string) => t.replace(".SA", "").toUpperCase();

const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);

const formatDate = (d: Date) =>
  `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

const COLORS = [
  "#2563eb", "#10b981", "#f97316", "#8b5cf6", "#ef4444",
  "#0ea5e9", "#eab308", "#ec4899", "#14b8a6", "#f43f5e",
  "#6366f1", "#84cc16",
];

export function DividendScheduleCard({ data = [], loading = false }: Props) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState<"list" | "chart">("list");
  const [cursor, setCursor] = useState<Date>(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data: txs } = await supabase
        .from("investment_transactions")
        .select("ticker, quantity, transaction_date, transaction_type")
        .eq("user_id", user.id);
      if (txs) setTransactions(txs as Transaction[]);
    };
    load();
  }, [user, data]);

  const monthStart = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth(), 1),
    [cursor],
  );
  const monthEnd = useMemo(
    () => new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59),
    [cursor],
  );

  const rows = useMemo(() => {
    const list: { ticker: string; date: Date; value: number }[] = [];

    data.forEach((asset) => {
      const ticker = normalize(asset.ticker);
      const txs = transactions
        .filter((t) => normalize(t.ticker) === ticker)
        .sort(
          (a, b) =>
            new Date(a.transaction_date).getTime() -
            new Date(b.transaction_date).getTime(),
        );

      (asset.dividendHistory || []).forEach((d) => {
        if (!d?.date) return;
        const dd = new Date(d.date);
        if (dd < monthStart || dd > monthEnd) return;

        let q = 0;
        for (const t of txs) {
          const td = new Date(t.transaction_date);
          if (td > dd) break;
          if (
            t.transaction_type === "buy" ||
            t.transaction_type === "bonus" ||
            t.transaction_type === "split"
          ) {
            q += t.quantity;
          } else if (
            t.transaction_type === "sell" ||
            t.transaction_type === "grouping"
          ) {
            q -= t.quantity;
          }
        }
        q = Math.max(0, q);
        if (q <= 0) return;

        const value = (d.amount || 0) * q;
        if (value <= 0) return;

        list.push({ ticker, date: dd, value });
      });
    });

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data, transactions, monthStart, monthEnd]);

  const total = rows.reduce((s, r) => s + r.value, 0);
  const label = `${String(cursor.getMonth() + 1).padStart(2, "0")}/${cursor.getFullYear()}`;

  const move = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const chartData = useMemo(() => {
    const byTicker = new Map<string, number>();
    rows.forEach((r) => byTicker.set(r.ticker, (byTicker.get(r.ticker) || 0) + r.value));
    return Array.from(byTicker.entries())
      .map(([ticker, value]) => ({ ticker, value }))
      .sort((a, b) => b.value - a.value);
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agenda de dividendos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <Button variant="outline" size="icon" onClick={() => move(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="px-3 py-1 rounded border text-sm font-medium min-w-[88px] text-center">
            {label}
          </div>
          <Button variant="outline" size="icon" onClick={() => move(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setView(view === "list" ? "chart" : "list")}
          >
            {view === "list" ? (
              <>
                <PieChartIcon className="h-4 w-4 mr-1" />
                Gráfico
              </>
            ) : (
              <>
                <List className="h-4 w-4 mr-1" />
                Lista
              </>
            )}
          </Button>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground">
            Carregando...
          </div>
        ) : rows.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
            Sem proventos agendados para {label}.
          </div>
        ) : view === "list" ? (
          <>
            <div className="grid grid-cols-[auto_1fr_auto] gap-x-3 gap-y-2 text-sm">
              <div className="text-muted-foreground font-medium">Ativo</div>
              <div className="text-muted-foreground font-medium text-center">Pagamento</div>
              <div className="text-muted-foreground font-medium text-right">Valor</div>
              {rows.map((r, i) => (
                <div key={i} className="contents">
                  <div>
                    <Badge variant="outline" className="font-mono">{r.ticker}</Badge>
                  </div>
                  <div className="text-center tabular-nums self-center">
                    {formatDate(r.date)}
                  </div>
                  <div className="text-right tabular-nums self-center">
                    {formatBRL(r.value)}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 border-t pt-4 text-center">
              <div className="text-2xl font-bold text-primary tabular-nums">
                {formatBRL(total)}
              </div>
              <div className="text-xs text-muted-foreground tracking-wider mt-1">TOTAL</div>
            </div>
          </>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="ticker"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={(e: any) => e.ticker}
                  labelLine={false}
                >
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconSize={8} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 border-t pt-4 text-center">
              <div className="text-2xl font-bold text-primary tabular-nums">
                {formatBRL(total)}
              </div>
              <div className="text-xs text-muted-foreground tracking-wider mt-1">TOTAL</div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default DividendScheduleCard;