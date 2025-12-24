import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FinancialCard } from "@/components/FinancialCard";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { ScheduledTasks } from "@/components/ScheduledTasks";
import { FamilyGroups } from "@/components/FamilyGroups";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { useAuth } from "@/hooks/useAuth";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useOpenBanking } from "@/hooks/useOpenBanking";
import { supabase } from "@/integrations/supabase/client";
import { useBudgetScope } from "@/contexts/BudgetScopeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { accountTypeMapping, mapAccountSubtype } from "@/lib/account-mapping";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Building2,
  CreditCard,
  Users,
  CheckSquare,
  Eye,
  EyeOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FinancialData {
  balance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
}

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [financialData, setFinancialData] = useState<FinancialData | null>(
    null,
  );
  const [loadingData, setLoadingData] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { scope } = useBudgetScope();
  const {
    connected: bankConnected,
    accounts,
    transactions: bankTransactions,
    loading: bankLoading,
    refreshAllData: refetchBankData,
  } = useOpenBanking();
  const [valuesVisible, setValuesVisible] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const fetchFinancialData = useCallback(async () => {
    if (!user) return;

    setLoadingData(true);
    try {
      const { data: preferences } = await supabase
        .from("user_preferences")
        .select("month_start_day")
        .eq("user_id", user.id)
        .maybeSingle();

      const monthStartDay = preferences?.month_start_day || 1;

      let query = supabase.from("transactions").select("type, amount, date");
      if (scope === "personal") {
        query = query.is("group_id", null).eq("user_id", user.id);
      } else {
        query = query.eq("group_id", scope);
      }
      const { data: manualTransactions, error } = await query;
      if (error) throw error;

      const now = new Date();
      let monthStartDate = new Date(
        now.getFullYear(),
        now.getMonth(),
        monthStartDay,
      );
      if (now.getDate() < monthStartDay) {
        monthStartDate.setMonth(monthStartDate.getMonth() - 1);
      }
      let monthEndDate = new Date(
        monthStartDate.getFullYear(),
        monthStartDate.getMonth() + 1,
        monthStartDay - 1,
      );
      monthEndDate.setHours(23, 59, 59, 999);

      let prevMonthStartDate = new Date(monthStartDate);
      prevMonthStartDate.setMonth(prevMonthStartDate.getMonth() - 1);
      let prevMonthEndDate = new Date(monthStartDate);
      prevMonthEndDate.setDate(prevMonthEndDate.getDate() - 1);
      prevMonthEndDate.setHours(23, 59, 59, 999);

      const currentBankTransactions = bankTransactions || [];
      const combinedTransactions = [
        ...(manualTransactions || []).map((t) => ({ ...t, source: "manual" })),
        ...currentBankTransactions.map((t) => ({
          ...t,
          type: t.amount > 0 ? "income" : "expense",
          source: "open_banking",
        })),
      ];

      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      let previousMonthIncome = 0;
      let previousMonthExpenses = 0;

      for (const t of combinedTransactions) {
        const transactionDate = new Date(t.date);
        if (
          transactionDate >= monthStartDate &&
          transactionDate <= monthEndDate
        ) {
          if (t.type === "income") {
            monthlyIncome += Math.abs(t.amount);
          } else {
            monthlyExpenses += Math.abs(t.amount);
          }
        } else if (
          transactionDate >= prevMonthStartDate &&
          transactionDate <= prevMonthEndDate
        ) {
          if (t.type === "income") {
            previousMonthIncome += Math.abs(t.amount);
          } else {
            previousMonthExpenses += Math.abs(t.amount);
          }
        }
      }

      const previousMonthBalance = previousMonthIncome - previousMonthExpenses;
      const monthlyBalance =
        previousMonthBalance + monthlyIncome - monthlyExpenses;

      setFinancialData({
        balance: monthlyBalance,
        monthlyIncome,
        monthlyExpenses,
      });
    } catch (err) {
      if (err instanceof Error && !err.message.includes("aborted")) {
        console.error("Erro ao buscar dados financeiros:", err);
      }
    } finally {
      setLoadingData(false);
    }
  }, [user, scope, bankTransactions]);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user, refreshKey, scope, fetchFinancialData]);

  const handleDataRefresh = () => {
    setRefreshKey((prevKey) => prevKey + 1);
    refetchBankData();
  };

  if (authLoading || (loadingData && !financialData)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const monthlyBalance = financialData?.balance ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="p-4 sm:p-6 md:p-8">
        <PWAInstallPrompt />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <section className="xl:col-span-2 bg-card rounded-xl shadow-sm border p-4 sm:p-6 md:p-8">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <Wallet className="text-primary h-5 w-5" />
                <h3 className="text-base sm:text-lg font-semibold">Saldo do Mês</h3>
              </div>
              <button
                onClick={() => setValuesVisible(!valuesVisible)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                type="button"
              >
                {valuesVisible ? (
                  <Eye className="h-5 w-5" />
                ) : (
                  <EyeOff className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="flex flex-col gap-4 sm:gap-6 md:flex-row md:items-center md:justify-between md:divide-x w-full">
              <div className="flex-1 md:pr-6">
                <p className="text-xs sm:text-sm text-muted-foreground mb-1">
                  Saldo Total
                </p>
                {loadingData || bankLoading ? (
                  <div className="h-10 sm:h-12 w-32 sm:w-40 bg-muted animate-pulse rounded" />
                ) : (
                  <h2
                    className={cn(
                      "text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight",
                      monthlyBalance >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400",
                    )}
                  >
                    {valuesVisible
                      ? monthlyBalance.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })
                      : "••••••"}
                  </h2>
                )}
              </div>
              <div className="flex flex-row items-center justify-between w-full divide-x md:contents">
                <div className="flex-1 pr-4 md:pr-0 md:px-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                      <TrendingUp className="text-green-600 dark:text-green-400 h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium">
                      Receitas
                    </span>
                  </div>
                  {loadingData || bankLoading ? (
                    <div className="h-7 sm:h-8 w-28 sm:w-32 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-semibold text-green-600 dark:text-green-400">
                      {valuesVisible
                        ? (financialData?.monthlyIncome ?? 0).toLocaleString(
                            "pt-BR",
                            {
                              style: "currency",
                              currency: "BRL",
                            },
                          )
                        : "••••••"}
                    </p>
                  )}
                </div>
                <div className="flex-1 pl-4 md:pl-6">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                      <TrendingDown className="text-red-600 dark:text-red-400 h-4 w-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium">
                      Gastos
                    </span>
                  </div>
                  {loadingData || bankLoading ? (
                    <div className="h-7 sm:h-8 w-28 sm:w-32 bg-muted animate-pulse rounded" />
                  ) : (
                    <p className="text-xl sm:text-2xl font-semibold text-red-600 dark:text-red-400">
                      {valuesVisible
                        ? (financialData?.monthlyExpenses ?? 0).toLocaleString(
                            "pt-BR",
                            {
                              style: "currency",
                              currency: "BRL",
                            },
                          )
                        : "••••••"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="xl:col-span-1 bg-card rounded-xl shadow-sm border p-4 sm:p-6 flex flex-col justify-center">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="text-primary h-5 w-5" />
                <h3 className="text-base sm:text-lg font-bold">Contas Bancárias</h3>
              </div>
            </div>
            {bankConnected && accounts.length > 0 ? (
              <>
                <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                  {accounts
                    .filter((acc) => acc.type === "BANK")
                    .slice(0, 3)
                    .map((account, index) => (
                      <div
                        key={account.id}
                        className={`snap-center flex-none w-56 sm:w-64 p-4 rounded-lg flex flex-col justify-between h-28 relative overflow-hidden group ${
                          index === 0
                            ? "bg-muted"
                            : index === 1
                              ? "bg-purple-100 dark:bg-purple-900/30"
                              : "bg-orange-100 dark:bg-orange-900/30"
                        }`}
                      >
                        <div className="absolute right-0 top-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Building2 className="h-8 w-8 sm:h-10 sm:w-10" />
                        </div>
                        <div>
                          <p className="text-sm font-medium flex items-center gap-1 truncate">
                            <CreditCard className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {account.marketingName || account.name}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {mapAccountSubtype(account.subtype)}
                          </p>
                        </div>
                        <p className="text-lg sm:text-xl font-bold truncate">
                          {account.balance.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: account.currency || "BRL",
                          })}
                        </p>
                      </div>
                    ))}
                </div>
                <div className="flex justify-center mt-2 gap-1">
                  {accounts
                    .filter((acc) => acc.type === "BANK")
                    .slice(0, 3)
                    .map((_, index) => (
                      <div
                        key={index}
                        className={`w-1.5 h-1.5 rounded-full ${
                          index === 0 ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">
                  Nenhuma conta conectada
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2 space-y-4 sm:space-y-6">
            {bankConnected && bankTransactions.length > 0 && (
              <section className="bg-card rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 sm:p-6 border-b bg-muted/20 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="text-primary h-5 w-5 flex-shrink-0" />
                    <h3 className="text-base sm:text-lg font-bold">
                      Últimas Transações Bancárias
                    </h3>
                  </div>
                  <button className="text-xs sm:text-sm text-primary hover:underline font-medium self-start sm:self-auto">
                    Ver extrato completo
                  </button>
                </div>
                <div className="divide-y">
                  {bankTransactions.slice(0, 3).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="p-3 sm:p-4 hover:bg-muted/20 transition-colors flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            transaction.amount >= 0
                              ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                              : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                          }`}
                        >
                          {transaction.amount >= 0 ? (
                            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                          ) : (
                            <TrendingDown className="h-4 w-4 sm:h-5 sm:w-5" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm sm:text-base truncate">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString(
                              "pt-BR",
                            )}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`font-bold text-sm sm:text-base whitespace-nowrap ${
                          transaction.amount >= 0
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {transaction.amount >= 0 ? "+" : ""}
                        {transaction.amount.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="bg-card rounded-xl shadow-sm border overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-muted/20 flex justify-between items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">Meus Grupos</span>
                </h3>
                <button className="text-xs text-primary hover:underline whitespace-nowrap">
                  Ver todos
                </button>
              </div>
              <div className="p-3 sm:p-4">
                <FamilyGroups />
              </div>
            </section>
          </div>

          <div className="xl:col-span-1 space-y-4 sm:space-y-6">
            <section className="bg-card rounded-xl shadow-sm border overflow-hidden flex flex-col">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-muted/20">
                <h3 className="text-base sm:text-lg font-bold text-primary flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">Próximas Tarefas</span>
                </h3>
              </div>
              <div className="p-4 sm:p-6 flex-1 flex flex-col min-h-[200px]">
                <ScheduledTasks />
              </div>
            </section>

            <section className="bg-gradient-to-br from-indigo-50 to-white dark:from-gray-800 dark:to-gray-800 rounded-xl shadow-sm border border-indigo-100 dark:border-gray-700 p-4 sm:p-5">
              <SubscriptionStatus />
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
