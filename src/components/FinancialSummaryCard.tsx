import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Wallet, TrendingUp, TrendingDown, Eye, EyeOff } from "lucide-react";

interface FinancialSummaryCardProps {
  balance: number;
  income: number;
  expenses: number;
  isLoading?: boolean;
  className?: string;
}

export const FinancialSummaryCard = ({
  balance,
  income,
  expenses,
  isLoading = false,
  className,
}: FinancialSummaryCardProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const toggleVisibility = () => setIsVisible(!isVisible);

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-2">
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent>
          <div className="flex justify-between mt-4 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-6">
        <div className="flex flex-col space-y-6">
          {/* Header & Balance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Wallet className="h-4 w-4" />
                <span className="text-sm font-medium">Saldo do Mês</span>
              </div>
              <button
                onClick={toggleVisibility}
                className="text-muted-foreground hover:text-foreground transition-colors outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm"
                aria-label={isVisible ? "Ocultar valores" : "Mostrar valores"}
              >
                {isVisible ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
              </button>
            </div>

            <div className="text-4xl font-bold" translate="no">
              {isVisible ? (
                <span
                  className={
                    balance >= 0 ? "text-success" : "text-destructive"
                  }
                >
                  {formatCurrency(balance)}
                </span>
              ) : (
                <span className="text-foreground">R$ ••••••</span>
              )}
            </div>
          </div>

          {/* Income & Expenses */}
          <div className="grid grid-cols-2 gap-4">
            {/* Income */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-1.5 bg-success/10 rounded-full">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
                <span className="text-sm font-medium">Receitas</span>
              </div>
              <div className="text-xl font-bold text-success" translate="no">
                {isVisible ? formatCurrency(income) : "R$ ••••••"}
              </div>
            </div>

            {/* Expenses */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="p-1.5 bg-destructive/10 rounded-full">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
                <span className="text-sm font-medium">Gastos</span>
              </div>
              <div className="text-xl font-bold text-destructive" translate="no">
                {isVisible ? formatCurrency(expenses) : "R$ ••••••"}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
