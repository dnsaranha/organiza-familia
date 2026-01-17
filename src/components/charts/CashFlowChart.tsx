import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  format,
  startOfWeek,
  startOfMonth,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isSameDay,
  isSameWeek,
  isSameMonth,
  parseISO,
  isValid,
  startOfDay,
  endOfDay,
  max,
  min
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";

interface Transaction {
  date: string | Date;
  amount: number;
  type: "income" | "expense";
}

interface CashFlowChartProps {
  data: Transaction[];
}

const CashFlowChart = ({ data }: CashFlowChartProps) => {
  const [interval, setInterval] = useState<"day" | "week" | "month">("month");

  const chartData = useMemo(() => {
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

      return {
        date,
        name: format(
          date,
          interval === "month" ? "MMM/yy" : interval === "week" ? "dd/MMM" : "dd/MM",
          { locale: ptBR }
        ),
        income,
        expense,
        balance: income - expense,
      };
    });
  }, [data, interval]);

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
        <div className="bg-background border rounded-lg p-3 shadow-lg text-xs sm:text-sm">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="capitalize text-muted-foreground">
                {entry.name}:
              </span>
              <span className="font-medium">
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
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <div>
          {/* Title is handled by parent, but we could add dynamic subtitle here if needed */}
        </div>
        <div className="flex bg-muted rounded-lg p-1">
          <Button
            variant={interval === "day" ? "default" : "ghost"}
            size="sm"
            onClick={() => setInterval("day")}
            className="h-7 text-xs"
          >
            Diário
          </Button>
          <Button
            variant={interval === "week" ? "default" : "ghost"}
            size="sm"
            onClick={() => setInterval("week")}
            className="h-7 text-xs"
          >
            Semanal
          </Button>
          <Button
            variant={interval === "month" ? "default" : "ghost"}
            size="sm"
            onClick={() => setInterval("month")}
            className="h-7 text-xs"
          >
            Mensal
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
              minTickGap={30}
            />
            <YAxis
              tickFormatter={(value) => `R$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
              tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />

            <Line
              type="monotone"
              dataKey="income"
              name="Receita"
              stroke="#10b981" // Green-500
              strokeWidth={3}
              dot={{ r: 4, fill: "#10b981", strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Despesa"
              stroke="#ef4444" // Red-500
              strokeWidth={3}
              dot={{ r: 4, fill: "#ef4444", strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="Saldo"
              stroke="hsl(var(--foreground))" // Adaptive white/black
              strokeWidth={3}
              dot={{ r: 4, fill: "hsl(var(--foreground))", strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default CashFlowChart;
