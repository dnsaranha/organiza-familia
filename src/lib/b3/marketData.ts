import { supabase } from "@/integrations/supabase/client";

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

// Dicionário de ativos populares da B3 com nomes limpos e oficiais
export const KNOWN_ASSET_NAMES: Record<string, string> = {
  // Principais Fundos Imobiliários (FIIs)
  "MXRF11": "Maxi Renda FII",
  "HGLG11": "CSHG Logística FII",
  "XPML11": "XP Malls FII",
  "KNCR11": "Kinea Rendimentos Imobiliários FII",
  "KNIP11": "Kinea Índice de Preços FII",
  "BTLG11": "BTG Pactual Logística FII",
  "VISC11": "Vinci Shopping Centers FII",
  "XPLG11": "XP Log FII",
  "TGAR11": "TG Ativo Real FII",
  "CPTS11": "Capitânia Securities II FII",
  "VGHF11": "Valora Hedge Fund FII",
  "HGRU11": "CSHG Renda Urbana FII",
  "HGBS11": "Hedge Brasil Shopping FII",
  "TRXF11": "TRX Real Estate FII",
  "RZTR11": "Riza Terrax FII",
  "GALG11": "Guardian Real Estate FII",
  "VGIR11": "Valora RE III FII",
  "KNSC11": "Kinea Securities FII",
  "IRDM11": "Iridium Recebíveis Imobiliários FII",
  "RBRR11": "RBR Rendimento High Grade FII",
  "RBRF11": "RBR Alpha Multiestratégia FII",
  "VRTA11": "Fator Veritá FII",
  "RECT11": "REC Renda Imobiliária FII",
  "HSML11": "HSI Malls FII",
  "LVBI11": "VBI Logística FII",
  "PVBI11": "VBI Prime Properties FII",
  "ALZR11": "Alianza Trust Renda Imobiliária FII",
  "URPR11": "Urca Prime Renda FII",
  "DEVA11": "Devant Recebíveis Imobiliários FII",
  "BCFF11": "BTG Pactual Fundo de Fundos FII",
  "KFOF11": "Kinea Fundo de Fundos FII",
  "HFOF11": "Hedge Top FOFII 3 FII",
  "OUJP11": "Ourinvest JPP FII",
  "VINO11": "Vinci Offices FII",
  "RBRP11": "RBR Properties FII",
  "MCCI11": "Mauá Capital Recebíveis Imobiliários FII",
  "BTAL11": "BTG Pactual Agro Logística FII",
  "SNCI11": "Suno Recebíveis Imobiliários FII",
  "SNFF11": "Suno Fundo de Fundos FII",
  "SNAG11": "Suno Agro Fiagro",
  "GGRC11": "GGR Covepi Renda FII",
  "JSRE11": "JS Real Estate FII",
  "VILG11": "Vinci Logística FII",
  "MALL11": "Malls Brasil Plural FII",
  "RBED11": "RBR Renda Educacional FII",
  "SARE11": "Santander Renda de Aluguéis FII",
  "BLMG11": "BlueMacaw Logística FII",
  "VIUR11": "Vinci Imóveis Urbanos FII",

  // Principais Ações B3
  "ITUB4": "Itaú Unibanco",
  "BBDC4": "Bradesco",
  "BBAS3": "Banco do Brasil",
  "PETR4": "Petrobras PN",
  "PETR3": "Petrobras ON",
  "VALE3": "Vale",
  "TAEE11": "Taesa",
  "WEGE3": "WEG",
  "ABEV3": "Ambev",
  "B3SA3": "B3 S.A.",
  "EGIE3": "Engie Brasil",
  "RENT3": "Localiza",
  "GGBR4": "Gerdau",
  "CSNA3": "CSN",
  "SUZB3": "Suzano",
  "JBSS3": "JBS",
  "KLBN11": "Klabin",
  "SANB11": "Santander Brasil",
  "RADL3": "RaiaDrogasil",
  "MGLU3": "Magazine Luiza",
  "VIVT3": "Telefônica Brasil (Vivo)",
  "TIMS3": "TIM Brasil",
  "CMIG4": "Cemig",
  "CPLE6": "Copel",
  "ELET3": "Eletrobras ON",
  "ELET6": "Eletrobras PNB",
  "EQTL3": "Equatorial Energia",
  "SBSP3": "Sabesp",
  "PRIO3": "PRIO",
  "CSAN3": "Cosan",
  "LREN3": "Lojas Renner",
  "BBSE3": "BB Seguridade",
  "CXSE3": "Caixa Seguridade",
  "VBBR3": "Vibra Energia",
};

