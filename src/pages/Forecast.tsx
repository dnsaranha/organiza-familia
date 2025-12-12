
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import { useOpenBanking } from "@/hooks/useOpenBanking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, TrendingUp, TrendingDown, ArrowRight, CalendarDays, AlertTriangle, CheckCircle } from "lucide-react";
import { format, addMonths, startOfMonth, endOfMonth, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import IncomeExpenseBarChart from "@/components/charts/IncomeExpenseBarChart";
import { toast } from "sonner";

// Interfaces
interface ScheduledTask { id: string; title: string; task_type: string; schedule_date: string; value: number | null; is_completed: boolean; is_recurring: boolean; recurrence_pattern: string | null; group_id: string | null; user_id: string; }
interface Transaction { id: string; type: "income" | "expense"; amount: number; date: string; category: string; description: string | null; }
interface Goal { id: string; target_amount: number; current_amount: number; }
interface MonthForecast { month: Date; label: string; projectedIncome: number; projectedExpense: number; monthBalance: number; cumulativeBalance: number; status: "positive" | "negative" | "neutral"; scheduledIncome: ScheduledTask[]; scheduledExpense: ScheduledTask[]; }

export default function ForecastPage() {
  const { user } = useAuth();
  const { scope } = useBudgetScope();
  const { accounts: bankAccounts, loading: bankLoading } = useOpenBanking();

  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [monthsAhead, setMonthsAhead] = useState("6");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, scope]);

  const fetchData = async () => {
    if (!user) return;
    setDataLoading(true);
    try {
      const baseQuery = (table: string) => {
        let query = supabase.from(table).select("*");
        if (scope === "personal") {
          query = query.is("group_id", null).eq("user_id", user.id);
        } else {
          query = query.eq("group_id", scope);
        }
        return query;
      };

      const [tasksResult, transactionsResult, goalsResult] = await Promise.all([
        baseQuery("scheduled_tasks").order("schedule_date", { ascending: true }),
        baseQuery("transactions").order("date", { ascending: false }).limit(200),
        baseQuery("savings_goals").select('id, target_amount, current_amount'),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (transactionsResult.error) throw transactionsResult.error;
      if (goalsResult.error) throw goalsResult.error;

      setTasks(tasksResult.data || []);
      setTransactions(transactionsResult.data || []);
      setGoals(goalsResult.data || []);

    } catch (error: any) {
      console.error("Error fetching forecast data:", error.message || error);
      toast.error("Erro ao buscar dados da previsão", { description: error.message });
    } finally {
      setDataLoading(false);
    }
  };

  const forecasts = useMemo(() => {
    const months = parseInt(monthsAhead);
    const now = new Date();
    const result: MonthForecast[] = [];

    const initialBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const remainingGoalAmount = goals.reduce((sum, goal) => sum + Math.max(0, goal.target_amount - goal.current_amount), 0);
    let cumulativeBalance = initialBalance - remainingGoalAmount;

    const incomeByCategory: Record<string, number[]> = {};
    const expenseByCategory: Record<string, number[]> = {};
    transactions.forEach((t) => {
      if (t.category === 'Metas') return; // Ignora contribuições de metas para não contar duas vezes
      const target = t.type === "income" ? incomeByCategory : expenseByCategory;
      if (!target[t.category]) target[t.category] = [];
      target[t.category].push(t.amount);
    });
    const getAverage = (amounts: number[]) => !amounts || amounts.length === 0 ? 0 : amounts.reduce((a, b) => a + b, 0) / amounts.length;

    for (let i = 0; i < months; i++) {
      const monthDate = addMonths(startOfMonth(now), i);
      const monthEnd = endOfMonth(monthDate);

      const scheduledIncome: ScheduledTask[] = [];
      const scheduledExpense: ScheduledTask[] = [];

      tasks.forEach((task) => {
          if (!task.value || task.value === 0) return;
          const taskDate = new Date(task.schedule_date);
          let isInMonth = isSameMonth(taskDate, monthDate);
          // Lógica de recorrência simplificada para o exemplo
          if (!isInMonth && task.is_recurring) {
              let tempDate = new Date(task.schedule_date);
              while(tempDate < monthEnd) {
                  if(isSameMonth(tempDate, monthDate)) {
                      isInMonth = true;
                      break;
                  }
                  if (task.recurrence_pattern === 'monthly') tempDate = addMonths(tempDate, task.recurrence_interval || 1);
                  else break; // Simplificando, só lida com mensal por agora
              }
          }
          if (isInMonth) {
              if (task.task_type === "income") scheduledIncome.push(task); else scheduledExpense.push(task);
          }
      });

      const scheduledIncomeTotal = scheduledIncome.reduce((sum, t) => sum + Math.abs(t.value || 0), 0);
      const scheduledExpenseTotal = scheduledExpense.reduce((sum, t) => sum + Math.abs(t.value || 0), 0);

      let projectedIncome = scheduledIncomeTotal;
      let projectedExpense = scheduledExpenseTotal;

      if (scheduledIncomeTotal === 0) { Object.values(incomeByCategory).forEach(amounts => projectedIncome += getAverage(amounts)); }
      if (scheduledExpenseTotal === 0) { Object.values(expenseByCategory).forEach(amounts => projectedExpense += getAverage(amounts)); }

      const monthBalance = projectedIncome - projectedExpense;
      cumulativeBalance += monthBalance;

      result.push({
        month: monthDate,
        label: format(monthDate, "MMMM yyyy", { locale: ptBR }),
        projectedIncome, projectedExpense, monthBalance, cumulativeBalance,
        status: monthBalance >= 0 ? "positive" : "negative",
        scheduledIncome, scheduledExpense,
      });
    }
    return result;
  }, [tasks, transactions, goals, bankAccounts, monthsAhead]);

  const pageLoading = dataLoading || bankLoading;

  const chartData = useMemo(() => forecasts.map((f) => ({ name: format(f.month, "MMM", { locale: ptBR }), income: f.projectedIncome, expense: f.projectedExpense })), [forecasts]);
  
  const totals = useMemo(() => ({
    income: forecasts.reduce((acc, f) => acc + f.projectedIncome, 0),
    expense: forecasts.reduce((acc, f) => acc + f.projectedExpense, 0),
    balance: forecasts.length > 0 ? forecasts[forecasts.length - 1].cumulativeBalance : 0,
  }), [forecasts]);

  const formatCurrency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (!user) return <div className="flex items-center justify-center min-h-[60vh]"><p className="text-muted-foreground">Faça login para ver suas previsões</p></div>;

  return (
    <div className="container mx-auto p-4 pb-20 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" />Previsão Financeira</h1>
          <p className="text-muted-foreground text-sm">Projeção de receitas e despesas para os próximos meses</p>
        </div>
        <Select value={monthsAhead} onValueChange={setMonthsAhead}><SelectTrigger className="w-[180px]"><SelectValue placeholder="Período" /></SelectTrigger><SelectContent><SelectItem value="3">Próximos 3 meses</SelectItem><SelectItem value="6">Próximos 6 meses</SelectItem><SelectItem value="12">Próximos 12 meses</SelectItem></SelectContent></Select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingUp className="h-4 w-4 text-green-500" />Receita Prevista</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totals.income)}</div><p className="text-xs text-muted-foreground">Total para {monthsAhead} meses</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><TrendingDown className="h-4 w-4 text-red-500" />Despesa Prevista</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(totals.expense)}</div><p className="text-xs text-muted-foreground">Total para {monthsAhead} meses</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2"><ArrowRight className="h-4 w-4" />Saldo Final Projetado</CardTitle></CardHeader><CardContent><div className={`text-2xl font-bold ${totals.balance >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(totals.balance)}</div><p className="text-xs text-muted-foreground">Balanço acumulado ao final do período</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Projeção Mensal</CardTitle></CardHeader>
        <CardContent className="h-[300px]">
          {pageLoading ? <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div> : <IncomeExpenseBarChart data={chartData} />}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Detalhes por Mês</h2>
        {pageLoading ? (
          <div className="grid gap-4 md:grid-cols-2">{[1,2,3,4].map(i=><Card key={i} className="animate-pulse"><CardHeader className="h-16 bg-muted rounded-t-lg"/><CardContent className="space-y-3 pt-4"><div className="h-4 bg-muted rounded w-3/4"/><div className="h-4 bg-muted rounded w-1/2"/></CardContent></Card>)}</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {forecasts.map((forecast) => (
              <Card key={forecast.label} className="overflow-hidden">
                <div className={`h-1 ${forecast.status === "positive"?"bg-green-500":forecast.status === "negative"?"bg-red-500":"bg-gray-400"}`}/>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base capitalize flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />{forecast.label}</CardTitle>
                    {forecast.status === "positive" ? <CheckCircle className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-red-500" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><p className="text-muted-foreground">Receita</p><p className="text-lg font-semibold text-green-600">{formatCurrency(forecast.projectedIncome)}</p></div>
                    <div><p className="text-muted-foreground">Despesa</p><p className="text-lg font-semibold text-red-600">{formatCurrency(forecast.projectedExpense)}</p></div>
                  </div>
                  <div className="border-t pt-3"><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Saldo do mês</span><span className={`font-bold ${forecast.monthBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(forecast.monthBalance)}</span></div></div>
                  <div className="border-t pt-3"><div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Saldo acumulado</span><span className={`text-lg font-bold ${forecast.cumulativeBalance >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(forecast.cumulativeBalance)}</span></div></div>
                  {(forecast.scheduledIncome.length > 0 || forecast.scheduledExpense.length > 0) && (
                    <div className="border-t pt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Agendamentos do Mês</p>
                      {forecast.scheduledIncome.map(t=><div key={t.id} className="flex justify-between text-sm"><span className="truncate flex-1">{t.title}</span><span className="text-green-600 ml-2">+{formatCurrency(Math.abs(t.value||0))}</span></div>)}
                      {forecast.scheduledExpense.map(t=><div key={t.id} className="flex justify-between text-sm"><span className="truncate flex-1">{t.title}</span><span className="text-red-600 ml-2">-{formatCurrency(Math.abs(t.value||0))}</span></div>)}
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
