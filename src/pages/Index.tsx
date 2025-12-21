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
  Bell,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

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
      <main>
        <Header />

        <PWAInstallPrompt />

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="xl:col-span-2">
            <FinancialSummaryCard
              balance={monthlyBalance}
              income={financialData?.monthlyIncome ?? 0}
              expenses={financialData?.monthlyExpenses ?? 0}
              isLoading={loadingData || bankLoading}
            />
          </section>

          {bankConnected && accounts.length > 0 && (
            <section className="flex flex-col justify-center rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Contas Bancárias</h3>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <CreditCard className="h-4 w-4" />
                </Button>
              </div>
              <div className="scrollbar-hide flex snap-x snap-mandatory space-x-4 overflow-x-auto pb-2">
                {accounts
                  .filter((acc) => acc.type === 'BANK')
                  .map((account) => (
                    <div
                      key={account.id}
                      className="group relative h-28 w-64 flex-none snap-center rounded-lg bg-muted/30 p-4"
                    >
                      <div>
                        <p className="flex items-center text-sm font-medium text-foreground">
                          <Wallet className="mr-1 h-4 w-4 text-muted-foreground" />
                          {account.marketingName || account.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {mapAccountSubtype(account.subtype)}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-foreground" translate="no">
                        {account.balance.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: account.currency || 'BRL',
                        })}
                      </p>
                    </div>
                  ))}
              </div>
              <div className="mt-2 flex justify-center space-x-1">
                {Array.from({ length: accounts.filter(acc => acc.type === 'BANK').length }).map((_, i) => (
                  <div key={i} className={`h-1.5 w-1.5 rounded-full ${i === 0 ? 'bg-primary' : 'bg-muted'}`} />
                ))}
              </div>
            </section>
          )}
        </div>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="xl:col-span-2 space-y-6">

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
                          <p className="text-[10px] sm:text-xs text-muted-foreground" translate="no">
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
                          translate="no"
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <TransactionForm onTransactionChange={handleDataRefresh} />
          <TransactionList key={refreshKey} onTransactionChange={handleDataRefresh} />
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <FamilyGroups />
            <ScheduledTasks />
        </div>
        </div>
        <div className="xl:col-span-1 space-y-6">
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
