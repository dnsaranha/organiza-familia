import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FinancialSummaryCard } from "@/components/FinancialSummaryCard";
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
} from "lucide-react";

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

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchFinancialData();
    }
  }, [user, refreshKey, scope, bankTransactions, accounts]);

  const fetchFinancialData = async () => {
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

      const combinedTransactions = [
        ...(manualTransactions || []).map((t) => ({ ...t, source: "manual" })),
        ...(bankTransactions || []).map((t) => ({
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
      const monthlyBalance = previousMonthBalance + monthlyIncome - monthlyExpenses;

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
  };

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
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8 max-w-7xl">
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Olá, bem-vindo de volta! 👋
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Aqui está um resumo das suas finanças
          </p>
        </div>

        <PWAInstallPrompt />

        <div className="mb-6 sm:mb-8">
          <FinancialSummaryCard
            balance={monthlyBalance}
            income={financialData?.monthlyIncome ?? 0}
            expenses={financialData?.monthlyExpenses ?? 0}
            isLoading={loadingData || bankLoading}
          />
        </div>

        {bankConnected && accounts.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className="space-y-4 sm:space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <h3 className="text-lg sm:text-xl font-semibold">Contas Bancárias</h3>
                </div>
                <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 scrollbar-hide">
                  {accounts
                    .filter((acc) => acc.type === "BANK")
                    .map((account) => (
                      <div
                        key={account.id}
                        className="p-3 sm:p-4 bg-muted/30 rounded-lg snap-center min-w-[75%] xs:min-w-[60%] sm:min-w-[45%] md:min-w-0 flex-shrink-0"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate">
                            {account.marketingName || account.name}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">
                          {mapAccountSubtype(account.subtype)}
                        </p>
                        <p className="text-base sm:text-lg font-bold truncate">
                          {account.balance.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: account.currency || "BRL",
                          })}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                  <h3 className="text-lg sm:text-xl font-semibold">Cartões de Crédito</h3>
                </div>
                <div className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 scrollbar-hide">
                  {accounts
                    .filter((acc) => acc.type === "CREDIT")
                    .map((account) => (
                      <div
                        key={account.id}
                        className="p-3 sm:p-4 bg-muted/30 rounded-lg snap-center min-w-[75%] xs:min-w-[60%] sm:min-w-[45%] md:min-w-0 flex-shrink-0"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <CreditCard className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate">
                            {account.marketingName || account.name}
                          </span>
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mb-1 truncate">
                          {account.brand
                            ? `${account.brand} - ${mapAccountSubtype(account.subtype)}`
                            : mapAccountSubtype(account.subtype)}
                        </p>
                        <p className="text-base sm:text-lg font-bold truncate">
                          {account.balance.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: account.currency || "BRL",
                          })}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {bankTransactions.length > 0 && (
              <Card className="mt-4 sm:mt-6">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">
                    Últimas Transações Bancárias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {bankTransactions.slice(0, 10).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex flex-col xs:flex-row xs:justify-between xs:items-center gap-1 xs:gap-2 p-2 sm:p-3 bg-muted/20 rounded"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium truncate">
                            {transaction.description}
                          </p>
                          <p className="text-[10px] sm:text-xs text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString(
                              "pt-BR",
                            )}
                          </p>
                        </div>
                        <span
                          className={`text-xs sm:text-sm font-medium whitespace-nowrap ${
                            transaction.amount >= 0
                              ? "text-green-600"
                              : "text-red-600"
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
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
          <div className="w-full">
            <TransactionForm onSave={handleDataRefresh} />
          </div>

          <div className="w-full">
            <TransactionList
              key={refreshKey}
              onDataChange={handleDataRefresh}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8 mb-6 sm:mb-8">
          <div className="w-full">
            <FamilyGroups />
          </div>
          <div className="w-full">
            <ScheduledTasks />
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <SubscriptionStatus />
        </div>

        <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-success/10 border border-success/20 rounded-lg">
          <div className="flex items-start gap-2 sm:gap-3">
            <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-success mt-0.5 sm:mt-1 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-sm sm:text-base text-success mb-1 sm:mb-2">
                Sistema de Autenticação e Grupos Ativo! 🎉
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-2 sm:mb-3">
                Agora você pode criar grupos, compartilhar tarefas agendadas
                entre membros da família e receber notificações por email e
                push. Seus dados estão protegidos e sincronizados com o
                Supabase.
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                Use os "Grupos" para compartilhar tarefas com sua família usando
                o código de convite.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
