export interface DirectDividendEvent {
  date: string;
  amount: number;
  paymentDate?: string;
  recordDate?: string;
  approvedOn?: string;
  type?: string;
  status?: string;
}

export interface DirectHistoricalPrice {
  date: string;
  close: number;
}

export interface DirectAssetData {
  ticker: string;
  nome: string;
  setor: string;
  preco_atual: number;
  dividendos_12m: number;
  historico_dividendos: DirectDividendEvent[];
  historico_precos: DirectHistoricalPrice[];
}

export const formatTickerForYahoo = (ticker: string): string => {
  if (!ticker) return "";
  const clean = ticker.trim().toUpperCase();
  if (clean.match(/^[A-Z]{4}\d{1,2}$/)) return `${clean}.SA`;
  return clean.endsWith(".SA") ? clean : `${clean}.SA`;
};

// Direct client-side fetch with multi-tier CORS resilience
export async function fetchDirectYahooData(
  ticker: string,
  fullHistory: boolean = true
): Promise<DirectAssetData | null> {
  const formattedTicker = formatTickerForYahoo(ticker);
  if (!formattedTicker) return null;

  const cleanSym = formattedTicker.replace(".SA", "").toUpperCase();
  const isFii = cleanSym.endsWith("11");
  const rangeParam = fullHistory ? "10y" : "1y";

  const chartParams = `range=${rangeParam}&interval=1mo&events=div`;
  const encodedTicker = encodeURIComponent(formattedTicker);

  // Candidate URLs with dev server proxy and CORS proxies
  const candidateUrls = [
    `/api/yahoo/v8/finance/chart/${encodedTicker}?${chartParams}`,
    `/api/yahoo2/v8/finance/chart/${encodedTicker}?${chartParams}`,
    `/api/yahoo/v8/finance/chart/${encodedTicker}?interval=1mo&events=div`,
    `https://corsproxy.io/?${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${encodedTicker}?${chartParams}`)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${encodedTicker}?${chartParams}`)}`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const json = await res.json();
        const parsed = parseYahooChartResponse(formattedTicker, json);
        if (parsed) {
          return parsed;
        }
      }
    } catch (e) {
      // Continue to next fallback
    }
  }

  // Final fallback: Brapi
  try {
    const brapiUrl = `/api/brapi/api/quote/${encodeURIComponent(cleanSym)}?dividends=true&range=10y&interval=1mo`;
    const res = await fetch(brapiUrl);
    if (res.ok) {
      const bData = await res.json();
      const item = bData?.results?.[0];
      if (item) {
        const preco_atual = item.regularMarketPrice || item.previousClose || 0;
        const nome = item.shortName || item.longName || cleanSym;
        const setor = "B3";
        const cashDivs = item.dividendsData?.cashDividends || [];
        const historico_dividendos: DirectDividendEvent[] = [];
        let dividendos_12m = 0;
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

        for (const cd of cashDivs) {
          const rawAmt = typeof cd.rate === "number" ? cd.rate : parseFloat(cd.rate);
          if (!rawAmt || isNaN(rawAmt)) continue;
          const pDate = cd.paymentDate || cd.lastDatePrior || cd.approvedOn;
          if (!pDate) continue;
          const dStr = pDate.split("T")[0];
          const divDate = new Date(dStr);

          historico_dividendos.push({
            date: dStr,
            amount: Number(rawAmt.toFixed(4)),
            paymentDate: dStr,
            recordDate: cd.lastDatePrior ? cd.lastDatePrior.split("T")[0] : dStr,
            type: cd.label || (isFii ? "RENDIMENTO" : "DIVIDENDO"),
            status: "paid",
          });

          if (divDate >= oneYearAgo) {
            dividendos_12m += rawAmt;
          }
        }

        historico_dividendos.sort((a, b) => b.date.localeCompare(a.date));

        return {
          ticker: formattedTicker,
          nome,
          setor,
          preco_atual,
          dividendos_12m: Number(dividendos_12m.toFixed(4)),
          historico_dividendos,
          historico_precos: (item.historicalDataPrice || []).map((hp: any) => ({
            date: new Date(hp.date * 1000).toISOString().split("T")[0],
            close: hp.close,
          })),
        };
      }
    }
  } catch (bErr) {
    console.warn(`Fallback brapi também indisponível para ${cleanSym}:`, bErr);
  }

  return null;
}

// Batch internal direct fetching
export async function fetchMultipleAssetsDirectly(
  tickers: string[],
  fullHistory: boolean = true
): Promise<DirectAssetData[]> {
  if (!tickers || tickers.length === 0) return [];
  const uniqueTickers = [...new Set(tickers.map(t => formatTickerForYahoo(t)).filter(Boolean))];
  
  const promises = uniqueTickers.map(t => fetchDirectYahooData(t, fullHistory));
  const results = await Promise.all(promises);
  return results.filter(Boolean) as DirectAssetData[];
}

function parseYahooChartResponse(ticker: string, chartData: any): DirectAssetData | null {
  const result = chartData?.chart?.result?.[0];
  if (!result) return null;

  const meta = result.meta || {};
  const timestamps = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0] || {};
  const events = result.events || {};
  const dividendEvents = events.dividends || {};

  // Build price history
  const historico_precos: DirectHistoricalPrice[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const closePrice = quotes.close?.[i];
    if (closePrice !== null && closePrice !== undefined && !isNaN(closePrice)) {
      const date = new Date(timestamps[i] * 1000).toISOString().split("T")[0];
      historico_precos.push({ date, close: closePrice });
    }
  }

  const lastPrice = historico_precos.length > 0 ? historico_precos[historico_precos.length - 1].close : 0;
  const preco_atual = Number((meta.regularMarketPrice || meta.previousClose || lastPrice || 0).toFixed(2));
  const nome = meta.shortName || meta.longName || ticker.replace(".SA", "");
  const setor = meta.exchangeName || "B3";

  // Build dividend history
  const historico_dividendos: DirectDividendEvent[] = [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  let dividendos_12m = 0;

  const cleanSym = ticker.replace(".SA", "").toUpperCase();
  const isFii = cleanSym.endsWith("11");

  for (const timestamp in dividendEvents) {
    const div = dividendEvents[timestamp];
    const divDate = new Date(parseInt(timestamp, 10) * 1000);
    const dateStr = divDate.toISOString().split("T")[0];
    const amount = Number((div.amount || 0).toFixed(4));

    let paymentDate = dateStr;
    if (isFii) {
      const nextMonth = new Date(divDate.getFullYear(), divDate.getMonth() + 1, 14);
      paymentDate = nextMonth.toISOString().split("T")[0];
    }

    historico_dividendos.push({
      date: paymentDate || dateStr,
      amount,
      paymentDate,
      recordDate: dateStr,
      type: isFii ? "RENDIMENTO" : "DIVIDEND",
      status: "paid",
    });

    if (divDate >= oneYearAgo) {
      dividendos_12m += amount;
    }
  }

  historico_dividendos.sort((a, b) => b.date.localeCompare(a.date));

  return {
    ticker,
    nome,
    setor,
    preco_atual,
    dividendos_12m: Number(dividendos_12m.toFixed(4)),
    historico_precos,
    historico_dividendos,
  };
}
