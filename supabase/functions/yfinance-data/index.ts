import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface YFinanceRequest {
  tickers: string[];
}

interface DividendEvent {
  date: string;
  amount: number;
}

interface HistoricalPrice {
  date: string;
  close: number;
}

interface AssetData {
  ticker: string;
  nome: string;
  setor: string;
  preco_atual: number;
  dividendos_12m: number;
  historico_dividendos: DividendEvent[];
  historico_precos: HistoricalPrice[];
}

// Função para buscar dados de um ticker específico usando a API v8 (mais confiável)
async function fetchTickerData(ticker: string): Promise<AssetData> {
  console.log(`Buscando dados para ${ticker}...`);
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
  };

  // Tentar a API v8 chart primeiro (mais confiável)
  const oneYearAgo = Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
  const now = Math.floor(Date.now() / 1000);
  
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${oneYearAgo}&period2=${now}&interval=1mo&events=div`;
  
  console.log(`Fetching chart data from: ${chartUrl}`);
  
  const chartResponse = await fetch(chartUrl, { headers });
  
  if (!chartResponse.ok) {
    console.error(`HTTP ${chartResponse.status} ao buscar chart para ${ticker}`);
    throw new Error(`Erro HTTP ${chartResponse.status} ao buscar dados para ${ticker}`);
  }

  const chartData = await chartResponse.json();
  const result = chartData?.chart?.result?.[0];

  if (!result) {
    console.error(`Nenhum resultado encontrado para ${ticker}`);
    throw new Error(`Dados não encontrados para ${ticker}`);
  }

  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0] || {};
  const events = result.events || {};
  const dividendEvents = events.dividends || {};

  // Extrair preço atual
  const preco_atual = meta.regularMarketPrice || meta.previousClose || 0;

  // Extrair nome e setor (limitado na API chart)
  const nome = meta.shortName || meta.longName || ticker.replace('.SA', '');
  const setor = meta.exchangeName || "N/A";

  // Construir histórico de preços
  const historico_precos: HistoricalPrice[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const closePrice = quotes.close?.[i];
    if (closePrice !== null && closePrice !== undefined && !isNaN(closePrice)) {
      const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      historico_precos.push({ date, close: closePrice });
    }
  }

  // Construir histórico de dividendos
  const historico_dividendos: DividendEvent[] = [];
  let dividendos_12m = 0;

  for (const timestamp of Object.keys(dividendEvents)) {
    const divData = dividendEvents[timestamp];
    if (divData && divData.amount) {
      const date = new Date(parseInt(timestamp) * 1000).toISOString().split('T')[0];
      historico_dividendos.push({ date, amount: divData.amount });
      dividendos_12m += divData.amount;
    }
  }

  console.log(`Dados obtidos para ${ticker}: preço=${preco_atual}, dividendos=${dividendos_12m}, historico_precos=${historico_precos.length}, historico_dividendos=${historico_dividendos.length}`);

  return {
    ticker,
    nome,
    setor,
    preco_atual,
    dividendos_12m,
    historico_dividendos,
    historico_precos,
  };
}

// Função com retry e delay
async function fetchWithRetry(ticker: string, retries = 3, delay = 1000): Promise<AssetData | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Adicionar delay entre tentativas para evitar rate limiting
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
      return await fetchTickerData(ticker);
    } catch (error) {
      console.warn(`Tentativa ${attempt}/${retries} falhou para ${ticker}:`, error);
      if (attempt === retries) {
        return null;
      }
    }
  }
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const { tickers }: YFinanceRequest = await req.json();

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      throw new Error("Lista de tickers inválida ou vazia");
    }

    console.log(`Processando ${tickers.length} tickers: ${tickers.join(', ')}`);

    // Processar tickers em lotes para evitar rate limiting
    const batchSize = 3;
    const assets: AssetData[] = [];
    const errors: { ticker: string; reason: string }[] = [];

    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      
      // Processar batch em paralelo
      const batchPromises = batch.map(ticker => fetchWithRetry(ticker));
      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach((result, idx) => {
        const ticker = batch[idx];
        if (result) {
          assets.push(result);
        } else {
          errors.push({ ticker, reason: "Falha ao buscar dados após várias tentativas" });
        }
      });

      // Aguardar entre batches
      if (i + batchSize < tickers.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`Processamento concluído: ${assets.length} sucesso, ${errors.length} erros`);

    return new Response(JSON.stringify({ assets, errors }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro na função yfinance-data:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
