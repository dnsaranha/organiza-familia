import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface YFinanceRequest {
  tickers: string[];
  fullHistory?: boolean; // When true, fetch all available dividend history
}

interface DividendEvent {
  date: string;
  amount: number;
  paymentDate?: string;
  recordDate?: string;
  approvedOn?: string;
  type?: string;
  status?: string;
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

// Fetch Brazilian corporate events / dividends (B3 / Brapi) to enrich announced & scheduled dividends
async function fetchBrazilianDividends(cleanTicker: string): Promise<DividendEvent[]> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://brapi.dev/api/quote/${encodeURIComponent(cleanTicker)}?dividends=true`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return [];

    const json = await res.json();
    const result = json?.results?.[0];
    const cashDivs = result?.dividendsData?.cashDividends;

    if (!Array.isArray(cashDivs) || cashDivs.length === 0) return [];

    const todayStr = new Date().toISOString().split("T")[0];
    const brazEvents: DividendEvent[] = [];

    for (const d of cashDivs) {
      const rate = typeof d.rate === "number" ? d.rate : parseFloat(d.rate);
      if (!rate || isNaN(rate) || rate <= 0) continue;

      // Prefer paymentDate, fallback to lastDatePrior (Data Com) or approvedOn
      const rawDate = d.paymentDate || d.lastDatePrior || d.approvedOn;
      if (!rawDate) continue;

      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) continue;

      const dateStr = dateObj.toISOString().split("T")[0];
      const paymentDateStr = d.paymentDate ? new Date(d.paymentDate).toISOString().split("T")[0] : undefined;
      const recordDateStr = d.lastDatePrior ? new Date(d.lastDatePrior).toISOString().split("T")[0] : undefined;
      const approvedOnStr = d.approvedOn ? new Date(d.approvedOn).toISOString().split("T")[0] : undefined;

      const label = (d.label || d.relatedTo || "DIVIDEND").toUpperCase();
      let type = "DIVIDEND";
      if (label.includes("JCP") || label.includes("JUROS")) type = "JCP";
      else if (label.includes("RENDIMENTO") || label.includes("FII")) type = "RENDIMENTO";

      const isAnnounced = (paymentDateStr && paymentDateStr >= todayStr) || (recordDateStr && recordDateStr >= todayStr);

      brazEvents.push({
        date: paymentDateStr || dateStr,
        amount: Number(rate.toFixed(4)),
        paymentDate: paymentDateStr,
        recordDate: recordDateStr,
        approvedOn: approvedOnStr,
        type,
        status: isAnnounced ? "announced" : "paid",
      });
    }

    return brazEvents;
  } catch (e) {
    console.warn(`Aviso: Busca complementar brasileira para ${cleanTicker} falhou ou expirou:`, e);
    return [];
  }
}

