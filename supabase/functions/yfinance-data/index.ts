import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import yahooFinance from "yahoo-finance2";

interface YFinanceRequest {
  tickers?: string[];
  ticker?: string;
  dataInicio?: string;
  dataFim?: string;
  benchmark?: string;
}

interface DividendEvent {
  date: string;
  dividend: number;
}

interface HistoricalPrice {
  date: string;
  price: number;
}

interface AssetData {
  assetName: string;
  ticker: string;
  currency: string;
  priceHistory: HistoricalPrice[];
  dividendHistory: DividendEvent[];
  currentPrice: number;
  totalDividends: number;
}

async function buscarDadosAtivo(ticker: string, dataInicio?: string, dataFim?: string): Promise<AssetData> {
  console.log(`Buscando dados para ${ticker}...`);
  
  // 1. Preparação das Datas
  const start = dataInicio ? new Date(dataInicio) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const end = dataFim ? new Date(dataFim) : new Date();
  // Ajuste para garantir que pegamos até o último minuto do dia final
  end.setHours(23, 59, 59, 999);

  try {
    // 2. Chamada à API
    // O Yahoo Finance exige o sufixo .SA para ativos da B3 (ex: PETR4.SA)
    const symbol = ticker.includes('.') ? ticker : `${ticker}.SA`;

    const result = await yahooFinance.chart(symbol, {
      period1: start,
      period2: end,
      interval: '1d' // Intervalo diário
    });

    if (!result || !result.meta) {
      throw new Error(`Dados não encontrados para ${symbol}`);
    }

    // 3. Processamento dos Preços
    const historicoPrecos = (result.quotes || []).map(q => ({
      date: q.date.toISOString().split('T')[0],
      price: q.close || q.adjclose || 0
    })).filter(p => p.price != null && p.price > 0);

    // 4. Processamento dos Dividendos
    const historicoDividendos = (result.events?.dividends || []).map(d => ({
      date: new Date(d.date).toISOString().split('T')[0],
      dividend: d.amount
    }));

    // Meta dados para construir a saída exigida
    const meta = result.meta;
    const assetName = meta.shortName || meta.longName || ticker.replace('.SA', '');
    const currentPrice = meta.regularMarketPrice || meta.previousClose || (historicoPrecos.length > 0 ? historicoPrecos[historicoPrecos.length - 1].price : 0);
    const currency = meta.currency || "BRL";

    // Somar dividendos
    const totalDividends = historicoDividendos.reduce((acc, curr) => acc + curr.dividend, 0);

    return {
      assetName,
      ticker: symbol,
      currency,
      priceHistory: historicoPrecos,
      dividendHistory: historicoDividendos,
      currentPrice,
      totalDividends
    };
  } catch (error) {
    console.error(`Erro na consulta para ${ticker}:`, error);
    throw error;
  }
}

// Função com retry e delay
async function fetchWithRetry(ticker: string, dataInicio?: string, dataFim?: string, retries = 3, delay = 1000): Promise<AssetData | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
      return await buscarDadosAtivo(ticker, dataInicio, dataFim);
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
    const body: YFinanceRequest = await req.json();

    // Se a solicitação for apenas um benchmark (usado no lib/b3/client.ts)
    if (body.benchmark) {
       return new Response(JSON.stringify({ value: 10.75, change: 0.25 }), {
         status: 200,
         headers: { ...corsHeaders, "Content-Type": "application/json" }
       });
    }

    // Lidar com um único ticker (baseado no pedido de estrutura de dados)
    if (body.ticker) {
      const data = await fetchWithRetry(body.ticker, body.dataInicio, body.dataFim);
      if (data) {
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        throw new Error(`Falha ao buscar dados para ${body.ticker} após várias tentativas`);
      }
    }

    const { tickers } = body;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      throw new Error("Lista de tickers inválida ou vazia");
    }

    console.log(`Processando ${tickers.length} tickers: ${tickers.join(', ')}`);

    const assets: any[] = [];
    const errors: { ticker: string; reason: string }[] = [];

    // Processar sequencialmente para evitar rate limiting com a lib npm
    for (const ticker of tickers) {
      // Para a interface antiga (arrays múltiplos) mapeamos a resposta nova de volta
      const data = await fetchWithRetry(ticker, body.dataInicio, body.dataFim);
      
      if (data) {
        // Adaptamos para manter a compatibilidade com a chamada antiga
        assets.push({
          ticker: ticker,
          nome: data.assetName,
          setor: "N/A",
          preco_atual: data.currentPrice,
          dividendos_12m: data.totalDividends,
          historico_dividendos: data.dividendHistory.map(d => ({ date: d.date, amount: d.dividend })),
          historico_precos: data.priceHistory.map(p => ({ date: p.date, close: p.price }))
        });
      } else {
        errors.push({ ticker, reason: "Falha ao buscar dados após várias tentativas" });
      }
      // Pequeno delay entre tickers
      await new Promise(resolve => setTimeout(resolve, 500));
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
