import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, Eye, EyeOff, Plus, Minus } from "lucide-react";

interface FinancialSummaryCardProps {
  balance: number;
  income: number;
  expenses: number;
  isLoading?: boolean;
  className?: string;
  onQuickAdd?: (type: 'income' | 'expense') => void;
}

export const FinancialSummaryCard = ({
  balance,
  income,
  expenses,
  isLoading = false,
  className,
  onQuickAdd,
}: FinancialSummaryCardProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const toggleVisibility = () => setIsVisible(!isVisible);

  // Percentage of income spent
  const expensePercentage = income > 0 ? Math.min(Math.round((expenses / income) * 100), 100) : 0;
  const isOverBudget = income > 0 && expenses > income;

  if (isLoading) {
    return (
      <Card className={cn("w-full bg-card shadow-card border", className)}>
        <CardContent className="p-5 sm:p-6 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-6 w-6 rounded-full" />
          </div>
          <Skeleton className="h-10 w-48" />
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full bg-card shadow-card border border-border/80 overflow-hidden", className)}>
      <CardContent className="p-5 sm:p-6 space-y-5">
        {/* Header & Balance */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-xs sm:text-sm font-medium">
              <Wallet className="h-4 w-4 text-primary" />
              <span>Saldo Disponível no Mês</span>
              <button
                onClick={toggleVisibility}
                className="ml-1 p-1 hover:text-foreground text-muted-foreground transition-colors rounded"
                aria-label={isVisible ? "Ocultar valores" : "Mostrar valores"}
              >
                {isVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            </div>

            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight" translate="no">
              {isVisible ? (
                <span className={balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                  {formatCurrency(balance)}
                </span>
              ) : (
                <span className="text-muted-foreground font-mono">R$ ••••••</span>
              )}
            </div>
          </div>

          {/* Quick Action Buttons */}
          {onQuickAdd && (
            <div className="flex items-center gap-2 self-start sm:self-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onQuickAdd('expense')}
                className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:border-rose-900/60 dark:text-rose-400 dark:hover:bg-rose-950/40 text-xs font-semibold gap-1.5 h-9 px-3"
              >
                <Minus className="h-3.5 w-3.5" />
                Despesa
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onQuickAdd('income')}
                className="border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 dark:border-emerald-900/60 dark:text-emerald-400 dark:hover:bg-emerald-950/40 text-xs font-semibold gap-1.5 h-9 px-3"
              >
                <Plus className="h-3.5 w-3.5" />
                Receita
              </Button>
            </div>
          )}
        </div>

        {/* Income & Expenses Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {/* Income */}
          <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 space-y-1">
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Receitas</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400 truncate" translate="no">
              {isVisible ? formatCurrency(income) : "R$ ••••••"}
            </div>
          </div>

          {/* Expenses */}
          <div className="p-3.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 space-y-1">
            <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-300 text-xs font-medium">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>Despesas</span>
            </div>
            <div className="text-base sm:text-lg font-bold text-rose-700 dark:text-rose-400 truncate" translate="no">
              {isVisible ? formatCurrency(expenses) : "R$ ••••••"}
            </div>
          </div>
        </div>

        {/* Visual Spending Thermometer / Proportion */}
        {income > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Comprometimento da Receita</span>
              <span className={cn("font-medium", isOverBudget ? "text-rose-600 font-semibold" : "text-foreground")}>
                {expensePercentage}% {isOverBudget ? "(Acima do orçado)" : "gasto"}
              </span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isOverBudget
                    ? "bg-rose-500"
                    : expensePercentage > 80
                    ? "bg-amber-500"
                    : "bg-primary"
                )}
                style={{ width: `${Math.min(expensePercentage, 100)}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

