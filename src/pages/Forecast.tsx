import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, TrendingDown, ArrowRight, CalendarDays, AlertTriangle, CheckCircle } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import IncomeExpenseBarChart from "@/components/charts/IncomeExpenseBarChart";

interface ScheduledTask {
  id: string;
  title: string;
  task_type: string;
  schedule_date: string;
  value: number | null;
  is_completed: boolean;
  is_recurring: boolean;
  recurrence_pattern: string | null;
  recurrence_interval: number | null;
  recurrence_end_date: string | null;
  category: string | null;
}

interface Transaction {
  id: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  category: string;
  description: string | null;
}

interface MonthForecast {
  month: Date;
  label: string;
  projectedIncome: number;
  projectedExpense: number;
  scheduledIncome: ScheduledTask[];
  scheduledExpense: ScheduledTask[];
  balance: number;
  status: "positive" | "negative" | "neutral";
}

export default function ForecastPage() {
  const { user } = useAuth();
  const { scope } = useBudgetScope();
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthsAhead, setMonthsAhead] = useState("6");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, scope]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Fetch scheduled tasks
      let tasksQuery = supabase
        .from("scheduled_tasks")
        .select("*")
        .order("schedule_date", { ascending: true });

      if (scope === "personal") {
        tasksQuery = tasksQuery.is("group_id", null).eq("user_id", user.id);
      } else {
        tasksQuery = tasksQuery.eq("group_id", scope);
      }

      // Fetch past transactions for averages
      let transactionsQuery = supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(100);

      if (scope === "personal") {
        transactionsQuery = transactionsQuery.is("group_id", null).eq("user_id", user.id);
      } else {
        transactionsQuery = transactionsQuery.eq("group_id", scope);
      }

      const [tasksResult, transactionsResult] = await Promise.all([
        tasksQuery,
        transactionsQuery,
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      setTasks(tasksResult.data || []);
      setTransactions(transactionsResult.data || []);
    } catch (error: any) {
      console.error("Error fetching forecast data:", error);
    } finally {
      setLoading(false);
    }
  };

  const forecasts = useMemo(() => {
    const months = parseInt(monthsAhead);
    const now = new Date();
    const result: MonthForecast[] = [];

    // Calculate historical averages from transactions
    const incomeByCategory: Record<string, number[]> = {};
    const expenseByCategory: Record<string, number[]> = {};

    transactions.forEach((t) => {
      const target = t.type === "income" ? incomeByCategory : expenseByCategory;
      if (!target[t.category]) target[t.category] = [];
      target[t.category].push(t.amount);
    });

    const getAverage = (amounts: number[]) => {
      if (!amounts || amounts.length === 0) return 0;
      return amounts.reduce((a, b) => a + b, 0) / amounts.length;
    };

    for (let i = 0; i < months; i++) {
      const monthDate = addMonths(startOfMonth(now), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      // Get scheduled tasks for this month
      const scheduledIncome: ScheduledTask[] = [];
      const scheduledExpense: ScheduledTask[] = [];

      tasks.forEach((task) => {
        if (!task.value || task.value === 0) return;
        
        const taskDate = new Date(task.schedule_date);
        
        // Check if task falls in this month (including recurring)
        let isInMonth = isSameMonth(taskDate, monthDate);

        if (!isInMonth && task.is_recurring && task.recurrence_pattern) {
          // Check if recurring task would occur this month
          const endDate = task.recurrence_end_date ? new Date(task.recurrence_end_date) : addMonths(now, 24);
          if (monthEnd <= endDate) {
            switch (task.recurrence_pattern) {
              case "monthly":
                isInMonth = taskDate.getDate() <= monthEnd.getDate() && taskDate <= monthEnd;
                break;
              case "weekly":
                isInMonth = true;
                break;
              case "yearly":
                isInMonth = taskDate.getMonth() === monthDate.getMonth() && taskDate.getDate() <= monthEnd.getDate();
                break;
            }
          }
        }

        if (isInMonth) {
          if (task.task_type === "income" || task.value > 0) {
            scheduledIncome.push(task);
          } else {
            scheduledExpense.push(task);
          }
        }
      });

      // Calculate projected values
      const scheduledIncomeTotal = scheduledIncome.reduce((sum, t) => sum + Math.abs(t.value || 0), 0);
      const scheduledExpenseTotal = scheduledExpense.reduce((sum, t) => sum + Math.abs(t.value || 0), 0);

      // Add historical averages for missing categories
      let projectedIncome = scheduledIncomeTotal;
      let projectedExpense = scheduledExpenseTotal;

      // If no scheduled income, use historical average
      if (scheduledIncomeTotal === 0) {
        Object.values(incomeByCategory).forEach((amounts) => {
          projectedIncome += getAverage(amounts);
        });
      }

      const balance = projectedIncome - projectedExpense;

      result.push({
        month: monthDate,
        label: format(monthDate, "MMMM yyyy", { locale: ptBR }),
        projectedIncome,
        projectedExpense,
        scheduledIncome,
        scheduledExpense,
        balance,
        status: balance > 0 ? "positive" : balance < 0 ? "negative" : "neutral",
      });
    }

    return result;
  }, [tasks, transactions, monthsAhead]);

  const chartData = useMemo(() => {
    return forecasts.map((f) => ({
      name: format(f.month, "MMM", { locale: ptBR }),
      income: f.projectedIncome,
      expense: f.projectedExpense,
    }));
  }, [forecasts]);

  const totals = useMemo(() => {
    return forecasts.reduce(
      (acc, f) => ({
        income: acc.income + f.projectedIncome,
        expense: acc.expense + f.projectedExpense,
        balance: acc.balance + f.balance,
      }),
      { income: 0, expense: 0, balance: 0 }
    );
  }, [forecasts]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">Faça login para ver suas previsões</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Previsão Financeira
          </h1>
          <p className="text-muted-foreground text-sm">
            Projeção de receitas e despesas para os próximos meses
          </p>
        </div>

        <Select value={monthsAhead} onValueChange={setMonthsAhead}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Próximos 3 meses</SelectItem>
            <SelectItem value="6">Próximos 6 meses</SelectItem>
            <SelectItem value="12">Próximos 12 meses</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              Receita Prevista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totals.income)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total para {monthsAhead} meses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              Despesa Prevista
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totals.expense)}
            </div>
            <p className="text-xs text-muted-foreground">
              Total para {monthsAhead} meses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ArrowRight className="h-4 w-4" />
              Saldo Projetado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totals.balance >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(totals.balance)}
            </div>
            <p className="text-xs text-muted-foreground">
              Balanço acumulado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Projeção Mensal</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <IncomeExpenseBarChart data={chartData} />
          )}
        </CardContent>
      </Card>

      {/* Monthly Details */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Detalhes por Mês</h2>
        
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-16 bg-muted rounded-t-lg" />
                <CardContent className="space-y-3 pt-4">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {forecasts.map((forecast) => (
              <Card key={forecast.label} className="overflow-hidden">
                <div
                  className={`h-1 ${
                    forecast.status === "positive"
                      ? "bg-green-500"
                      : forecast.status === "negative"
                      ? "bg-red-500"
                      : "bg-gray-400"
                  }`}
                />
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {forecast.label}
                    </CardTitle>
                    {forecast.status === "positive" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : forecast.status === "negative" ? (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Receita</p>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(forecast.projectedIncome)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Despesa</p>
                      <p className="text-lg font-semibold text-red-600">
                        {formatCurrency(forecast.projectedExpense)}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Saldo do mês</span>
                      <span
                        className={`text-lg font-bold ${
                          forecast.balance >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {formatCurrency(forecast.balance)}
                      </span>
                    </div>
                  </div>

                  {/* Scheduled items */}
                  {(forecast.scheduledIncome.length > 0 || forecast.scheduledExpense.length > 0) && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">
                        Agendamentos
                      </p>
                      {forecast.scheduledIncome.map((task) => (
                        <div key={task.id} className="flex justify-between text-sm">
                          <span className="truncate flex-1">{task.title}</span>
                          <span className="text-green-600 ml-2">
                            +{formatCurrency(Math.abs(task.value || 0))}
                          </span>
                        </div>
                      ))}
                      {forecast.scheduledExpense.map((task) => (
                        <div key={task.id} className="flex justify-between text-sm">
                          <span className="truncate flex-1">{task.title}</span>
                          <span className="text-red-600 ml-2">
                            -{formatCurrency(Math.abs(task.value || 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
