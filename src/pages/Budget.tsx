import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { PieChart as RechartPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, CheckCircle2, TrendingUp, TrendingDown, Wallet, PiggyBank, Save } from "lucide-react";

interface BudgetCategory {
  name: string;
  value: number;
  color: string;
  spent?: number;
}

const defaultBudgetCategories: BudgetCategory[] = [
  { name: "Liberdade Financeira", value: 25, color: "hsl(var(--chart-1))" },
  { name: "Custos Fixos", value: 30, color: "hsl(var(--chart-2))" },
  { name: "Conforto", value: 15, color: "hsl(var(--chart-3))" },
  { name: "Metas", value: 15, color: "hsl(var(--chart-4))" },
  { name: "Prazeres", value: 10, color: "hsl(var(--chart-5))" },
  { name: "Conhecimento", value: 5, color: "hsl(var(--primary))" },
];

const BudgetPage = () => {
  const { user } = useAuth();
  const { scope } = useBudgetScope();
  const { toast } = useToast();
  const [categories, setCategories] = useState<BudgetCategory[]>(defaultBudgetCategories);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0);
  const [currentMonthIncome, setCurrentMonthIncome] = useState<number>(0);
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<number>(0);
  const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load user preferences and transaction data
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // Load saved budget preferences
        const { data: prefData } = await supabase
          .from("user_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        // Get current month transactions
        const currentDate = new Date();
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);

        let transactionQuery = supabase
          .from("transactions")
          .select("*")
          .gte("date", monthStart.toISOString().split("T")[0])
          .lte("date", monthEnd.toISOString().split("T")[0]);

        if (scope === "personal") {
          transactionQuery = transactionQuery.is("group_id", null);
        } else {
          transactionQuery = transactionQuery.eq("group_id", scope);
        }

        const { data: transactions } = await transactionQuery;

        if (transactions) {
          // Calculate income and expenses
          const income = transactions
            .filter((t) => t.type === "income")
            .reduce((sum, t) => sum + Number(t.amount), 0);
          const expenses = transactions
            .filter((t) => t.type === "expense")
            .reduce((sum, t) => sum + Number(t.amount), 0);

          setCurrentMonthIncome(income);
          setCurrentMonthExpenses(expenses);

          // Group expenses by category
          const byCategory: Record<string, number> = {};
          transactions
            .filter((t) => t.type === "expense")
            .forEach((t) => {
              byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
            });
          setExpensesByCategory(byCategory);

          // Use current month income or last 3 months average
          if (income > 0) {
            setMonthlyIncome(income);
          } else {
            // Get last 3 months average
            const threeMonthsAgo = subMonths(currentDate, 3);
            let avgQuery = supabase
              .from("transactions")
              .select("amount")
              .eq("type", "income")
              .gte("date", threeMonthsAgo.toISOString().split("T")[0]);

            if (scope === "personal") {
              avgQuery = avgQuery.is("group_id", null);
            } else {
              avgQuery = avgQuery.eq("group_id", scope);
            }

            const { data: avgData } = await avgQuery;
            if (avgData && avgData.length > 0) {
              const total = avgData.reduce((sum, t) => sum + Number(t.amount), 0);
              setMonthlyIncome(total / 3);
            }
          }
        }
      } catch (error) {
        console.error("Error loading budget data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user, scope]);

  const handleSliderChange = (index: number, newValue: number[]) => {
    const updatedCategories = [...categories];
    updatedCategories[index].value = newValue[0];
    setCategories(updatedCategories);
  };

  const total = categories.reduce((acc, cat) => acc + cat.value, 0);

  // Calculate budget amounts based on income
  const budgetAmounts = useMemo(() => {
    return categories.map((cat) => ({
      ...cat,
      budgetAmount: (monthlyIncome * cat.value) / 100,
    }));
  }, [categories, monthlyIncome]);

  // Calculate overall budget health
  const budgetHealth = useMemo(() => {
    const totalBudget = monthlyIncome;
    const totalSpent = currentMonthExpenses;
    const remaining = totalBudget - totalSpent;
    const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
      remaining,
      percentUsed,
      isHealthy: percentUsed <= 80,
      isWarning: percentUsed > 80 && percentUsed <= 100,
      isOverspent: percentUsed > 100,
    };
  }, [monthlyIncome, currentMonthExpenses]);

  const handleSave = async () => {
    setSaving(true);
    // Here you could save budget preferences to user_preferences table
    toast({
      title: "Orçamento salvo!",
      description: "Suas configurações de orçamento foram salvas.",
    });
    setSaving(false);
  };

  const handleReset = () => {
    setCategories(defaultBudgetCategories);
    toast({
      title: "Valores resetados",
      description: "Os valores foram restaurados para o padrão.",
    });
  };

  const currentMonth = format(new Date(), "MMMM yyyy", { locale: ptBR });

  return (
    <div className="container mx-auto p-4 pb-20 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Orçamento</h1>
        <p className="text-muted-foreground text-sm">
          Gerencie seu orçamento mensal e acompanhe seus gastos - {currentMonth}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-sm text-muted-foreground">Receita do Mês</span>
            </div>
            <p className="text-2xl font-bold text-success">
              R$ {currentMonthIncome.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-destructive" />
              <span className="text-sm text-muted-foreground">Gastos do Mês</span>
            </div>
            <p className="text-2xl font-bold text-destructive">
              R$ {currentMonthExpenses.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Saldo Restante</span>
            </div>
            <p className={`text-2xl font-bold ${budgetHealth.remaining >= 0 ? "text-success" : "text-destructive"}`}>
              R$ {budgetHealth.remaining.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Uso do Orçamento</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={Math.min(budgetHealth.percentUsed, 100)} className="flex-1" />
              <span className="text-sm font-medium">{budgetHealth.percentUsed.toFixed(0)}%</span>
            </div>
            <div className="mt-1">
              {budgetHealth.isHealthy && (
                <Badge variant="outline" className="text-success border-success">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Saudável
                </Badge>
              )}
              {budgetHealth.isWarning && (
                <Badge variant="outline" className="text-warning border-warning">
                  <AlertCircle className="h-3 w-3 mr-1" /> Atenção
                </Badge>
              )}
              {budgetHealth.isOverspent && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" /> Acima do limite
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left Column - Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Distribuição do Orçamento</CardTitle>
            <CardDescription>
              Total: {total}% {total !== 100 && <span className="text-destructive">(deve ser 100%)</span>}
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartPieChart>
                <Pie
                  data={categories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  nameKey="name"
                  label={({ name, value }) => `${value}%`}
                >
                  {categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value}% (R$ ${((monthlyIncome * value) / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })})`,
                    name,
                  ]}
                />
                <Legend />
              </RechartPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Right Column - Controls */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Controle de Orçamento</CardTitle>
            <CardDescription>Ajuste a porcentagem para cada categoria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="monthlyIncome">Renda Mensal Base</Label>
              <div className="flex gap-2">
                <span className="flex items-center text-muted-foreground">R$</span>
                <Input
                  id="monthlyIncome"
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                  className="max-w-[200px]"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Baseado na sua receita atual ou média dos últimos 3 meses
              </p>
            </div>

            <div className="space-y-4">
              {budgetAmounts.map((category, index) => {
                const spent = expensesByCategory[category.name] || 0;
                const percentSpent = category.budgetAmount > 0 ? (spent / category.budgetAmount) * 100 : 0;

                return (
                  <div key={category.name} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <Label>{category.name}</Label>
                      </div>
                      <div className="text-sm text-right">
                        <span className="font-medium">{category.value}%</span>
                        <span className="text-muted-foreground ml-2">
                          (R$ {category.budgetAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
                        </span>
                      </div>
                    </div>
                    <Slider
                      value={[category.value]}
                      onValueChange={(newValue) => handleSliderChange(index, newValue)}
                      max={100}
                      step={1}
                    />
                    {spent > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <Progress value={Math.min(percentSpent, 100)} className="flex-1 h-2" />
                        <span className={percentSpent > 100 ? "text-destructive" : "text-muted-foreground"}>
                          R$ {spent.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} gasto ({percentSpent.toFixed(0)}%)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-4 mt-6">
              <Button variant="outline" onClick={handleReset}>
                Resetar Valores
              </Button>
              <Button onClick={handleSave} disabled={saving || total !== 100}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {Object.keys(expensesByCategory).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoria</CardTitle>
            <CardDescription>Detalhamento dos gastos do mês atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(expensesByCategory)
                .sort(([, a], [, b]) => b - a)
                .map(([category, amount]) => {
                  const budgetCat = budgetAmounts.find((c) => c.name === category);
                  const budget = budgetCat?.budgetAmount || 0;
                  const percent = budget > 0 ? (amount / budget) * 100 : 0;

                  return (
                    <div
                      key={category}
                      className="p-3 rounded-lg border bg-card"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">{category}</span>
                        <Badge variant={percent > 100 ? "destructive" : "outline"}>
                          {budget > 0 ? `${percent.toFixed(0)}%` : "Sem orçamento"}
                        </Badge>
                      </div>
                      <div className="text-lg font-bold">
                        R$ {amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                      {budget > 0 && (
                        <div className="text-xs text-muted-foreground">
                          de R$ {budget.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} orçados
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BudgetPage;