// Fetch ticker data with configurable history depth
async function fetchTickerData(ticker: string, fullHistory: boolean = false): Promise<AssetData> {
  console.log(`Buscando dados para ${ticker} (fullHistory=${fullHistory})...`);
  
  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json,text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
    "Cache-Control": "no-cache",
  };

  const now = Math.floor(Date.now() / 1000);
  // For full history, go back 10 years; otherwise 1 year
  const periodStart = fullHistory
    ? Math.floor(Date.now() / 1000) - 10 * 365 * 24 * 60 * 60
    : Math.floor(Date.now() / 1000) - 365 * 24 * 60 * 60;
  
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?period1=${periodStart}&period2=${now}&interval=1mo&events=div`;
  
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

  const preco_atual = meta.regularMarketPrice || meta.previousClose || 0;
  const nome = meta.shortName || meta.longName || ticker.replace('.SA', '');
  const setor = meta.exchangeName || "N/A";

  // Build price history
  const historico_precos: HistoricalPrice[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const closePrice = quotes.close?.[i];
    if (closePrice !== null && closePrice !== undefined && !isNaN(closePrice)) {
      const date = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      historico_precos.push({ date, close: closePrice });
    }
  }

  // Build dividend history from Yahoo Finance
  const historico_dividendos: DividendEvent[] = [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  for (const timestamp of Object.keys(dividendEvents)) {
    const divData = dividendEvents[timestamp];
    if (divData && divData.amount) {
      const divDate = new Date(parseInt(timestamp) * 1000);
      const date = divDate.toISOString().split('T')[0];
      historico_dividendos.push({
        date,
        amount: divData.amount,
        status: divDate > new Date() ? "announced" : "paid",
      });
    }
  }

  // Enrich with Brazilian sources (CVM / B3 / Brapi events)
  const cleanTicker = ticker.replace('.SA', '').trim().toUpperCase();
  const brazilianDividends = await fetchBrazilianDividends(cleanTicker);

  if (brazilianDividends.length > 0) {
    console.log(`Encontrados ${brazilianDividends.length} eventos de proventos brasileiros para ${cleanTicker}`);
    
    // Merge Brazilian dividends with Yahoo Finance dividends without duplication
    for (const bDiv of brazilianDividends) {
      const bDate = bDiv.paymentDate || bDiv.date;
      const bAmount = bDiv.amount;

      // Find match in Yahoo Finance history (within 15 days and close amount)
      const existingIdx = historico_dividendos.findIndex(yDiv => {
        const diffDays = Math.abs(
          (new Date(yDiv.date).getTime() - new Date(bDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return diffDays <= 15 && Math.abs(yDiv.amount - bAmount) < 0.02;
      });

      if (existingIdx >= 0) {
        // Enhance existing entry with metadata (payment date, type, record date, announced status)
        const payDate = bDiv.paymentDate || bDiv.date;
        historico_dividendos[existingIdx] = {
          ...historico_dividendos[existingIdx],
          date: payDate,
          paymentDate: payDate,
          recordDate: bDiv.recordDate || historico_dividendos[existingIdx].date,
          approvedOn: bDiv.approvedOn,
          type: bDiv.type || historico_dividendos[existingIdx].type,
          status: bDiv.status || historico_dividendos[existingIdx].status,
        };
      } else {
        // Add new Brazilian announced or paid dividend
        historico_dividendos.push(bDiv);
      }
    }
  }

  // Handle Brazilian FIIs without explicit paymentDate (Yahoo puts ex-date at end of month, paid on 15th of next month)
  const isFII = cleanTicker.endsWith('11') || cleanTicker.includes('FII');
  for (let i = 0; i < historico_dividendos.length; i++) {
    const item = historico_dividendos[i];
    if (!item.paymentDate && item.date) {
      const d = new Date(item.date);
      if (isFII && d.getDate() >= 25) {
        // Ex-date at end of month -> payment occurs ~14-15th of following month
        const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 15);
        const payStr = nextMonth.toISOString().split('T')[0];
        item.recordDate = item.date;
        item.paymentDate = payStr;
        item.date = payStr;
        item.type = item.type || "RENDIMENTO";
        const todayStr = new Date().toISOString().split('T')[0];
        item.status = payStr >= todayStr ? "announced" : "paid";
      } else {
        item.paymentDate = item.date;
      }
    }
  }

  // Sort dividends by date ascending
  historico_dividendos.sort((a, b) => a.date.localeCompare(b.date));

  // Compute 12m dividend yield sum accurately
  let dividendos_12m = 0;
  for (const div of historico_dividendos) {
    const dDate = new Date(div.paymentDate || div.date);
    if (dDate >= oneYearAgo) {
      dividendos_12m += div.amount;
    }
  }

  console.log(`Dados obtidos para ${ticker}: preço=${preco_atual}, div_12m=${dividendos_12m}, hist_precos=${historico_precos.length}, hist_divs=${historico_dividendos.length}`);

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

async function fetchWithRetry(ticker: string, fullHistory: boolean, retries = 3, delay = 1000): Promise<AssetData | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      if (attempt > 1) {
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      }
      return await fetchTickerData(ticker, fullHistory);
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
    let parsed: YFinanceRequest;
    try {
      parsed = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { tickers, fullHistory = false } = parsed || ({} as YFinanceRequest);

    if (!Array.isArray(tickers) || tickers.length === 0 || tickers.length > 50) {
      return new Response(
        JSON.stringify({ error: 'tickers must be a non-empty array (max 50)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const tickerPattern = /^[A-Za-z0-9._-]{1,15}$/;
    if (!tickers.every((t) => typeof t === 'string' && tickerPattern.test(t))) {
      return new Response(
        JSON.stringify({ error: 'Invalid ticker format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Processando ${tickers.length} tickers (fullHistory=${fullHistory}): ${tickers.join(', ')}`);

    const batchSize = 3;
    const assets: AssetData[] = [];
    const errors: { ticker: string; reason: string }[] = [];

    for (let i = 0; i < tickers.length; i += batchSize) {
      const batch = tickers.slice(i, i + batchSize);
      
      const batchPromises = batch.map(ticker => fetchWithRetry(ticker, fullHistory));
      const batchResults = await Promise.all(batchPromises);

      batchResults.forEach((result, idx) => {
        const ticker = batch[idx];
        if (result) {
          assets.push(result);
        } else {
          errors.push({ ticker, reason: "Falha ao buscar dados após várias tentativas" });
        }
      });

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
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
