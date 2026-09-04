import { Tables } from "@/integrations/supabase/types";
import {
  calculateFixedIncomeYield,
  FixedIncomeCalculationResult,
} from "@/lib/fixed-income-calculator";

// Re-exporting for broader use
export type InvestmentTransaction = Tables<'investment_transactions'>;
export type Transaction = Tables<'investment_transactions'>; // Alias for compatibility
export type UserCategory = Tables<'user_categories'>;
export interface Position {
  ticker: string;
  asset_name: string;
  asset_type: string;
  quantity: number;
  totalCost: number;
  averagePrice: number;
  fixedIncome?: FixedIncomeCalculationResult;
}

/**
 * Calculates current investment positions based on a list of transactions.
 * @param transactions - A list of investment transactions.
 * @returns An array of calculated positions.
 */
export const calculateManualPositions = (transactions: InvestmentTransaction[]): Position[] => {
  const byTicker: Record<string, InvestmentTransaction[]> = {};

  transactions.forEach(t => {
    const ticker = t.ticker.toUpperCase();
    if (!byTicker[ticker]) byTicker[ticker] = [];
    byTicker[ticker].push(t);
  });

  const positions: Position[] = [];

  for (const ticker in byTicker) {
    const txs = byTicker[ticker].sort((a, b) =>
      new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
    );

    let quantity = 0;
    let totalCostBasis = 0;
    let assetName = txs[0]?.asset_name || ticker;
    let assetType = txs[0]?.asset_type || 'OTHER';

    for (const t of txs) {
      if (t.asset_name) assetName = t.asset_name;
      if (t.asset_type) assetType = t.asset_type;

      if (t.transaction_type === 'buy') {
        const cost = (t.quantity * t.price) + (t.fees || 0);
        totalCostBasis += cost;
        quantity += t.quantity;
      } else if (t.transaction_type === 'sell') {
         if (quantity > 0) {
            const avgPrice = totalCostBasis / quantity;
            const costOfSold = t.quantity * avgPrice;
            totalCostBasis -= costOfSold;
            quantity -= t.quantity;
         }
      } else if (t.transaction_type === 'split') {
        // Split: quantity increases, cost basis stays the same
        quantity += t.quantity;
      } else if (t.transaction_type === 'grouping') {
        // Agrupamento (reverse split): quantity decreases, cost basis stays the same
        if (quantity > 0) {
          quantity = Math.max(quantity - t.quantity, 0);
          if (quantity === 0) totalCostBasis = 0;
        }
      } else if (t.transaction_type === 'bonus') {
        // Bonificação: new shares received at no cost
        quantity += t.quantity;
      }
    }

    if (quantity > 0.000001) {
      let fixedIncomeResult: FixedIncomeCalculationResult | undefined = undefined;

      if (assetType === 'FIXED_INCOME' && totalCostBasis > 0) {
        const buyTxs = txs.filter(t => t.transaction_type === 'buy');
        const totalOriginalBought = buyTxs.reduce(
          (sum, t) => sum + (t.quantity * t.price) + (t.fees || 0),
          0
        );
        const remainingRatio = totalOriginalBought > 0 ? Math.min(1, totalCostBasis / totalOriginalBought) : 1;

        let aggregatedGross = 0;
        let aggregatedAccruedInterest = 0;
        let aggregatedNet = 0;
        let aggregatedIr = 0;
        let representativeResult: FixedIncomeCalculationResult | null = null;

        for (const t of buyTxs) {
          const txCost = ((t.quantity * t.price) + (t.fees || 0)) * remainingRatio;
          if (txCost <= 0) continue;

          let txRate: string | null = null;
          let txCategory: string | null = null;
          let txDueDate: string | null = null;

          if (t.notes) {
            const parts = t.notes.split(" | ");
            parts.forEach(p => {
              if (p.startsWith("Taxa: ")) txRate = p.replace("Taxa: ", "").trim();
              if (p.startsWith("Categoria: ")) txCategory = p.replace("Categoria: ", "").trim();
              if (p.startsWith("Vencimento: ")) txDueDate = p.replace("Vencimento: ", "").trim();
            });
          }

          const res = calculateFixedIncomeYield({
            initialAmount: txCost,
            startDate: t.transaction_date,
            rawRate: txRate,
            assetName: t.asset_name || assetName,
            category: txCategory,
            dueDate: txDueDate,
          });

          aggregatedGross += res.currentGrossAmount;
          aggregatedAccruedInterest += res.accruedInterest;
          aggregatedNet += res.currentNetAmount;
          aggregatedIr += res.irAmount;
          representativeResult = res;
        }

        if (representativeResult) {
          fixedIncomeResult = {
            ...representativeResult,
            initialAmount: Number(totalCostBasis.toFixed(2)),
            currentGrossAmount: Number(aggregatedGross.toFixed(2)),
            accruedInterest: Number(aggregatedAccruedInterest.toFixed(2)),
            profitabilityPercent: totalCostBasis > 0
              ? Number(((aggregatedAccruedInterest / totalCostBasis) * 100).toFixed(2))
              : 0,
            currentNetAmount: Number(aggregatedNet.toFixed(2)),
            netInterest: Number((aggregatedNet - totalCostBasis).toFixed(2)),
            irAmount: Number(aggregatedIr.toFixed(2)),
          };
        }
      }

      positions.push({
        ticker,
        asset_name: assetName,
        asset_type: assetType,
        quantity,
        totalCost: totalCostBasis,
        averagePrice: totalCostBasis / quantity,
        fixedIncome: fixedIncomeResult,
      });
    }
  }

  return positions;
};

/**
 * Auto-categorizes a transaction based on its description and user-defined category keywords.
 * @param description - The transaction description.
 * @param categories - An array of user-defined categories with their keywords.
 * @param type - The transaction type ('income' or 'expense').
 * @returns The name of the matched category or null if no match is found.
 */
export const autoCategorize = (
  description: string,
  categories: { name: string; type: string; keywords?: string[] | null }[],
  type: 'income' | 'expense'
): string | null => {
  if (!description || !categories) {
    return null;
  }

  const lowerCaseDescription = description.toLowerCase();

  // Create a map for faster lookups
  const categoryMap = new Map<string, string[]>();
  for (const category of categories) {
    if (category.type === type && category.keywords) {
        categoryMap.set(category.name, category.keywords.map(kw => kw.toLowerCase()));
    }
  }

  // Iterate through the map to find a match
  for (const [categoryName, keywords] of categoryMap.entries()) {
    for (const keyword of keywords) {
      // Using a regex with word boundaries to avoid partial matches (e.g., 'art' in 'cart')
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(lowerCaseDescription)) {
        return categoryName;
      }
    }
  }

  return null;
};