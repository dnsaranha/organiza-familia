import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FinancialSummaryCard } from "@/components/FinancialSummaryCard";
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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { TransactionForm } from "@/components/TransactionForm";
import { mapAccountSubtype } from "@/lib/account-mapping";
import {
  Wallet,
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
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [quickAddType, setQuickAddType] = useState<'income' | 'expense' | null>(null);
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

  useEffect(() => {
    const handleTransactionUpdate = () => {
      handleDataRefresh();
    };
    window.addEventListener("transaction-updated", handleTransactionUpdate);
    return () => {
      window.removeEventListener("transaction-updated", handleTransactionUpdate);
    };
  }, []);

  const fetchFinancialData = async () => {
    if (!user) return;
    setLoadingData(true);

    try {
      // 1. Fetch User Preferences
      const { data: preferences } = await supabase
        .from("user_preferences")
        .select("month_start_day, carry_over_balance")
        .eq("user_id", user.id)
        .maybeSingle();

      const monthStartDay = preferences?.month_start_day || 1;
      const carryOverBalance = preferences?.carry_over_balance || false;

      // 2. Fetch all transactions (manual and bank)
      let query = supabase.from("transactions").select("type, amount, date");
      if (scope === "personal") {
        query = query.is("group_id", null).eq("user_id", user.id);
      } else {
        query = query.eq("group_id", scope);
      }
      const { data: manualTransactions, error } = await query;
      if (error) throw error;
      
      const combinedTransactions = [
        ...(manualTransactions || []).map((t) => ({ ...t, source: "manual" })),
        ...(bankTransactions || []).map((t) => ({
          ...t,
          type: t.amount > 0 ? "income" : "expense",
          source: "open_banking",
        })),
      ];

      // 3. Define current financial month dates
      const now = new Date();
      let monthStartDate = new Date(now.getFullYear(), now.getMonth(), monthStartDay);
      if (now.getDate() < monthStartDay) {
        monthStartDate.setMonth(monthStartDate.getMonth() - 1);
      }
      monthStartDate.setHours(0, 0, 0, 0); // Start of the day

      // 4. Process all transactions based on preferences
      let monthlyIncome = 0;
      let monthlyExpenses = 0;
      let previousBalance = 0;

      for (const t of combinedTransactions) {
        const transactionDate = new Date(t.date);

        if (transactionDate >= monthStartDate) {
          // Transactions within the current financial month
          if (t.type === "income") {
            monthlyIncome += Math.abs(t.amount);
          } else {
            monthlyExpenses += Math.abs(t.amount);
          }
        } else {
          // Transactions before the current financial month
          if (t.type === "income") {
            previousBalance += Math.abs(t.amount);
          } else {
            previousBalance -= Math.abs(t.amount);
          }
        }
      }

      // 5. Calculate final balance based on carryOverBalance preference
      const finalBalance = carryOverBalance
        ? previousBalance + monthlyIncome - monthlyExpenses
        : monthlyIncome - monthlyExpenses;

      setFinancialData({
        balance: finalBalance,
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

  const handleQuickAddSaved = () => {
    setQuickAddType(null);
    handleDataRefresh();
  };

  if (authLoading || (loadingData && !financialData)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground text-sm">Carregando seus dados...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-12">
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-6 md:py-8 max-w-7xl space-y-6 sm:space-y-8">
        {/* Header Greeting */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Visão Geral
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Acompanhe seu fluxo de caixa e compromissos do mês
            </p>
          </div>
        </div>

        <PWAInstallPrompt />

        {/* 1. Core Summary Card with Thermometer & Quick Actions */}
        <div>
          <FinancialSummaryCard
            balance={financialData?.balance ?? 0}
            income={financialData?.monthlyIncome ?? 0}
            expenses={financialData?.monthlyExpenses ?? 0}
            isLoading={loadingData || bankLoading}
            onQuickAdd={(type) => setQuickAddType(type)}
          />
        </div>

        {/* Bank & Credit Card Overview (if connected) */}
        {bankConnected && accounts.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bank Accounts */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                  <h3 className="text-sm font-semibold">Contas Bancárias</h3>
                </div>
                <div className="flex overflow-x-auto gap-3 pb-2 snap-x md:grid md:grid-cols-2 scrollbar-hide">
                  {accounts
                    .filter((acc) => acc.type === "BANK")
                    .map((account) => (
                      <div
                        key={account.id}
                        className="p-3 bg-card border rounded-xl snap-center min-w-[70%] sm:min-w-[45%] md:min-w-0 flex-shrink-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-medium truncate">
                            {account.marketingName || account.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-1 truncate">
                          {mapAccountSubtype(account.subtype)}
                        </p>
                        <p className="text-sm sm:text-base font-bold truncate" translate="no">
                          {account.balance.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: account.currency || "BRL",
                          })}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Credit Cards */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-primary flex-shrink-0" />
                  <h3 className="text-sm font-semibold">Cartões de Crédito</h3>
                </div>
                <div className="flex overflow-x-auto gap-3 pb-2 snap-x md:grid md:grid-cols-2 scrollbar-hide">
                  {accounts
                    .filter((acc) => acc.type === "CREDIT")
                    .map((account) => (
                      <div
                        key={account.id}
                        className="p-3 bg-card border rounded-xl snap-center min-w-[70%] sm:min-w-[45%] md:min-w-0 flex-shrink-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <CreditCard className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs font-medium truncate">
                            {account.marketingName || account.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mb-1 truncate">
                          {account.brand
                            ? `${account.brand} - ${mapAccountSubtype(account.subtype)}`
                            : mapAccountSubtype(account.subtype)}
                        </p>
                        <p className="text-sm sm:text-base font-bold truncate" translate="no">
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
              <Card className="mt-2">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm font-semibold">
                    Últimas Transações Bancárias
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3">
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {bankTransactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex justify-between items-center gap-2 p-2 bg-muted/30 rounded-lg text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {transaction.description}
                          </p>
                          <p className="text-[10px] text-muted-foreground" translate="no">
                            {new Date(transaction.date).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <span
                          className={`font-semibold whitespace-nowrap ${
                            transaction.amount >= 0 ? "text-emerald-600" : "text-rose-600"
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
        )}

        {/* 2. Main Transaction List */}
        <div>
          <TransactionList
            key={refreshKey}
            onTransactionChange={handleDataRefresh}
          />
        </div>

        {/* 3. Planning & Coordination Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="w-full">
            <ScheduledTasks />
          </div>
          <div className="w-full">
            <FamilyGroups />
          </div>
        </div>

        {/* Subscription / Plan Status (subtle & non-intrusive) */}
        <div>
          <SubscriptionStatus />
        </div>
      </main>

      {/* Quick Add Transaction Modal */}
      <Dialog open={quickAddType !== null} onOpenChange={(open) => !open && setQuickAddType(null)}>
        <DialogContent className="sm:max-w-[425px] p-0 overflow-hidden bg-transparent border-none shadow-none">
          <DialogTitle className="sr-only">Lançamento Rápido</DialogTitle>
          {quickAddType && (
            <TransactionForm
              initialType={quickAddType}
              onSave={handleQuickAddSaved}
              onCancel={() => setQuickAddType(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