// Siglas de 4 letras de FIIs comuns para expansão automática
const KNOWN_FII_4LETTER = [
  "MXRF", "HGLG", "XPML", "KNCR", "KNIP", "BTLG", "VISC", "XPLG", "TGAR",
  "CPTS", "VGHF", "HGRU", "HGBS", "TRXF", "RZTR", "GALG", "VGIR", "KNSC",
  "IRDM", "RBRR", "RBRF", "VRTA", "RECT", "HSML", "LVBI", "PVBI", "ALZR",
  "URPR", "DEVA", "VINO", "RBRP", "MCCI", "BTAL", "SNCI", "SNFF", "SNAG",
  "GGRC", "JSRE", "VILG", "MALL", "RBED", "SARE", "BLMG", "VIUR"
];

// Limpeza e normalização do nome do ativo (remove ruídos da B3 como 'CI  ER', 'PN  EJ', etc.)
export function formatCleanAssetName(shortName?: string, longName?: string, ticker?: string): string {
  const cleanTicker = ticker ? ticker.replace(".SA", "").trim().toUpperCase() : "";
  if (cleanTicker && KNOWN_ASSET_NAMES[cleanTicker]) {
    return KNOWN_ASSET_NAMES[cleanTicker];
  }

  // Prioriza longName (que traz o nome completo sem truncamentos da bolsa)
  let raw = (longName && longName.trim().length > 0) ? longName : (shortName || cleanTicker || "Ativo B3");

  // Remove códigos técnicos e ruídos de negociação da B3
  raw = raw
    .replace(/\s+CI\s+ER\b/gi, "")
    .replace(/\s+CI\b/gi, "")
    .replace(/\s+ER\b/gi, "")
    .replace(/\s+PAX\b/gi, "")
    .replace(/\s+PN\s+EJ\s+N\d\b/gi, "")
    .replace(/\s+ON\s+EJ\s+N\d\b/gi, "")
    .replace(/\s+UNT\s+N\d\b/gi, "")
    .replace(/\s+ED\s+N\d\b/gi, "")
    .replace(/\s+N\d\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Para fundos imobiliários, assegura formatação elegante
  const isFii = cleanTicker.endsWith("11") || raw.toUpperCase().includes("FII") || raw.toUpperCase().includes("FUNDO");
  if (isFii && !raw.toUpperCase().includes("FII") && !raw.toUpperCase().includes("FUNDO")) {
    raw = `${raw} FII`;
  }

  return raw || cleanTicker;
}

export const formatTickerForYahoo = (ticker: string): string => {
  if (!ticker) return "";
  let clean = ticker.trim().toUpperCase();
  // Remove prefixos como "FII " ou "FUNDO " se o usuário digitou
  clean = clean.replace(/^FII\s+/i, "");
  clean = clean.replace(/^FUNDO\s+/i, "");
  // Remove espaços internos (ex: "MXRF 11" -> "MXRF11")
  clean = clean.replace(/\s+/g, "");

  // Se o usuário digitou apenas as 4 letras de um FII conhecido (ex: "MXRF", "HGLG")
  if (clean.match(/^[A-Z]{4}$/) && KNOWN_FII_4LETTER.includes(clean)) {
    clean = `${clean}11`;
  }

  if (clean.match(/^[A-Z]{4}\d{1,2}$/)) return `${clean}.SA`;
  return clean.endsWith(".SA") ? clean : `${clean}.SA`;
};

// Direct client-side fetch with multi-tier CORS resilience and Supabase Edge Function fallback
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
    `https://corsproxy.io/?${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${encodedTicker}?${chartParams}`)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://query1.finance.yahoo.com/v8/finance/chart/${encodedTicker}?${chartParams}`)}`,
  ];

  for (const url of candidateUrls) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json" },
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && !contentType.includes("text/html")) {
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

  // Fallback: Brapi (with multiple endpoints / CORS proxies)
  const brapiCandidates = [
    `/api/brapi/api/quote/${encodeURIComponent(cleanSym)}?dividends=true&range=10y&interval=1mo`,
    `https://brapi.dev/api/quote/${encodeURIComponent(cleanSym)}?dividends=true`,
    `https://corsproxy.io/?${encodeURIComponent(`https://brapi.dev/api/quote/${encodeURIComponent(cleanSym)}?dividends=true`)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://brapi.dev/api/quote/${encodeURIComponent(cleanSym)}?dividends=true`)}`,
  ];

  for (const bUrl of brapiCandidates) {
    try {
      const res = await fetch(bUrl, {
        headers: { Accept: "application/json" },
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && !contentType.includes("text/html")) {
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
          const todayStr = new Date().toISOString().split("T")[0];

          for (const cd of cashDivs) {
            const rawAmt = typeof cd.rate === "number" ? cd.rate : parseFloat(cd.rate);
            if (!rawAmt || isNaN(rawAmt)) continue;
            const pDate = cd.paymentDate || cd.lastDatePrior || cd.approvedOn;
            if (!pDate) continue;
            const dStr = pDate.split("T")[0];
            const divDate = new Date(dStr);
            const isAnnounced = (dStr >= todayStr) || (cd.lastDatePrior && cd.lastDatePrior.split("T")[0] >= todayStr);

            historico_dividendos.push({
              date: dStr,
              amount: Number(rawAmt.toFixed(4)),
              paymentDate: dStr,
              recordDate: cd.lastDatePrior ? cd.lastDatePrior.split("T")[0] : dStr,
              type: cd.label || (isFii ? "RENDIMENTO" : "DIVIDENDO"),
              status: isAnnounced ? "announced" : "paid",
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
      // Continue to next brapi candidate
    }
  }

  // Fallback 1: Supabase Edge Function 'yfinance-data' (runs server-side without CORS limits)
  try {
    const { data: edgeData, error: edgeErr } = await supabase.functions.invoke("yfinance-data", {
      body: { tickers: [formattedTicker], fullHistory },
    });
    if (!edgeErr && edgeData?.assets && edgeData.assets.length > 0) {
      const a = edgeData.assets[0];
      return {
        ticker: formattedTicker,
        nome: formatCleanAssetName(a.nome, a.nome, cleanSym),
        setor: a.setor || (isFii ? "Fundo Imobiliário" : "B3"),
        preco_atual: Number(a.preco_atual || 0),
        dividendos_12m: Number(a.dividendos_12m || 0),
        historico_dividendos: a.historico_dividendos || [],
        historico_precos: a.historico_precos || [],
      };
    }
  } catch (e) {
    // Continue to DB fallback
  }

  // Fallback 2: Consultar financial_assets gravado anteriormente no Supabase
  try {
    const { data: dbData } = await supabase
      .from("financial_assets")
      .select("*")
      .or(`ticker.eq.${formattedTicker},ticker.eq.${cleanSym}`)
      .maybeSingle();

    if (dbData) {
      return {
        ticker: formattedTicker,
        nome: formatCleanAssetName(dbData.name, dbData.name, cleanSym),
        setor: dbData.sector || (isFii ? "Fundo Imobiliário" : "B3"),
        preco_atual: Number(dbData.current_price || 0),
        dividendos_12m: Number(dbData.dividends_12m || 0),
        historico_dividendos: dbData.dividend_history || [],
        historico_precos: dbData.price_history || [],
      };
    }
  } catch (dbErr) {
    // Continue
  }

  // Fallback 3: Ativo conhecido na lista mas sem histórico de rede disponível
  if (KNOWN_ASSET_NAMES[cleanSym]) {
    return {
      ticker: formattedTicker,
      nome: KNOWN_ASSET_NAMES[cleanSym],
      setor: isFii ? "Fundo Imobiliário" : "B3",
      preco_atual: 0,
      dividendos_12m: 0,
      historico_dividendos: [],
      historico_precos: [],
    };
  }

  return null;
}

// Batch internal direct fetching with Edge Function and database recovery
export async function fetchMultipleAssetsDirectly(
  tickers: string[],
  fullHistory: boolean = true
): Promise<DirectAssetData[]> {
  if (!tickers || tickers.length === 0) return [];
  const uniqueTickers = [...new Set(tickers.map(t => formatTickerForYahoo(t)).filter(Boolean))];
  
  const promises = uniqueTickers.map(t => fetchDirectYahooData(t, fullHistory));
  const results = await Promise.all(promises);
  const found = results.filter(Boolean) as DirectAssetData[];

  // If any tickers are missing, batch invoke Edge Function for the missing ones
  const foundTickers = new Set(found.map(f => f.ticker.toUpperCase()));
  const missing = uniqueTickers.filter(t => !foundTickers.has(t.toUpperCase()));

  if (missing.length > 0) {
    try {
      const { data: edgeData, error } = await supabase.functions.invoke("yfinance-data", {
        body: { tickers: missing, fullHistory },
      });
      if (!error && edgeData?.assets && Array.isArray(edgeData.assets)) {
        for (const asset of edgeData.assets) {
          const cSym = asset.ticker.replace(".SA", "").toUpperCase();
          found.push({
            ticker: asset.ticker,
            nome: formatCleanAssetName(asset.nome, asset.nome, cSym),
            setor: asset.setor || (cSym.endsWith("11") ? "Fundo Imobiliário" : "B3"),
            preco_atual: Number(asset.preco_atual || 0),
            dividendos_12m: Number(asset.dividendos_12m || 0),
            historico_dividendos: asset.historico_dividendos || [],
            historico_precos: asset.historico_precos || [],
          });
        }
      }
    } catch (edgeErr) {
      console.warn("Edge batch fallback notice:", edgeErr);
    }
  }

  return found;
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

  const cleanSym = ticker.replace(".SA", "").toUpperCase();
  const isFii = cleanSym.endsWith("11");

  const lastPrice = historico_precos.length > 0 ? historico_precos[historico_precos.length - 1].close : 0;
  const preco_atual = Number((meta.regularMarketPrice || meta.previousClose || lastPrice || 0).toFixed(2));
  const nome = formatCleanAssetName(meta.shortName, meta.longName, cleanSym);
  const setor = isFii ? "Fundo Imobiliário" : (meta.exchangeName === "SAO" ? "B3" : (meta.exchangeName || "B3"));

  // Build dividend history
  const historico_dividendos: DirectDividendEvent[] = [];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  let dividendos_12m = 0;

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

    const todayStr = new Date().toISOString().split("T")[0];
    const isAnnounced = (paymentDate && paymentDate >= todayStr) || (dateStr >= todayStr);

    historico_dividendos.push({
      date: paymentDate || dateStr,
      amount,
      paymentDate,
      recordDate: dateStr,
      type: isFii ? "RENDIMENTO" : "DIVIDEND",
      status: isAnnounced ? "announced" : "paid",
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
