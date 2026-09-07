import { useState, useEffect, useCallback } from "react";
import { b3Client } from "@/lib/b3/client";
import { B3Asset, B3Portfolio, B3Dividend } from "@/lib/open-banking/types";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { calculateManualPositions, Transaction } from "@/lib/finance-utils";
import {
  formatTickerForYahoo,
  fetchDirectYahooData,
  fetchMultipleAssetsDirectly,
  DirectAssetData,
} from "@/lib/b3/marketData";

const DIVIDEND_CACHE_KEY = "dividends_last_fetch_date_v2";
const DIVIDEND_TICKERS_KEY = "dividends_fetched_tickers_v2";

const SESSION_CACHE_KEY_ASSETS = "b3_cache_enhanced_assets";
const SESSION_CACHE_KEY_EVOLUTION = "b3_cache_portfolio_evolution";
const SESSION_CACHE_KEY_DIVIDENDS = "b3_cache_dividend_history";

// Module-level persistent cache across navigation within the session
let memoryEnhancedAssets: any[] | null = null;
let memoryPortfolioEvolution: any[] | null = null;
let memoryDividendHistory: any[] | null = null;

interface RawInvestmentsCache {
  userId: string;
  timestamp: number;
  pluggyInvestments: any[];
  manualPositions: any[];
  manualTransactions: any[];
}

let memoryRawUserInvestments: RawInvestmentsCache | null = null;
let inFlightRawInvestmentsPromise: Promise<RawInvestmentsCache> | null = null;

