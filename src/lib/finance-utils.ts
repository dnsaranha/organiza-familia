import { Tables } from "@/integrations/supabase/types";

// Re-exporting for broader use
export type InvestmentTransaction = Tables<'investment_transactions'>;
export type UserCategory = Tables<'user_categories'>;

export interface Position {
  ticker: string;
  asset_name: string;
  asset_type: string;
  quantity: number;
  totalCost: number;
  averagePrice: number;
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
      }
    }

    if (quantity > 0.000001) {
        positions.push({
            ticker,
            asset_name: assetName,
            asset_type: assetType,
            quantity,
            totalCost: totalCostBasis,
            averagePrice: totalCostBasis / quantity
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
  categories: UserCategory[],
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
