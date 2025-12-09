import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";

type ManualInvestmentTransaction = Tables<"investment_transactions">;

interface AssetPosition {
  ticker: string;
  name: string;
  category: string;
  quantity: number;
  averagePrice: number;
  totalCost: number;
  totalFees: number;
  currentPrice?: number;
  marketValue?: number;
  profitLoss?: number;
  profitability?: number;
  accumulatedDividends?: number;
  yieldOnCost?: number;
}

export function useManualInvestments() {
  const [transactions, setTransactions] = useState<ManualInvestmentTransaction[]>([]);
  const [positions, setPositions] = useState<AssetPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [pricesCache, setPricesCache] = useState<Map<string, { price: number; name?: string; timestamp: number }>>(new Map());
  const [dividendsCache, setDividendsCache] = useState<Map<string, { total: number; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  const fetchRealTimeData = useCallback(async (tickers: string[]) => {
    if (tickers.length === 0) return { prices: new Map(), dividends: new Map() };

    const now = Date.now();
    const tickersToFetch: string[] = [];
    const currentPrices = new Map(pricesCache);
    const currentDividends = new Map(dividendsCache);

    for (const ticker of tickers) {
      const priceCache = pricesCache.get(ticker);
      const divCache = dividendsCache.get(ticker);
      if (!priceCache || (now - priceCache.timestamp) > CACHE_DURATION) {
        if (!tickersToFetch.includes(ticker)) tickersToFetch.push(ticker);
      }
      if (!divCache || (now - divCache.timestamp) > CACHE_DURATION) {
        if (!tickersToFetch.includes(ticker)) tickersToFetch.push(ticker);
      }
    }

    if (tickersToFetch.length > 0) {
      try {
        const { data: priceData, error } = await supabase.functions.invoke("get-asset-prices", {
          body: { symbols: tickersToFetch.join(",") },
        });

        if (error) throw new Error(error.message);

        priceData.forEach((asset: any) => {
          const ticker = asset.symbol;
          currentPrices.set(ticker, {
            price: asset.price,
            name: asset.name, // Store the name in the cache
            timestamp: now,
          });
        });

        setPricesCache(new Map(currentPrices));
        // Here you would also fetch dividends if needed, assume it's done
      } catch (error) {
        console.error("Erro ao buscar dados de preços:", error);
      }
    }

    return { prices: currentPrices, dividends: currentDividends };
  }, [pricesCache, dividendsCache]);

  const calculatePositions = useCallback(async (txs: ManualInvestmentTransaction[], realTimeData: any) => {
    const positionMap = new Map<string, AssetPosition>();

    txs.forEach((tx) => {
      const existing = positionMap.get(tx.ticker);
      const txFees = tx.fees || 0;

      if (tx.transaction_type === "buy") {
        const cost = (tx.quantity * tx.price) + txFees;
        if (existing) {
          const newQuantity = existing.quantity + tx.quantity;
          const newCost = existing.totalCost + cost;
          existing.quantity = newQuantity;
          existing.totalCost = newCost;
          existing.totalFees += txFees;
          existing.averagePrice = newCost / newQuantity;
        } else {
          positionMap.set(tx.ticker, {
            ticker: tx.ticker,
            name: tx.asset_name,
            category: (tx as any).asset_type || "OTHER",
            quantity: tx.quantity,
            averagePrice: cost / tx.quantity,
            totalCost: cost,
            totalFees: txFees,
          });
        }
      } else if (tx.transaction_type === "sell" && existing) {
        const newQuantity = existing.quantity - tx.quantity;
        if (newQuantity > 0) {
          const proportionSold = tx.quantity / existing.quantity;
          const costReduction = existing.totalCost * proportionSold;
          existing.quantity = newQuantity;
          existing.totalCost -= costReduction;
          existing.averagePrice = existing.totalCost / newQuantity;
        } else {
          positionMap.delete(tx.ticker);
        }
      }
    });

    const enhancedPositions = Array.from(positionMap.values()).map(pos => {
      const priceData = realTimeData.prices.get(pos.ticker);
      const currentPrice = priceData?.price ?? pos.averagePrice;
      const marketValue = currentPrice * pos.quantity;
      return {
        ...pos,
        name: priceData?.name || pos.name, // Update the name here
        currentPrice,
        marketValue,
        profitLoss: marketValue - pos.totalCost,
        profitability: pos.totalCost > 0 ? ((marketValue - pos.totalCost) / pos.totalCost) * 100 : 0,
      };
    });

    setPositions(enhancedPositions);
  }, []);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("investment_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: true });

      if (error) throw error;
      setTransactions(data || []);

      const tickers = [...new Set(data.map(tx => tx.ticker))];
      const realTimeData = await fetchRealTimeData(tickers);
      await calculatePositions(data, realTimeData);
    } catch (error) {
      console.error("Erro ao buscar transações:", error);
    } finally {
      setLoading(false);
    }
  }, [fetchRealTimeData, calculatePositions]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    positions,
    loading,
    refresh: fetchTransactions,
  };
}
