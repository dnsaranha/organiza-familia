import { supabase } from '@/integrations/supabase/client';
import {
  AIChatFinancialCategory,
  AIChatFinancialContext,
  AIChatGoalItem,
  AIChatInvestmentItem,
  AIChatRecentTransaction,
  AIChatUpcomingBill,
} from '@/types/ai';

export const financialContextService = {
  async buildFinancialContext(userId: string): Promise<AIChatFinancialContext> {
    const summary: AIChatFinancialContext = {};

    try {
      // 1. Transactions & Spending / Consumption (Current Month & Recent)
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

      // Fetch current month transactions for totals and categories
      const { data: monthTrans } = await supabase
        .from('transactions')
        .select('amount, type, category, date, description, payment_method')
        .eq('user_id', userId)
        .gte('date', startOfMonth)
        .order('date', { ascending: false });

      if (monthTrans && monthTrans.length > 0) {
        let income = 0;
        let expenses = 0;
        const catMap: Record<string, number> = {};

        monthTrans.forEach((t) => {
          const val = Number(t.amount) || 0;
          if (t.type === 'income') {
            income += val;
          } else {
            expenses += val;
            const cat = t.category || 'Outros';
            catMap[cat] = (catMap[cat] || 0) + val;
          }
        });

        summary.monthlyIncome = income;
        summary.monthlyExpenses = expenses;
        summary.balance = income - expenses;
        summary.savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

        // Top categories sorted by expense amount
        const sortedCats: AIChatFinancialCategory[] = Object.entries(catMap)
          .sort((a, b) => b[1] - a[1])
          .map(([category, amount]) => ({
            category,
            amount,
            percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
          }));

        summary.topCategories = sortedCats.slice(0, 6);
        if (sortedCats.length > 0) {
          summary.topCategory = sortedCats[0].category;
        }

        // Recent 8 transactions formatted
        summary.recentTransactions = monthTrans.slice(0, 8).map((t) => ({
          date: t.date ? t.date.split('T')[0] : '',
          description: t.description || 'Lançamento',
          category: t.category || 'Geral',
          amount: Number(t.amount) || 0,
          type: t.type as 'income' | 'expense',
          paymentMethod: t.payment_method || undefined,
        }));
      } else {
        // If no transactions this month, fetch recent 8 transactions regardless of month
        const { data: recentTrans } = await supabase
          .from('transactions')
          .select('amount, type, category, date, description, payment_method')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(8);

        if (recentTrans && recentTrans.length > 0) {
          summary.recentTransactions = recentTrans.map((t) => ({
            date: t.date ? t.date.split('T')[0] : '',
            description: t.description || 'Lançamento',
            category: t.category || 'Geral',
            amount: Number(t.amount) || 0,
            type: t.type as 'income' | 'expense',
            paymentMethod: t.payment_method || undefined,
          }));
        }
      }

      // 2. Investments (Portfolio & Positions)
      const { data: invTxs } = await supabase
        .from('investment_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('transaction_date', { ascending: true });

      if (invTxs && invTxs.length > 0) {
        interface Pos {
          ticker: string;
          assetName: string;
          assetType: string;
          quantity: number;
          totalCost: number;
          averagePrice: number;
        }

        const positions = new Map<string, Pos>();

        invTxs.forEach((tx) => {
          const ticker = (tx.ticker || '').toUpperCase().trim();
          if (!ticker) return;
          const fees = Number(tx.fees) || 0;
          const qty = Number(tx.quantity) || 0;
          const price = Number(tx.price) || 0;
          const cost = qty * price + fees;
          const existing = positions.get(ticker);

          if (tx.transaction_type === 'buy') {
            if (existing) {
              const newQty = existing.quantity + qty;
              const newCost = existing.totalCost + cost;
              existing.quantity = newQty;
              existing.totalCost = newCost;
              existing.averagePrice = newQty > 0 ? newCost / newQty : 0;
            } else {
              positions.set(ticker, {
                ticker,
                assetName: tx.asset_name || ticker,
                assetType: tx.asset_type || tx.category || 'Outros',
                quantity: qty,
                totalCost: cost,
                averagePrice: qty > 0 ? cost / qty : price,
              });
            }
          } else if (tx.transaction_type === 'sell' && existing) {
            const newQty = existing.quantity - qty;
            if (newQty > 0) {
              const proportionSold = qty / existing.quantity;
              existing.totalCost = Math.max(0, existing.totalCost * (1 - proportionSold));
              existing.quantity = newQty;
              existing.averagePrice = newQty > 0 ? existing.totalCost / newQty : 0;
            } else {
              positions.delete(ticker);
            }
          }
        });

        const activePortfolio: AIChatInvestmentItem[] = [];
        let totalInvested = 0;
        const allocMap: Record<string, number> = {};

        positions.forEach((pos) => {
          if (pos.quantity > 0) {
            activePortfolio.push({
              ticker: pos.ticker,
              assetName: pos.assetName,
              assetType: pos.assetType,
              quantity: pos.quantity,
              averagePrice: pos.averagePrice,
              totalCost: pos.totalCost,
            });
            totalInvested += pos.totalCost;
            const cat = pos.assetType || 'Renda Variável';
            allocMap[cat] = (allocMap[cat] || 0) + pos.totalCost;
          }
        });

        summary.totalInvested = totalInvested;
        summary.portfolioItems = activePortfolio;

        // Investment allocations by category with percentage
        const allocations: Record<string, { amount: number; percentage: number }> = {};
        Object.entries(allocMap).forEach(([k, amt]) => {
          allocations[k] = {
            amount: amt,
            percentage: totalInvested > 0 ? (amt / totalInvested) * 100 : 0,
          };
        });
        summary.investmentAllocations = allocations;
      }

      // 3. Goals (savings_goals)
      const { data: goals } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (goals && goals.length > 0) {
        summary.activeGoalsCount = goals.length;
        summary.goals = goals.slice(0, 5).map((g) => {
          const target = Number(g.target_amount) || 0;
          const current = Number(g.current_amount) || 0;
          return {
            title: g.title,
            targetAmount: target,
            currentAmount: current,
            progressPercentage: target > 0 ? Math.min(100, (current / target) * 100) : 0,
            deadline: g.deadline ? g.deadline.split('T')[0] : undefined,
          };
        });
      }

      // 4. Upcoming Bills (scheduled_tasks)
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: upcoming } = await supabase
        .from('scheduled_tasks')
        .select('title, value, schedule_date, category')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .gte('schedule_date', todayStr)
        .order('schedule_date', { ascending: true })
        .limit(5);

      if (upcoming && upcoming.length > 0) {
        summary.upcomingBills = upcoming.map((b) => ({
          title: b.title,
          amount: Number(b.value) || 0,
          dueDate: b.schedule_date ? b.schedule_date.split('T')[0] : '',
          category: b.category || undefined,
        }));
      }
    } catch (err) {
      console.warn('Erro ao construir contexto financeiro analítico:', err);
    }

    return summary;
  },
};
