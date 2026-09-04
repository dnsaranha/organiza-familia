import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronLeft, ChevronRight, PieChart as PieChartIcon, List, CalendarCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mapInvestmentType } from "@/lib/investment-mapping";
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
  type?: string;
  payment_date?: string;
  record_date?: string;
  status?: string;
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
  assets?: any[];
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

// Helper to provide consistent labels for manual asset types
const assetTypeLabels: { [key: string]: string } = {
  STOCK: "Ação",
  FII: "FII",
  FIXED_INCOME: "Renda Fixa",
  CRYPTO: "Cripto",
  OTHER: "Outro",
};

// Gets a unified, user-friendly display type for any asset
const getAssetDisplayType = (asset: any): string => {
  if (asset?.asset_type) {
    return assetTypeLabels[asset.asset_type] || asset.asset_type;
  }
  if (asset?.type) {
    return mapInvestmentType(asset.type, asset.subtype).label_pt;
  }
  return "Outro";
};

// Expanded color palette for better visualization
const COLORS = [
  "#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF",
  "#FF3D3D", "#A43E7A", "#2E8B57", "#4682B4", "#D2691E",
  "#FF69B4", "#6A5ACD", "#B8860B", "#800000", "#008080"
];

export function DividendScheduleCard({ data = [], assets = [], loading = false }: Props) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [view, setView] = useState<"list" | "chart">("list");
  // Default to true so it shows each individual asset's receivable slice
  const [showByAsset, setShowByAsset] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "received" | "announced">("all");
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

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const rows = useMemo(() => {
    const list: {
      ticker: string;
      date: Date;
      value: number;
      amountPerShare: number;
      quantity: number;
      isAnnounced: boolean;
      type?: string;
    }[] = [];

    data.forEach((asset) => {
      const ticker = normalize(asset.ticker);
      const txs = transactions
        .filter((t) => normalize(t.ticker) === ticker)
        .sort(
          (a, b) =>
            new Date(a.transaction_date).getTime() -
            new Date(b.transaction_date).getTime(),
        );

      // Fallback quantity from enhancedAssets if user holds current position
      const fallbackAsset = assets.find((a) => normalize(a.symbol || a.ticker || "") === ticker);
      const fallbackQty = fallbackAsset ? Number(fallbackAsset.quantity) || 0 : 0;

      (asset.dividendHistory || []).forEach((d) => {
        const payDateStr = (d as any).paymentDate || d.payment_date || d.date;
        if (!payDateStr) return;
        const dd = new Date(payDateStr);
        if (dd < monthStart || dd > monthEnd) return;

        const recDateStr = (d as any).recordDate || d.record_date || payDateStr;
        const recDate = new Date(recDateStr);

        let q = 0;
        if (txs.length > 0) {
          const firstTxDate = new Date(txs[0].transaction_date);
          if (recDate >= firstTxDate) {
            for (const t of txs) {
              const td = new Date(t.transaction_date);
              if (td > recDate) break;
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
          }
        } else if (fallbackQty > 0) {
          // If no transactions exist (e.g. Open Banking connection without transactions), only apply to recent events
          const diffYears = new Date().getFullYear() - recDate.getFullYear();
          if (diffYears <= 1) {
            q = fallbackQty;
          }
        }

        q = Math.max(0, q);
        if (q <= 0) return;

        const value = (d.amount || 0) * q;
        if (value <= 0) return;

        // Is planned/announced if date is in the future or status explicitly says announced
        const isAnnounced = dd >= today || d.status === "announced";

        list.push({
          ticker,
          date: dd,
          value,
          amountPerShare: d.amount || 0,
          quantity: q,
          isAnnounced,
          type: d.type,
        });
      });
    });

    return list.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data, transactions, assets, monthStart, monthEnd, today]);

  const totalReceived = useMemo(
    () => rows.filter((r) => !r.isAnnounced).reduce((s, r) => s + r.value, 0),
    [rows],
  );

  const totalAnnounced = useMemo(
    () => rows.filter((r) => r.isAnnounced).reduce((s, r) => s + r.value, 0),
    [rows],
  );

  const total = totalReceived + totalAnnounced;

  const label = cursor.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const move = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const chartRows = useMemo(() => {
    if (statusFilter === "received") {
      return rows.filter((r) => !r.isAnnounced);
    }
    if (statusFilter === "announced") {
      return rows.filter((r) => r.isAnnounced);
    }
    return rows;
  }, [rows, statusFilter]);

  const { chartData, totalValue } = useMemo(() => {
    if (!chartRows || chartRows.length === 0) {
      return { chartData: [], totalValue: 0 };
    }

    const allocation = chartRows.reduce((acc, row) => {
      // Group by individual asset symbol if toggled, otherwise by asset type
      let key = row.ticker;
      if (!showByAsset) {
        const found = assets.find((a) => normalize(a.symbol || a.ticker || "") === row.ticker);
        if (found) {
          key = getAssetDisplayType(found);
        } else if (row.ticker.endsWith("11")) {
          key = "FII";
        } else if (
          row.ticker.endsWith("3") ||
          row.ticker.endsWith("4") ||
          row.ticker.endsWith("5") ||
          row.ticker.endsWith("6")
        ) {
          key = "Ação";
        } else {
          key = "Outro";
        }
      }

      if (!acc[key]) {
        acc[key] = { name: key, value: 0 };
      }
      acc[key].value += row.value;
      return acc;
    }, {} as { [key: string]: { name: string; value: number } });

    // Sort data from largest to smallest for a consistent and readable chart
    const sortedChartData = Object.values(allocation).sort((a, b) => b.value - a.value);

    return {
      chartData: sortedChartData,
      totalValue: sortedChartData.reduce((sum, item) => sum + item.value, 0),
    };
  }, [chartRows, showByAsset, assets]);

  // Custom tooltip component for detailed info on hover/touch
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      const percentage = totalValue > 0 ? (dataPoint.value / totalValue) * 100 : 0;
      return (
        <div className="bg-background/95 backdrop-blur-sm p-2.5 border border-border rounded-md shadow-lg space-y-1">
          <p className="font-semibold text-xs text-foreground">{dataPoint.name}</p>
          <p className="text-xs text-muted-foreground">
            Valor Recebido: <span className="font-semibold text-foreground">{formatBRL(dataPoint.value)}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Porcentagem: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{percentage.toFixed(1)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="border shadow-card">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 gap-2">
        <div>
          <CardTitle className="text-base font-semibold">Agenda de Proventos</CardTitle>
          <p className="text-xs text-muted-foreground capitalize">{label}</p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => move(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs font-semibold px-2"
            onClick={() => {
              const n = new Date();
              setCursor(new Date(n.getFullYear(), n.getMonth(), 1));
            }}
          >
            Mês Atual
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => move(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>

          <div className="border-l h-5 mx-1" />

          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setView(view === "list" ? "chart" : "list")}
          >
            {view === "list" ? (
              <>
                <PieChartIcon className="h-3.5 w-3.5" />
                <span>Gráfico</span>
              </>
            ) : (
              <>
                <List className="h-3.5 w-3.5" />
                <span>Lista</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Monthly Summary Badges - Interactive filters */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              statusFilter === "all"
                ? "bg-primary/10 border-primary/50 shadow-xs ring-1 ring-primary/40"
                : "bg-muted/40 border-transparent hover:bg-muted/70"
            }`}
          >
            <span className="text-muted-foreground block text-[11px]">Total do Mês:</span>
            <span className="font-bold text-foreground text-sm">
              {formatBRL(total)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("received")}
            className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              statusFilter === "received"
                ? "bg-emerald-500/10 border-emerald-500/50 shadow-xs ring-1 ring-emerald-500/40"
                : "bg-muted/40 border-transparent hover:bg-muted/70"
            }`}
          >
            <span className="text-muted-foreground block text-[11px]">Total Recebido:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {formatBRL(totalReceived)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter("announced")}
            className={`col-span-2 sm:col-span-1 p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              statusFilter === "announced"
                ? "bg-amber-500/10 border-amber-500/50 shadow-xs ring-1 ring-amber-500/40"
                : "bg-muted/40 border-transparent hover:bg-muted/70"
            }`}
          >
            <span className="text-muted-foreground block text-[11px]">Previsto (A Pagar):</span>
            <span className="font-bold text-amber-600 dark:text-amber-400 text-sm">
              {formatBRL(totalAnnounced)}
            </span>
          </button>
        </div>

        {loading ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground text-xs">
            Carregando agenda...
          </div>
        ) : rows.length === 0 ? (
          <div className="h-32 flex flex-col items-center justify-center text-muted-foreground text-xs space-y-1">
            <span>Nenhum provento registrado ou anunciado para este mês.</span>
          </div>
        ) : view === "list" ? (
          <div className="space-y-2">
            <div className="divide-y border rounded-md overflow-hidden text-xs">
              {rows.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5">
                      {r.ticker}
                    </Badge>
                    {r.isAnnounced ? (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-900 shrink-0">
                        <Clock className="h-3 w-3" />
                        Previsto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 shrink-0">
                        <CalendarCheck className="h-3 w-3" />
                        Pago
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-right shrink-0">
                    <div className="text-muted-foreground text-[11px]">
                      {formatDate(r.date)}
                    </div>
                    <div className="font-bold text-foreground tabular-nums text-sm">
                      {formatBRL(r.value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* View Switch: Por Tipo vs Por Ativo */}
            <div className="flex items-center justify-between border-b pb-2">
              <span className="text-xs text-muted-foreground">
                Exibindo: <span className="font-medium text-foreground">
                  {statusFilter === "all" ? "Todos os proventos" : statusFilter === "received" ? "Apenas recebidos" : "Apenas previstos"}
                </span>
              </span>
              <div className="flex items-center space-x-2">
                <Label htmlFor="dividend-view-switch" className="text-xs cursor-pointer text-muted-foreground">
                  Por Tipo
                </Label>
                <Switch
                  id="dividend-view-switch"
                  checked={showByAsset}
                  onCheckedChange={setShowByAsset}
                />
                <Label htmlFor="dividend-view-switch" className="text-xs cursor-pointer font-medium">
                  Por Ativo
                </Label>
              </div>
            </div>

            {chartData.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
                {/* Pie Chart: strictly centered, perfectly responsive */}
                <div className="w-full sm:w-[200px] h-[190px] flex items-center justify-center shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={75}
                        innerRadius={30}
                        paddingAngle={2}
                        fill="#8884d8"
                        dataKey="value"
                        nameKey="name"
                      >
                        {chartData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Custom Responsive Legend: never displaced, scrollable list with exact values and % */}
                <div className="w-full sm:flex-1 max-h-[190px] overflow-y-auto divide-y divide-border/40 pr-1 text-xs">
                  {chartData.map((item, idx) => {
                    const percentage = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center justify-between py-1.5 px-1 hover:bg-muted/40 rounded transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          />
                          <span className="font-semibold text-foreground truncate max-w-[120px]" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-right">
                          <span className="text-muted-foreground font-medium text-[11px]">
                            {formatBRL(item.value)}
                          </span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-[11px] tabular-nums min-w-[44px]">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-[200px]">
                <p className="text-muted-foreground text-xs">Não há dados de proventos para exibir neste filtro.</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DividendScheduleCard;