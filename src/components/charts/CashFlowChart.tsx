import { useState, useMemo } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  format,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameWeek,
  isSameMonth,
  parseISO,
  isValid,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface Transaction {
  date: string | Date;
  amount: number;
  type: "income" | "expense";
}

interface CashFlowChartProps {
  data: Transaction[];
  openingBalance?: number;
}

const CashFlowChart = ({ data, openingBalance = 0 }: CashFlowChartProps) => {
  const [interval, setInterval] = useState<"day" | "week" | "month">("month");
  const [isCumulative, setIsCumulative] = useState(false);

  const chartData = useMemo(() => {
    // If we have no data, we might still want to show the opening balance?
    // But usually chart needs points.
    if (!data || data.length === 0) return [];

    // Parse dates and sort
    const parsedData = data.map((t) => ({
      ...t,
      parsedDate: typeof t.date === "string" ? parseISO(t.date) : t.date,
    })).filter(t => isValid(t.parsedDate)).sort((a, b) => a.parsedDate.getTime() - b.parsedDate.getTime());

    if (parsedData.length === 0) return [];

    const startDate = parsedData[0].parsedDate;
    const endDate = parsedData[parsedData.length - 1].parsedDate;

    let intervals: Date[];

    // Generate intervals based on selection
    try {
      if (interval === "day") {
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
      } else if (interval === "week") {
        intervals = eachWeekOfInterval({ start: startDate, end: endDate }, { locale: ptBR });
      } else {
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
      }
    } catch (e) {
      // Fallback for single date or invalid interval
      intervals = [startDate];
    }

    let accumulatedBalance = isCumulative ? openingBalance : 0;

    return intervals.map((date) => {
      let income = 0;
      let expense = 0;

      parsedData.forEach((t) => {
        const isSame =
          interval === "day"
            ? isSameDay(t.parsedDate, date)
            : interval === "week"
            ? isSameWeek(t.parsedDate, date, { locale: ptBR })
            : isSameMonth(t.parsedDate, date);

        if (isSame) {
          if (t.type === "income") {
            income += t.amount;
          } else {
            expense += t.amount;
          }
        }
      });

      accumulatedBalance += (income - expense);

      return {
        date,
        name: format(
          date,
          interval === "month" ? "MMM/yy" : interval === "week" ? "dd/MMM" : "dd/MM",
          { locale: ptBR }
        ).toUpperCase(),
        income,
        expense,
        balance: accumulatedBalance,
      };
    });
  }, [data, interval, isCumulative, openingBalance]);

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        Nenhum dado para exibir.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background/95 backdrop-blur-sm border rounded-lg p-3 shadow-xl text-xs sm:text-sm">
          <p className="font-bold mb-2 text-foreground">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize text-muted-foreground">
                {entry.name}:
              </span>
              <span className="font-bold ml-auto">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-full flex flex-col bg-card rounded-xl">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="cumulative-mode"
            checked={isCumulative}
            onCheckedChange={setIsCumulative}
          />
          <Label htmlFor="cumulative-mode" className="text-xs sm:text-sm font-medium text-muted-foreground">Acumulado</Label>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-xl border border-border/50">
          <Button
            variant={interval === "day" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setInterval("day")}
            className={`h-7 text-xs font-bold rounded-lg transition-all ${interval === "day" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            Diário
          </Button>
          <Button
            variant={interval === "week" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setInterval("week")}
            className={`h-7 text-xs font-bold rounded-lg transition-all ${interval === "week" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            Semanal
          </Button>
          <Button
            variant={interval === "month" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setInterval("month")}
            className={`h-7 text-xs font-bold rounded-lg transition-all ${interval === "month" ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            Mensal
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
              dy={10}
            />
            <YAxis
              tickFormatter={(value) => `${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
              tickLine={false}
              axisLine={false}
              width={35}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              formatter={(value) => <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">{value}</span>}
            />

            <Area
              type="monotone"
              dataKey="income"
              name="Receita"
              stroke="#10b981"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorIncome)"
            />
            <Area
              type="monotone"
              dataKey="expense"
              name="Despesa"
              stroke="#f43f5e"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorExpense)"
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="hsl(var(--foreground))"
              strokeWidth={4}
              dot={{ r: 4, fill: "hsl(var(--background))", stroke: "hsl(var(--foreground))", strokeWidth: 3 }}
              activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--foreground))" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowChart;
