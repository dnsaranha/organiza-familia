import { useState, useEffect, useCallback } from "react";
import { b3Client } from "@/lib/b3/client";
import { B3Asset, B3Portfolio, B3Dividend } from "@/lib/open-banking/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calculateManualPositions, Transaction } from "@/lib/finance-utils";

const DIVIDEND_CACHE_KEY = "dividends_last_fetch_date";
const DIVIDEND_TICKERS_KEY = "dividends_fetched_tickers";

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function shouldFetchDividends(): boolean {
  const lastFetch = localStorage.getItem(DIVIDEND_CACHE_KEY);
  return lastFetch !== getTodayStr();
}

function markDividendsFetched(tickers: string[]) {
  localStorage.setItem(DIVIDEND_CACHE_KEY, getTodayStr());
  localStorage.setItem(DIVIDEND_TICKERS_KEY, JSON.stringify(tickers));
}

function getFetchedTickers(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DIVIDEND_TICKERS_KEY) || "[]");
  } catch {
    return [];
  }
}

export const useB3Data = () => {
  const [assets, setAssets] = useState<B3Asset[]>([]);
  const [portfolio, setPortfolio] = useState<B3Portfolio | null>(null);
  const [dividends, setDividends] = useState<B3Dividend[]>([]);
  const [portfolioEvolution, setPortfolioEvolution] = useState<any[]>([]);
  const [enhancedAssets, setEnhancedAssets] = useState<any[]>([]);
  const [dividendHistory, setDividendHistory] = useState<any[]>([]);
  const [benchmarkData, setBenchmarkData] = useState<{
    value: number;
    change: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Cache para cotações (5 minutos)
  const [quotesCache, setQuotesCache] = useState<
    Map<string, { data: B3Asset; timestamp: number }>
  >(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  const getAssetQuotes = useCallback(
    async (symbols: string[], useCache = true) => {
      setLoading(true);
      try {
        const now = Date.now();
        const cachedQuotes: B3Asset[] = [];
        const symbolsToFetch: string[] = [];

        if (useCache) {
          symbols.forEach((symbol) => {
            const cached = quotesCache.get(symbol);
            if (cached && now - cached.timestamp < CACHE_DURATION) {
              cachedQuotes.push(cached.data);
            } else {
              symbolsToFetch.push(symbol);
            }
          });
        } else {
          symbolsToFetch.push(...symbols);
        }

        let freshQuotes: B3Asset[] = [];
        if (symbolsToFetch.length > 0) {
          const { data, error } = await supabase.functions.invoke("b3-quotes", {
            body: { symbols: symbolsToFetch },
          });

          if (error) {
            console.warn("Erro ao buscar cotações via Supabase, usando fallback:", error);
            freshQuotes = await b3Client.getQuotes(symbolsToFetch);
          } else {
            freshQuotes = data.quotes || [];
          }

          const newCache = new Map(quotesCache);
          freshQuotes.forEach((quote) => {
            newCache.set(quote.symbol, { data: quote, timestamp: now });
          });
          setQuotesCache(newCache);
        }

        const allQuotes = [...cachedQuotes, ...freshQuotes];
        setAssets(allQuotes);
        return allQuotes;
      } catch (error) {
        console.error("Erro ao buscar cotações:", error);
        toast({
          title: "Erro ao Buscar Cotações",
          description: "Não foi possível buscar as cotações dos ativos.",
          variant: "destructive",
        });
        return [];
      } finally {
        setLoading(false);
      }
    },
    [quotesCache, toast],
  );

  const getPortfolio = useCallback(
    async (brokerId: string, accessToken: string) => {
      setLoading(true);
      try {
        const portfolioData = await b3Client.getPortfolio(brokerId, accessToken);
        setPortfolio(portfolioData);
        setConnected(true);
        return portfolioData;
      } catch (error) {
        toast({
          title: "Erro ao Carregar Carteira",
          description: "Não foi possível carregar sua carteira de investimentos.",
          variant: "destructive",
        });
        setConnected(false);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const getDividends = useCallback(
    async (brokerId: string, accessToken: string, fromDate?: string, toDate?: string) => {
      setLoading(true);
      try {
        const dividendsData = await b3Client.getDividends(brokerId, accessToken, fromDate, toDate);
        setDividends(dividendsData);
        return dividendsData;
      } catch (error) {
        toast({
          title: "Erro ao Carregar Dividendos",
          description: "Não foi possível carregar os dividendos recebidos.",
          variant: "destructive",
        });
        return [];
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const searchAssets = useCallback(
    async (query: string, assetType?: string) => {
      setLoading(true);
      try {
        const searchResults = await b3Client.searchAssets(query, assetType);
        return searchResults;
      } catch (error) {
        toast({
          title: "Erro na Busca",
          description: "Não foi possível buscar ativos.",
          variant: "destructive",
        });
        return [];
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  const getAssetDetails = useCallback(
    async (symbol: string) => {
      setLoading(true);
      try {
        const assetDetails = await b3Client.getAssetDetails(symbol);
        return assetDetails;
      } catch (error) {
        toast({
          title: "Erro ao Carregar Detalhes",
          description: "Não foi possível carregar detalhes do ativo.",
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Helper: format ticker for Yahoo Finance
  const formatTickerForYahoo = (ticker: string): string => {
    if (ticker.match(/^[A-Z]{4}\d{1,2}$/)) return `${ticker}.SA`;
    return ticker.endsWith(".SA") ? ticker : `${ticker}.SA`;
  };

  // Fetch dividend data from yfinance edge function and store in financial_assets
  const fetchAndStoreDividends = useCallback(async (tickers: string[]): Promise<any[]> => {
    if (tickers.length === 0) return [];

    console.log(`Buscando dividendos completos para: ${tickers.join(", ")}`);
    
    try {
      const { data, error } = await supabase.functions.invoke("yfinance-data", {
        body: { tickers, fullHistory: true },
      });

      if (error) {
        console.error("Erro ao buscar dados yfinance:", error);
        return [];
      }

      const fetchedAssets = data?.assets || [];

      // Return formatted data for the component
      return fetchedAssets.map((asset: any) => ({
        ticker: asset.ticker,
        dividendHistory: asset.historico_dividendos || [],
      }));
    } catch (err) {
      console.error("Erro ao buscar/armazenar dividendos:", err);
      return [];
    }
  }, []);

  // Buscar dados de evolução patrimonial
  const getPortfolioEvolutionData = useCallback(
    async (period: string = "12m", hasManualData: boolean = false) => {
      setLoading(true);
      try {
        if (user) {
          let manualPositions: any[] = [];
          const { data: manualTransactions } = await supabase
            .from("investment_transactions")
            .select("*")
            .eq("user_id", user.id);

          if (manualTransactions && manualTransactions.length > 0) {
            manualPositions = calculateManualPositions(manualTransactions as Transaction[]);
          }

          let pluggyInvestments: any[] = [];
          const { data: pluggyItems } = await supabase
            .from("pluggy_items")
            .select("item_id")
            .eq("user_id", user.id);

          if (pluggyItems && pluggyItems.length > 0) {
            const investmentPromises = pluggyItems.map((item) =>
              supabase.functions.invoke("pluggy-investments", {
                body: { itemId: item.item_id },
              }),
            );
            const investmentResults = await Promise.all(investmentPromises);
            pluggyInvestments = investmentResults.flatMap(
              (result) => result.data?.investments || [],
            );
          }

          if (manualPositions.length > 0 || pluggyInvestments.length > 0) {
            const manualTickers = manualPositions.map(p => formatTickerForYahoo(p.ticker));
            const pluggyTickers = pluggyInvestments.map(inv => {
              const name = inv.name || inv.code || "";
              const match = name.match(/([A-Z]{4}\d{1,2})/g);
              return match ? `${match[0]}.SA` : null;
            }).filter(Boolean) as string[];

            const allTickers = [...new Set([...manualTickers, ...pluggyTickers])];

            if (allTickers.length > 0) {
              const { data: dbAssets, error: dbError } = await supabase
                .from("financial_assets")
                .select("*")
                .in("ticker", allTickers);

              if (!dbError && dbAssets) {
                const assetsMap = dbAssets.map(asset => ({
                  ticker: asset.ticker,
                  preco_atual: asset.current_price,
                  historico_precos: asset.price_history || [],
                  historico_dividendos: asset.dividend_history || []
                }));

                const evolutionData = [];
                const months = 12;
                const now = new Date();

                for (let i = months - 1; i >= 0; i--) {
                  const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                  const monthKey = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

                  let totalMarketValue = 0;
                  let totalCost = 0;
                  let totalDividends = 0;

                  manualPositions.forEach(pos => {
                    const ticker = formatTickerForYahoo(pos.ticker);
                    const assetData = assetsMap.find((a: any) => a.ticker === ticker);

                    if (assetData && assetData.historico_precos && Array.isArray(assetData.historico_precos)) {
                      const priceEntry = assetData.historico_precos.find((h: any) => {
                        const hDate = new Date(h.date);
                        return hDate.getMonth() === date.getMonth() && hDate.getFullYear() === date.getFullYear();
                      });

                      const price = priceEntry && typeof priceEntry === 'object' && 'close' in priceEntry && typeof priceEntry.close === 'number'
                        ? priceEntry.close
                        : (i === 0 && typeof assetData.preco_atual === 'number' ? assetData.preco_atual : pos.averagePrice);
                      totalMarketValue += price * pos.quantity;
                      totalCost += pos.totalCost;
                    }

                    if (assetData && assetData.historico_dividendos && Array.isArray(assetData.historico_dividendos)) {
                      const monthDividends = assetData.historico_dividendos
                        .filter((d: any) => {
                          const dDate = new Date(d.date);
                          return dDate.getMonth() === date.getMonth() && dDate.getFullYear() === date.getFullYear();
                        })
                        .reduce((sum: number, d: any) => {
                          const amount = typeof d.amount === 'number' ? d.amount : 0;
                          return sum + (amount * pos.quantity);
                        }, 0) as number;
                      totalDividends += monthDividends;
                    }
                  });

                  pluggyInvestments.forEach(inv => {
                    totalMarketValue += inv.balance;
                    totalCost += inv.balance;
                  });

                  const profitability = totalCost > 0 ? ((totalMarketValue - totalCost) / totalCost) * 100 : 0;

                  evolutionData.push({
                    month: monthKey,
                    profitability,
                    cdi: 0.8 + (Math.random() * 0.2),
                    marketValue: totalMarketValue,
                    operations: 0,
                    costs: 0,
                    dividends: totalDividends
                  });
                }

                setPortfolioEvolution(evolutionData);
                return evolutionData;
              }
            }
          }
        }

        if (hasManualData) {
          setPortfolioEvolution([]);
          return [];
        }

        const evolutionData = await b3Client.getPortfolioEvolution(period);
        setPortfolioEvolution(evolutionData);
        return evolutionData;
      } catch (error) {
        console.error("Erro ao carregar evolução patrimonial:", error);
        toast({
          title: "Erro ao Carregar Evolução",
          description: "Não foi possível carregar dados de evolução patrimonial.",
          variant: "destructive",
        });
        const fallbackData = await b3Client.getPortfolioEvolution(period);
        setPortfolioEvolution(fallbackData);
        return fallbackData;
      } finally {
        setLoading(false);
      }
    },
    [toast, user],
  );

  // Buscar ativos detalhados com integração Yahoo Finance
  const getEnhancedAssetsData = useCallback(async (hasManualData: boolean = false) => {
    setLoading(true);
    try {
      if (user) {
        let pluggyInvestments: any[] = [];
        const { data: pluggyItems } = await supabase
          .from("pluggy_items")
          .select("item_id")
          .eq("user_id", user.id);

        if (pluggyItems && pluggyItems.length > 0) {
          const investmentPromises = pluggyItems.map((item) =>
            supabase.functions.invoke("pluggy-investments", {
              body: { itemId: item.item_id },
            }),
          );
          const investmentResults = await Promise.all(investmentPromises);
          pluggyInvestments = investmentResults.flatMap(
            (result) => result.data?.investments || [],
          );
        }

        let manualPositions: any[] = [];
        const { data: manualTransactions } = await supabase
          .from("investment_transactions")
          .select("*")
          .eq("user_id", user.id);

        if (manualTransactions && manualTransactions.length > 0) {
          manualPositions = calculateManualPositions(manualTransactions as Transaction[]);
        }

        if (pluggyInvestments.length > 0 || manualPositions.length > 0) {
          const pluggyTickers = pluggyInvestments
            .map((inv) => {
              const name = inv.name || inv.code || "";
              const tickerMatch = name.match(/([A-Z]{4}\d{1,2})/g);
              return tickerMatch && tickerMatch[0] ? `${tickerMatch[0]}.SA` : null;
            })
            .filter(Boolean) as string[];

          const manualTickers = manualPositions.map(p => formatTickerForYahoo(p.ticker));
          const allTickers = [...new Set([...pluggyTickers, ...manualTickers])];

          let yfinanceData: any[] = [];
          if (allTickers.length > 0) {
            try {
              const { data: dbAssets, error: dbError } = await supabase
                .from("financial_assets")
                .select("*")
                .in("ticker", allTickers);

              const assetsFound: Set<string> = new Set();

              if (!dbError && dbAssets) {
                yfinanceData = dbAssets.map(asset => {
                  assetsFound.add(asset.ticker);
                  return {
                    ticker: asset.ticker,
                    nome: asset.name,
                    setor: asset.sector,
                    preco_atual: asset.current_price,
                    dividendos_12m: asset.dividends_12m,
                    historico_precos: asset.price_history || [],
                    historico_dividendos: asset.dividend_history || []
                  };
                });
              }

              const missingTickers = allTickers.filter(t => !assetsFound.has(t));

              if (missingTickers.length > 0) {
                console.log(`Tentando buscar ${missingTickers.length} ativos faltantes via Edge Function...`);
                const { data: edgeData, error: edgeError } =
                  await supabase.functions.invoke("yfinance-data", {
                    body: { tickers: missingTickers },
                  });

                if (!edgeError && edgeData?.assets) {
                  yfinanceData = [...yfinanceData, ...edgeData.assets];
                }
              }
            } catch (err) {
              console.warn("Erro ao buscar dados de ativos:", err);
            }
          }

          // Merge Data
          const enhancedPluggy = pluggyInvestments.map((inv) => {
            const name = inv.name || inv.code || "N/A";
            const tickerMatch = name.match(/([A-Z]{4}\d{1,2})/g);
            const ticker = tickerMatch ? `${tickerMatch[0]}.SA` : null;

            const yfinanceAsset = ticker
              ? yfinanceData.find((asset) => asset.ticker === ticker)
              : null;

            const currentPrice = yfinanceAsset?.preco_atual || inv.balance / (inv.quantity || 1);
            const quantity = inv.quantity || 1;
            const marketValue = currentPrice * quantity;
            const cost = inv.balance || marketValue;
            const profitLoss = marketValue - cost;
            const profitability = cost > 0 ? (profitLoss / cost) * 100 : 0;
            const accumulatedDividends = yfinanceAsset?.dividendos_12m || 0;
            const yieldOnCost = cost > 0 && accumulatedDividends > 0 ? (accumulatedDividends / cost) * 100 : 0;

            return {
              symbol: tickerMatch ? tickerMatch[0] : name,
              name: yfinanceAsset?.nome || inv.name || "Investimento",
              type: inv.type,
              subtype: inv.subtype,
              currentPrice,
              quantity,
              marketValue,
              cost,
              averagePrice: cost / quantity,
              yieldOnCost,
              accumulatedDividends,
              profitLoss,
              profitability,
            };
          });

          const enhancedManual = manualPositions.map((pos) => {
            const lookupTicker = formatTickerForYahoo(pos.ticker);
            const yfinanceAsset = yfinanceData.find((asset) => asset.ticker === lookupTicker);

            const currentPrice = yfinanceAsset?.preco_atual || pos.averagePrice;
            const marketValue = currentPrice * pos.quantity;
            const cost = pos.totalCost;
            const profitLoss = marketValue - cost;
            const profitability = cost > 0 ? (profitLoss / cost) * 100 : 0;

            const dividendPerShare = yfinanceAsset?.dividendos_12m || 0;
            const totalDividendsReceived = dividendPerShare * pos.quantity;
            const yieldOnCostCalc = pos.averagePrice > 0 ? (dividendPerShare / pos.averagePrice) * 100 : 0;

            return {
              symbol: pos.ticker,
              name: yfinanceAsset?.nome || pos.asset_name,
              type: pos.asset_type,
              subtype: null,
              currentPrice,
              quantity: pos.quantity,
              marketValue,
              cost: pos.totalCost,
              averagePrice: pos.averagePrice,
              yieldOnCost: yieldOnCostCalc,
              accumulatedDividends: totalDividendsReceived,
              profitLoss,
              profitability,
            };
          });

          const enhancedPluggyFixed = enhancedPluggy.map(p => {
            const divPerShare = p.accumulatedDividends;
            const totalDivs = divPerShare * p.quantity;
            const yoc = p.averagePrice > 0 ? (divPerShare / p.averagePrice) * 100 : 0;
            return { ...p, accumulatedDividends: totalDivs, yieldOnCost: yoc };
          });

          setEnhancedAssets([...enhancedPluggyFixed, ...enhancedManual]);
          return [...enhancedPluggyFixed, ...enhancedManual];
        }
      }

      if (hasManualData) {
        setEnhancedAssets([]);
        return [];
      }

      const assetsData = await b3Client.getEnhancedAssets();
      setEnhancedAssets(assetsData);
      return assetsData;
    } catch (error) {
      console.error("Erro ao carregar ativos detalhados:", error);
      toast({
        title: "Erro ao Carregar Ativos",
        description: "Não foi possível carregar dados detalhados dos ativos.",
        variant: "destructive",
      });
      const fallbackData = await b3Client.getEnhancedAssets();
      setEnhancedAssets(fallbackData);
      return fallbackData;
    } finally {
      setLoading(false);
    }
  }, [toast, user]);

  // Buscar histórico de dividendos dos ativos do usuário
  // Combines DB data + live yfinance data for missing/stale tickers
  const getDividendHistoryData = useCallback(async (changedTickers?: string[]) => {
    setLoading(true);
    try {
      if (!user) {
        setDividendHistory([]);
        return [];
      }

      // 1. Get user's tickers
      const { data: manualTransactions } = await supabase
        .from("investment_transactions")
        .select("ticker")
        .eq("user_id", user.id);

      if (!manualTransactions || manualTransactions.length === 0) {
        setDividendHistory([]);
        return [];
      }

      const uniqueTickers = [...new Set(
        manualTransactions.map(t => formatTickerForYahoo(t.ticker))
      )];

      // Determine which tickers need fresh data
      let tickersToFetch: string[] = [];

      if (changedTickers && changedTickers.length > 0) {
        // Only fetch the specific changed tickers
        tickersToFetch = changedTickers.map(t => formatTickerForYahoo(t));
      } else if (shouldFetchDividends()) {
        // First visit of the day: fetch all
        tickersToFetch = uniqueTickers;
      } else {
        // Check for new tickers not previously fetched
        const previouslyFetched = getFetchedTickers();
        tickersToFetch = uniqueTickers.filter(t => !previouslyFetched.includes(t));
      }

      // 2. Get existing data from DB
      const { data: dbData, error: dbError } = await supabase
        .from("financial_assets")
        .select("ticker, dividend_history")
        .in("ticker", uniqueTickers);

      let dbHistoryMap = new Map<string, any[]>();
      if (!dbError && dbData) {
        dbData.forEach(asset => {
          dbHistoryMap.set(asset.ticker, (asset.dividend_history as any[]) || []);
        });
      }

      // 3. Fetch fresh data for tickers that need it
      if (tickersToFetch.length > 0) {
        console.log(`Buscando dividendos atualizados para: ${tickersToFetch.join(", ")}`);
        const freshData = await fetchAndStoreDividends(tickersToFetch);

        // Merge fresh data into the map
        freshData.forEach(item => {
          dbHistoryMap.set(item.ticker, item.dividendHistory);
        });
      }

      // Mark as fetched today
      markDividendsFetched(uniqueTickers);

      // 4. Build final result for all user tickers
      const historyData = uniqueTickers
        .map(ticker => ({
          ticker,
          dividendHistory: dbHistoryMap.get(ticker) || []
        }))
        .filter(item => item.dividendHistory.length > 0);

      setDividendHistory(historyData);
      return historyData;
    } catch (error) {
      console.error("Erro ao carregar histórico de dividendos:", error);
      toast({
        title: "Erro ao Carregar Histórico",
        description: "Não foi possível carregar histórico de dividendos.",
        variant: "destructive",
      });
      return [];
    } finally {
      setLoading(false);
    }
  }, [toast, user, fetchAndStoreDividends]);

  // Buscar dados de benchmark
  const getBenchmarkData = useCallback(
    async (benchmark: string = "CDI") => {
      setLoading(true);
      try {
        const data = await b3Client.getBenchmarkData(benchmark);
        setBenchmarkData(data);
        return data;
      } catch (error) {
        toast({
          title: "Erro ao Carregar Benchmark",
          description: "Não foi possível carregar dados de benchmark.",
          variant: "destructive",
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  // Limpar cache quando necessário
  const clearCache = useCallback(() => {
    setQuotesCache(new Map());
    localStorage.removeItem(DIVIDEND_CACHE_KEY);
    localStorage.removeItem(DIVIDEND_TICKERS_KEY);
  }, []);

  return {
    assets,
    portfolio,
    dividends,
    portfolioEvolution,
    enhancedAssets,
    dividendHistory,
    benchmarkData,
    loading,
    connected,
    getAssetQuotes,
    getPortfolio,
    getDividends,
    getPortfolioEvolutionData,
    getEnhancedAssetsData,
    getDividendHistoryData,
    getBenchmarkData,
    searchAssets,
    getAssetDetails,
    clearCache,
  };
};