async function getOrFetchRawUserInvestments(
  userId: string,
  forceRefresh: boolean = false
): Promise<{
  pluggyInvestments: any[];
  manualPositions: any[];
  manualTransactions: any[];
}> {
  const now = Date.now();
  const CACHE_TTL = 3 * 60 * 1000; // 3 minutos de cache em memória

  if (
    !forceRefresh &&
    memoryRawUserInvestments &&
    memoryRawUserInvestments.userId === userId &&
    now - memoryRawUserInvestments.timestamp < CACHE_TTL
  ) {
    return memoryRawUserInvestments;
  }

  if (inFlightRawInvestmentsPromise) {
    return inFlightRawInvestmentsPromise;
  }

  inFlightRawInvestmentsPromise = (async () => {
    try {
      const [pluggyItemsRes, manualTxRes] = await Promise.all([
        supabase
          .from("pluggy_items")
          .select("item_id")
          .eq("user_id", userId),
        supabase
          .from("investment_transactions")
          .select("*")
          .eq("user_id", userId),
      ]);

      let pluggyInvestments: any[] = [];
      const pluggyItems = pluggyItemsRes.data || [];
      if (pluggyItems.length > 0) {
        try {
          const investmentPromises = pluggyItems.map((item) =>
            supabase.functions.invoke("pluggy-investments", {
              body: { itemId: item.item_id },
            })
          );
          const investmentResults = await Promise.all(investmentPromises);
          pluggyInvestments = investmentResults.flatMap(
            (result) => result.data?.investments || []
          );
        } catch (pluggyErr) {
          console.warn("Aviso ao carregar pluggy-investments:", pluggyErr);
        }
      }

      const manualTransactions = (manualTxRes.data || []) as Transaction[];
      let manualPositions: any[] = [];
      if (manualTransactions.length > 0) {
        manualPositions = calculateManualPositions(manualTransactions);
      }

      const result: RawInvestmentsCache = {
        userId,
        timestamp: Date.now(),
        pluggyInvestments,
        manualPositions,
        manualTransactions,
      };

      memoryRawUserInvestments = result;
      return result;
    } finally {
      inFlightRawInvestmentsPromise = null;
    }
  })();

  return inFlightRawInvestmentsPromise;
}

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

  // Inicializa imediatamente com o cache de memória ou sessionStorage para renderização instantânea (0ms)
  const [portfolioEvolution, setPortfolioEvolutionState] = useState<any[]>(() => {
    if (memoryPortfolioEvolution && memoryPortfolioEvolution.length > 0) return memoryPortfolioEvolution;
    try {
      const s = sessionStorage.getItem(SESSION_CACHE_KEY_EVOLUTION);
      if (s) return JSON.parse(s);
    } catch (_e) {
      // Ignora erro de parse de cache
    }
    return [];
  });

  const [enhancedAssets, setEnhancedAssetsState] = useState<any[]>(() => {
    if (memoryEnhancedAssets && memoryEnhancedAssets.length > 0) return memoryEnhancedAssets;
    try {
      const s = sessionStorage.getItem(SESSION_CACHE_KEY_ASSETS);
      if (s) return JSON.parse(s);
    } catch (_e) {
      // Ignora erro de parse de cache
    }
    return [];
  });

  const [dividendHistory, setDividendHistoryState] = useState<any[]>(() => {
    if (memoryDividendHistory && memoryDividendHistory.length > 0) return memoryDividendHistory;
    try {
      const s = sessionStorage.getItem(SESSION_CACHE_KEY_DIVIDENDS);
      if (s) return JSON.parse(s);
    } catch (_e) {
      // Ignora erro de parse de cache
    }
    return [];
  });

  const setPortfolioEvolution = useCallback((data: any[]) => {
    memoryPortfolioEvolution = data;
    try {
      sessionStorage.setItem(SESSION_CACHE_KEY_EVOLUTION, JSON.stringify(data));
    } catch (_e) {
      // Ignora erro de gravação de cache
    }
    setPortfolioEvolutionState(data);
  }, []);

  const setEnhancedAssets = useCallback((data: any[]) => {
    memoryEnhancedAssets = data;
    try {
      sessionStorage.setItem(SESSION_CACHE_KEY_ASSETS, JSON.stringify(data));
    } catch (_e) {
      // Ignora erro de gravação de cache
    }
    setEnhancedAssetsState(data);
  }, []);

  const setDividendHistory = useCallback((data: any[]) => {
    memoryDividendHistory = data;
    try {
      sessionStorage.setItem(SESSION_CACHE_KEY_DIVIDENDS, JSON.stringify(data));
    } catch (_e) {
      // Ignora erro de gravação de cache
    }
    setDividendHistoryState(data);
  }, []);

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

  // Fetch dividend data directly (internally) and persist in financial_assets
  const fetchAndStoreDividends = useCallback(async (tickers: string[]): Promise<any[]> => {
    if (tickers.length === 0) return [];

    const formattedTickers = [...new Set(tickers.map(t => formatTickerForYahoo(t)).filter(Boolean))];
    console.log(`Buscando dados e dividendos internamente para: ${formattedTickers.join(", ")}`);

    let fetchedAssets: any[] = [];

    // 1. Execute internally direct fetch first
    try {
      fetchedAssets = await fetchMultipleAssetsDirectly(formattedTickers, true);
    } catch (directErr) {
      console.warn("Aviso ao buscar cotações internamente:", directErr);
    }

    // 2. Fallback to Edge function if direct fetch returned empty
    if (fetchedAssets.length === 0) {
      try {
        const { data, error } = await supabase.functions.invoke("yfinance-data", {
          body: { tickers: formattedTickers, fullHistory: true },
        });
        if (!error && data?.assets && Array.isArray(data.assets)) {
          fetchedAssets = data.assets;
        }
      } catch (edgeErr) {
        console.info("Edge function não acessível:", edgeErr);
      }
    }

    // 3. Persist into Supabase financial_assets via secure RPC function
    if (fetchedAssets.length > 0) {
      try {
        const rows = fetchedAssets.map((asset: any) => ({
          ticker: asset.ticker,
          name: asset.nome,
          sector: asset.setor,
          current_price: asset.preco_atual,
          dividends_12m: asset.dividendos_12m,
          price_history: asset.historico_precos || [],
          dividend_history: asset.historico_dividendos || [],
          updated_at: new Date().toISOString(),
        }));

        // Use RPC with SECURITY DEFINER to bypass client RLS restriction safely
        const { error: rpcError } = await supabase.rpc("bulk_upsert_assets", {
          assets_data: rows,
        });

        if (!rpcError) {
          console.log(`Salvo no banco ${rows.length} ativos com sucesso.`);
        } else {
          // Fallback to direct upsert only if RPC fails
          const { error: upsertError } = await supabase
            .from("financial_assets")
            .upsert(rows, { onConflict: "ticker" });
          if (upsertError && upsertError.code !== "42501") {
            console.warn("Aviso ao persistir financial_assets no banco:", upsertError);
          }
        }
      } catch (upsertCatch) {
        // Safe catch: data is already available in memory
      }
    }

    return fetchedAssets.map((asset: any) => ({
      ticker: asset.ticker,
      dividendHistory: asset.historico_dividendos || [],
    }));
  }, []);

  // Buscar dados de evolução patrimonial
  const getPortfolioEvolutionData = useCallback(
    async (period: string = "12m", forceRefresh: boolean = false) => {
      if (forceRefresh || (!memoryPortfolioEvolution && portfolioEvolution.length === 0)) {
        setLoading(true);
      }
      try {
        if (user) {
          const { manualPositions, pluggyInvestments } = await getOrFetchRawUserInvestments(user.id, forceRefresh);

          if (manualPositions.length > 0 || pluggyInvestments.length > 0) {
            const cleanSym = (t: string) => (t || "").replace(".SA", "").toUpperCase().trim();

            const manualTickers = manualPositions
              .filter(p => p.asset_type !== "FIXED_INCOME")
              .map(p => formatTickerForYahoo(p.ticker))
              .filter(Boolean);

            const pluggyTickers = pluggyInvestments.map(inv => {
              const name = inv.name || inv.code || "";
              const match = name.match(/([A-Z]{4}\d{1,2})/g);
              return match ? `${match[0]}.SA` : null;
            }).filter(Boolean) as string[];

            const allTickers = [...new Set([...manualTickers, ...pluggyTickers])];

            let assetsMap: any[] = [];
            if (allTickers.length > 0) {
              const queryTickers = [...new Set([
                ...allTickers,
                ...allTickers.map(t => cleanSym(t)),
                ...allTickers.map(t => formatTickerForYahoo(t)),
              ])];

              const { data: dbAssets, error: dbError } = await supabase
                .from("financial_assets")
                .select("*")
                .in("ticker", queryTickers);

              if (!dbError && dbAssets) {
                assetsMap = dbAssets.map(asset => ({
                  ticker: asset.ticker,
                  preco_atual: asset.current_price,
                  historico_precos: asset.price_history || [],
                  historico_dividendos: asset.dividend_history || []
                }));
              }
            }

            const evolutionData = [];
            const months = 60; // Up to 5 years (60 months)
            const now = new Date();
            let cumulativeCdi = 0;

            for (let i = months - 1; i >= 0; i--) {
              const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
              const monthKey = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });

              let totalMarketValue = 0;
              let totalCost = 0;
              let totalDividends = 0;

              // 1. Manual positions (Fixed Income + Variable Income)
              manualPositions.forEach(pos => {
                const isFixedIncome = pos.asset_type === "FIXED_INCOME";
                const fixedCalc = pos.fixedIncome;

                if (isFixedIncome && fixedCalc) {
                  if (i === 0) {
                    // Mês atual: saldo bruto consolidado com rendimentos
                    totalMarketValue += fixedCalc.currentGrossAmount;
                    totalCost += pos.totalCost;
                  } else {
                    const startDate = fixedCalc.startDate ? new Date(fixedCalc.startDate) : null;
                    if (startDate && date < new Date(startDate.getFullYear(), startDate.getMonth(), 1)) {
                      // Aporte ainda não havia sido realizado
                    } else {
                      const totalDays = Math.max(1, (now.getTime() - (startDate ? startDate.getTime() : now.getTime())) / (1000 * 60 * 60 * 24));
                      const elapsedDays = Math.max(0, Math.min(totalDays, (date.getTime() - (startDate ? startDate.getTime() : date.getTime())) / (1000 * 60 * 60 * 24)));
                      const fraction = totalDays > 0 ? elapsedDays / totalDays : 1;
                      const estimatedVal = pos.totalCost + (fixedCalc.accruedInterest * fraction);
                      totalMarketValue += estimatedVal;
                      totalCost += pos.totalCost;
                    }
                  }
                  return;
                }

                // Renda Variável (Ações, FIIs, BDRs, etc.)
                const cTicker = cleanSym(pos.ticker);
                const assetData = assetsMap.find((a: any) => cleanSym(a.ticker) === cTicker);

                let price = 0;
                if (i === 0) {
                  price = (typeof assetData?.preco_atual === 'number' && assetData.preco_atual > 0)
                    ? assetData.preco_atual
                    : (pos.averagePrice || 0);
                } else {
                  if (assetData?.historico_precos && Array.isArray(assetData.historico_precos)) {
                    const priceEntry = assetData.historico_precos.find((h: any) => {
                      const hDate = new Date(h.date);
                      return hDate.getMonth() === date.getMonth() && hDate.getFullYear() === date.getFullYear();
                    });
                    if (priceEntry && typeof priceEntry.close === 'number') {
                      price = priceEntry.close;
                    }
                  }
                  if (!price || price <= 0) {
                    price = (typeof assetData?.preco_atual === 'number' && assetData.preco_atual > 0)
                      ? assetData.preco_atual
                      : (pos.averagePrice || 0);
                  }
                }

                totalMarketValue += price * (pos.quantity || 0);
                totalCost += pos.totalCost || ((pos.averagePrice || 0) * (pos.quantity || 0));

                if (assetData && assetData.historico_dividendos && Array.isArray(assetData.historico_dividendos)) {
                  const monthDividends = assetData.historico_dividendos
                    .filter((d: any) => {
                      const dDate = new Date(d.date || d.paymentDate);
                      return dDate.getMonth() === date.getMonth() && dDate.getFullYear() === date.getFullYear();
                    })
                    .reduce((sum: number, d: any) => {
                      const amount = typeof d.amount === 'number' ? d.amount : parseFloat(d.amount) || 0;
                      return sum + (amount * (pos.quantity || 0));
                    }, 0);
                  totalDividends += monthDividends;
                }
              });

              // 2. Open Finance / Pluggy investments
              pluggyInvestments.forEach(inv => {
                const name = inv.name || inv.code || "";
                const match = name.match(/([A-Z]{4}\d{1,2})/g);
                const cTicker = match ? cleanSym(match[0]) : "";
                const yAsset = cTicker ? assetsMap.find((a: any) => cleanSym(a.ticker) === cTicker) : null;

                let price = 0;
                if (i === 0 && yAsset && typeof yAsset.preco_atual === 'number' && yAsset.preco_atual > 0) {
                  price = yAsset.preco_atual;
                } else if (i > 0 && yAsset?.historico_precos && Array.isArray(yAsset.historico_precos)) {
                  const pEntry = yAsset.historico_precos.find((h: any) => {
                    const hDate = new Date(h.date);
                    return hDate.getMonth() === date.getMonth() && hDate.getFullYear() === date.getFullYear();
                  });
                  if (pEntry && typeof pEntry.close === 'number') {
                    price = pEntry.close;
                  }
                }

                if (price > 0 && inv.quantity) {
                  totalMarketValue += price * inv.quantity;
                  totalCost += Number(inv.balance || (price * inv.quantity));
                } else {
                  totalMarketValue += Number(inv.balance || 0);
                  totalCost += Number(inv.balance || 0);
                }
              });

              // 3. No mês atual (i === 0), garantir alinhamento exato com enhancedAssets se já calculados
              if (i === 0 && memoryEnhancedAssets && memoryEnhancedAssets.length > 0) {
                totalMarketValue = memoryEnhancedAssets.reduce((sum, a) => sum + (Number(a.marketValue) || 0), 0);
                totalCost = memoryEnhancedAssets.reduce((sum, a) => sum + (Number(a.cost) || 0), 0);
              }

              const profitability = totalCost > 0 ? ((totalMarketValue - totalCost) / totalCost) * 100 : 0;
              cumulativeCdi += 0.88;

              evolutionData.push({
                month: monthKey,
                profitability: Number(profitability.toFixed(2)),
                cdi: Number((cumulativeCdi / Math.max(1, (months - i))).toFixed(2)),
                marketValue: Number(totalMarketValue.toFixed(2)),
                operations: 0,
                costs: Number(totalCost.toFixed(2)),
                dividends: Number(totalDividends.toFixed(2))
              });
            }

            setPortfolioEvolution(evolutionData);
            return evolutionData;
          }

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
  const getEnhancedAssetsData = useCallback(async (forceRefresh: boolean = false) => {
    if (forceRefresh || (!memoryEnhancedAssets && enhancedAssets.length === 0)) {
      setLoading(true);
    }
    try {
      if (user) {
        const { pluggyInvestments, manualPositions } = await getOrFetchRawUserInvestments(user.id, forceRefresh);

        if (pluggyInvestments.length > 0 || manualPositions.length > 0) {
          const pluggyTickers = pluggyInvestments
            .map((inv) => {
              const name = inv.name || inv.code || "";
              const tickerMatch = name.match(/([A-Z]{4}\d{1,2})/g);
              return tickerMatch && tickerMatch[0] ? `${tickerMatch[0]}.SA` : null;
            })
            .filter(Boolean) as string[];

          const manualTickers = manualPositions
            .filter(p => p.asset_type !== "FIXED_INCOME")
            .map(p => formatTickerForYahoo(p.ticker));
          const allTickers = [...new Set([...pluggyTickers, ...manualTickers])];

          const cleanTicker = (t: string) => (t || "").replace(".SA", "").toUpperCase().trim();

          let yfinanceData: any[] = [];
          if (allTickers.length > 0) {
            try {
              let dbAssets: any[] | null = null;
              let dbError = null;

              const queryTickers = [...new Set([
                ...allTickers,
                ...allTickers.map(t => cleanTicker(t)),
                ...allTickers.map(t => formatTickerForYahoo(t)),
              ])];

              if (!forceRefresh) {
                const res = await supabase
                  .from("financial_assets")
                  .select("*")
                  .in("ticker", queryTickers);
                dbAssets = res.data;
                dbError = res.error;
              }

              const assetsFound: Set<string> = new Set();

              if (!dbError && dbAssets && !forceRefresh) {
                yfinanceData = dbAssets
                  .filter(asset => typeof asset.current_price === "number" && asset.current_price > 0)
                  .map(asset => {
                    const sym = cleanTicker(asset.ticker);
                    assetsFound.add(sym);
                    assetsFound.add(formatTickerForYahoo(sym));
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

              const missingTickers = forceRefresh 
                ? allTickers 
                : allTickers.filter(t => !assetsFound.has(cleanTicker(t)));

              if (missingTickers.length > 0) {
                let newFetchedAssets: any[] = [];
                
                // 1. Internal direct fetch first
                try {
                  newFetchedAssets = await fetchMultipleAssetsDirectly(missingTickers, true);
                } catch (directErr) {
                  console.warn("Aviso ao buscar dados diretos de ativos:", directErr);
                }

                // 2. Fallback to Edge function if needed
                if (newFetchedAssets.length === 0) {
                  try {
                    const { data: edgeData, error: edgeError } =
                      await supabase.functions.invoke("yfinance-data", {
                        body: { tickers: missingTickers, fullHistory: true },
                      });

                    if (!edgeError && edgeData?.assets && Array.isArray(edgeData.assets)) {
                      newFetchedAssets = edgeData.assets;
                    }
                  } catch (edgeErr) {
                    console.info("Edge function não acessível em getEnhancedAssetsData.");
                  }
                }

                // 3. Keep fetched assets in memory even if DB write fails
                if (newFetchedAssets.length > 0) {
                  try {
                    const rows = newFetchedAssets.map((asset: any) => ({
                      ticker: asset.ticker,
                      name: asset.nome,
                      sector: asset.setor,
                      current_price: asset.preco_atual,
                      dividends_12m: asset.dividendos_12m,
                      price_history: asset.historico_precos || [],
                      dividend_history: asset.historico_dividendos || [],
                      updated_at: new Date().toISOString(),
                    }));

                    const { error: rpcErr } = await supabase.rpc("bulk_upsert_assets", {
                      assets_data: rows,
                    });

                    if (rpcErr) {
                      const { error: dbErr } = await supabase
                        .from("financial_assets")
                        .upsert(rows, { onConflict: "ticker" });
                      if (dbErr && dbErr.code !== "42501") {
                        console.warn("Aviso ao gravar financial_assets:", dbErr);
                      }
                    }
                  } catch (dbErr) {
                    // Safe catch: data is already kept in memory
                  }
                  
                  const newSyms = new Set(newFetchedAssets.map(a => cleanTicker(a.ticker)));
                  yfinanceData = [
                    ...yfinanceData.filter(y => !newSyms.has(cleanTicker(y.ticker))),
                    ...newFetchedAssets
                  ];
                }
              }
            } catch (err) {
              console.warn("Aviso ao buscar dados de ativos:", err);
            }
          }

          // Helper to calculate accurate 12m dividends per share from events
          const get12mDividendPerShare = (asset: any) => {
            let div12m = typeof asset?.dividendos_12m === "number" ? asset.dividendos_12m : 0;
            const history = asset?.historico_dividendos || asset?.dividend_history;
            if (Array.isArray(history) && history.length > 0) {
              const oneYearAgo = new Date();
              oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
              const sumFromHist = history
                .filter((d: any) => {
                  const dDate = new Date(d.date || d.paymentDate || d.recordDate);
                  return !isNaN(dDate.getTime()) && dDate >= oneYearAgo;
                })
                .reduce((sum: number, d: any) => {
                  const amt = typeof d.amount === "number" ? d.amount : parseFloat(d.amount);
                  return sum + (isNaN(amt) ? 0 : amt);
                }, 0);
              if (sumFromHist > 0) {
                div12m = Number(sumFromHist.toFixed(4));
              }
            }
            return div12m;
          };

          // Merge Data for Pluggy
          const enhancedPluggy = pluggyInvestments.map((inv) => {
            const name = inv.name || inv.code || "N/A";
            const tickerMatch = name.match(/([A-Z]{4}\d{1,2})/g);
            const sym = tickerMatch ? tickerMatch[0] : name;
            const cleanSym = cleanTicker(sym);

            const yfinanceAsset = yfinanceData.find((asset) => cleanTicker(asset.ticker) === cleanSym);

            const currentPrice = (typeof yfinanceAsset?.preco_atual === "number" && yfinanceAsset.preco_atual > 0)
              ? yfinanceAsset.preco_atual
              : (inv.balance && inv.quantity ? inv.balance / inv.quantity : inv.balance || 0);

            const quantity = inv.quantity || 1;
            const marketValue = Number((currentPrice * quantity).toFixed(2));
            const cost = Number((inv.balance || marketValue).toFixed(2));
            const profitLoss = Number((marketValue - cost).toFixed(2));
            const profitability = cost > 0 ? Number(((profitLoss / cost) * 100).toFixed(2)) : 0;
            
            const divPerShare = get12mDividendPerShare(yfinanceAsset);
            const totalDivs = Number((divPerShare * quantity).toFixed(2));
            const avgPrice = cost / quantity;
            const yieldOnCost = avgPrice > 0 ? Number(((divPerShare / avgPrice) * 100).toFixed(2)) : 0;

            return {
              symbol: sym,
              name: yfinanceAsset?.nome || inv.name || "Investimento",
              type: inv.type,
              subtype: inv.subtype,
              currentPrice,
              quantity,
              marketValue,
              cost,
              averagePrice: avgPrice,
              yieldOnCost,
              accumulatedDividends: totalDivs,
              profitLoss,
              profitability,
            };
          });

          // Merge Data for Manual Positions
          const enhancedManual = manualPositions.map((pos) => {
            const cleanSym = cleanTicker(pos.ticker);
            const yfinanceAsset = yfinanceData.find((asset) => cleanTicker(asset.ticker) === cleanSym);

            const isFixedIncome = pos.asset_type === "FIXED_INCOME";
            const fixedCalc = pos.fixedIncome;

            const quantity = pos.quantity || 0;
            const cost = Number((pos.totalCost || (pos.averagePrice * quantity)).toFixed(2));

            let currentPrice = (typeof yfinanceAsset?.preco_atual === "number" && yfinanceAsset.preco_atual > 0)
              ? yfinanceAsset.preco_atual
              : (pos.averagePrice || 0);

            let marketValue = Number((currentPrice * quantity).toFixed(2));
            let profitLoss = Number((marketValue - cost).toFixed(2));
            let profitability = cost > 0 ? Number(((profitLoss / cost) * 100).toFixed(2)) : 0;

            // Se for Renda Fixa com cálculo de indexador (% CDI, IPCA, Prefixado, Selic)
            if (isFixedIncome && fixedCalc) {
              marketValue = fixedCalc.currentGrossAmount;
              currentPrice = quantity > 0 ? Number((marketValue / quantity).toFixed(2)) : pos.averagePrice;
              profitLoss = fixedCalc.accruedInterest;
              profitability = fixedCalc.profitabilityPercent;
            }

            const divPerShare = get12mDividendPerShare(yfinanceAsset);
            const totalDividendsReceived = Number((divPerShare * quantity).toFixed(2));
            const yieldOnCostCalc = pos.averagePrice > 0 ? Number(((divPerShare / pos.averagePrice) * 100).toFixed(2)) : 0;

            return {
              symbol: pos.ticker,
              name: yfinanceAsset?.nome || pos.asset_name,
              type: pos.asset_type,
              subtype: isFixedIncome ? (fixedCalc?.parsedRate?.label || "Renda Fixa") : null,
              asset_type: pos.asset_type,
              currentPrice,
              quantity: pos.quantity,
              marketValue,
              cost,
              averagePrice: pos.averagePrice,
              yieldOnCost: yieldOnCostCalc,
              accumulatedDividends: totalDividendsReceived,
              profitLoss,
              profitability,
              fixedIncome: fixedCalc,
            };
          });

          const allCalculatedAssets = [...enhancedPluggy, ...enhancedManual];
          setEnhancedAssets(allCalculatedAssets);

          // Sincronizar o valor atual do último ponto da evolução patrimonial para que coincida 100% com o patrimônio atual
          const currentTotalMarketValue = Number(allCalculatedAssets.reduce((sum, a) => sum + (Number(a.marketValue) || 0), 0).toFixed(2));
          const currentTotalCost = Number(allCalculatedAssets.reduce((sum, a) => sum + (Number(a.cost) || 0), 0).toFixed(2));
          const currentTotalProfitability = currentTotalCost > 0
            ? Number((((currentTotalMarketValue - currentTotalCost) / currentTotalCost) * 100).toFixed(2))
            : 0;

          if (memoryPortfolioEvolution && memoryPortfolioEvolution.length > 0) {
            const updatedEvolution = [...memoryPortfolioEvolution];
            const lastIndex = updatedEvolution.length - 1;
            updatedEvolution[lastIndex] = {
              ...updatedEvolution[lastIndex],
              marketValue: currentTotalMarketValue,
              costs: currentTotalCost,
              profitability: currentTotalProfitability,
            };
            setPortfolioEvolution(updatedEvolution);
          }
          return allCalculatedAssets;
        }

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
  const getDividendHistoryData = useCallback(async (changedTickers?: string[], forceRefresh: boolean = false) => {
    if (forceRefresh || (!memoryDividendHistory && dividendHistory.length === 0)) {
      setLoading(true);
    }
    try {
      if (!user) {
        setDividendHistory([]);
        return [];
      }

      // 1. Get user's tickers from deduplicated raw investments
      const { manualTransactions, pluggyInvestments } = await getOrFetchRawUserInvestments(user.id, forceRefresh);

      const pluggyTickers = pluggyInvestments
        .map((inv: any) => {
          const name = inv.name || inv.code || "";
          const match = name.match(/([A-Z]{4}\d{1,2})/g);
          return match ? formatTickerForYahoo(match[0]) : null;
        })
        .filter(Boolean) as string[];

      const rawManualTickers = (manualTransactions || [])
        .map(t => formatTickerForYahoo(t.ticker))
        .filter(Boolean);

      const uniqueTickers = [...new Set([...rawManualTickers, ...pluggyTickers])];

      if (uniqueTickers.length === 0) {
        setDividendHistory([]);
        return [];
      }

      // 2. Get existing data from DB first (unless forceRefresh)
      let dbHistoryMap = new Map<string, any[]>();
      const queryTickers = [...new Set([
        ...uniqueTickers,
        ...uniqueTickers.map(t => t.replace(".SA", "")),
        ...uniqueTickers.map(t => formatTickerForYahoo(t))
      ])];

      if (!forceRefresh) {
        const { data: dbData, error: dbError } = await supabase
          .from("financial_assets")
          .select("ticker, dividend_history")
          .in("ticker", queryTickers);

        if (!dbError && dbData) {
          dbData.forEach(asset => {
            const rawTicker = (asset.ticker || "").toUpperCase().trim();
            const saTicker = formatTickerForYahoo(rawTicker);
            const cleanTicker = rawTicker.replace(".SA", "");
            const history = (asset.dividend_history as any[]) || [];
            dbHistoryMap.set(rawTicker, history);
            dbHistoryMap.set(saTicker, history);
            dbHistoryMap.set(cleanTicker, history);
          });
        }
      }

      // Determine which tickers need fresh data
      let tickersToFetch: string[] = [];

      if (forceRefresh) {
        tickersToFetch = uniqueTickers;
      } else if (changedTickers && changedTickers.length > 0) {
        tickersToFetch = changedTickers.map(t => formatTickerForYahoo(t));
      } else if (shouldFetchDividends()) {
        // First visit of the day: refetch all to ensure full 10-year history
        tickersToFetch = uniqueTickers;
      } else {
        const previouslyFetched = getFetchedTickers();
        // Refetch tickers that are new OR have suspiciously short history (< 3 years)
        tickersToFetch = uniqueTickers.filter(t => {
          if (!previouslyFetched.includes(t)) return true;
          const hist = dbHistoryMap.get(t) || dbHistoryMap.get(t.replace(".SA", "")) || [];
          if (hist.length === 0) return true;
          const oldest = hist.reduce((min: string, d: any) => (d.date < min ? d.date : min), hist[0].date);
          const oldestYear = parseInt((oldest || "").slice(0, 4), 10);
          const cutoffYear = new Date().getFullYear() - 3;
          return !oldestYear || oldestYear > cutoffYear;
        });
      }

      // 3. Fetch fresh data for tickers that need it
      let fetchSucceeded = true;
      if (tickersToFetch.length > 0) {
        const freshData = await fetchAndStoreDividends(tickersToFetch);
        if (freshData.length === 0) fetchSucceeded = false;
        freshData.forEach(item => {
          const rawTicker = (item.ticker || "").toUpperCase().trim();
          const saTicker = formatTickerForYahoo(rawTicker);
          const cleanTicker = rawTicker.replace(".SA", "");
          dbHistoryMap.set(rawTicker, item.dividendHistory);
          dbHistoryMap.set(saTicker, item.dividendHistory);
          dbHistoryMap.set(cleanTicker, item.dividendHistory);
        });
      }

      // Only mark cache when we actually have data
      if (fetchSucceeded) {
        markDividendsFetched(uniqueTickers);
      }

      // 4. Build final result for all user tickers
      const historyData = uniqueTickers
        .map(ticker => {
          const history = dbHistoryMap.get(ticker) || dbHistoryMap.get(ticker.replace(".SA", "")) || [];
          return {
            ticker,
            dividendHistory: history,
          };
        })
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
