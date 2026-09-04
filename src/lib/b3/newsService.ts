export interface PortfolioNewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: string;
  timestamp: number;
  source: string;
  category: 'fato-relevante' | 'provento' | 'resultado' | 'mercado';
  matchedTickers: string[];
  isPortfolioAsset: boolean;
}

// In-memory cache to avoid duplicate requests and ensure instant tab switching
let cachedNews: PortfolioNewsItem[] = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes
const STORAGE_KEY = 'organiza_cached_portfolio_news';

const COMPANY_NAME_MAP: Record<string, string> = {
  'PETROBRAS': 'PETR4',
  'VALE': 'VALE3',
  'ITAU': 'ITUB4',
  'ITAÚ': 'ITUB4',
  'BRADESCO': 'BBDC4',
  'BANCO DO BRASIL': 'BBAS3',
  'WEG': 'WEGE3',
  'AMBEV': 'ABEV3',
  'SUZANO': 'SUZB3',
  'B3': 'B3SA3',
  'EMBRAER': 'EMBR3',
  'GERDAU': 'GGBR4',
  'MAXI RENDA': 'MXRF11',
  'CSHG LOGISTICA': 'HGLG11',
  'XP MALLS': 'XPML11',
  'KINEA': 'KNRI11',
  'VBI PRIME': 'PVBI11',
  'BTG PACTUAL': 'BPAC11',
  'TAESA': 'TAEE11',
  'SANEPAR': 'SAPR11',
  'COPEL': 'CPLE6',
  'EQUATORIAL': 'EQTL3',
};

function cleanHtml(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '“')
    .replace(/&#8221;/g, '”')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRssXml(xmlText: string, sourceName: string): Omit<PortfolioNewsItem, 'category' | 'matchedTickers' | 'isPortfolioAsset'>[] {
  const results: Omit<PortfolioNewsItem, 'category' | 'matchedTickers' | 'isPortfolioAsset'>[] = [];
  if (!xmlText || xmlText.startsWith('<!DOCTYPE') || xmlText.startsWith('<html')) return results;

  const itemMatches = xmlText.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const itemXml of itemMatches) {
    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
    const guidMatch = itemXml.match(/<guid[\s\S]*?>([\s\S]*?)<\/guid>/i);

    const title = cleanHtml(titleMatch?.[1] || '');
    const link = (cleanHtml(linkMatch?.[1] || '')).replace(/\s/g, '');
    const pubDateStr = cleanHtml(pubDateMatch?.[1] || '');
    let description = cleanHtml(descMatch?.[1] || '');

    description = description.split('The post')[0].trim();
    if (description.length > 200) {
      description = description.slice(0, 197) + '...';
    }

    if (!title || !link) continue;

    const parsedDate = pubDateStr ? new Date(pubDateStr) : new Date();
    const timestamp = isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();
    const id = guidMatch?.[1] ? cleanHtml(guidMatch[1]) : `${sourceName}-${title.slice(0, 30)}-${timestamp}`;

    results.push({
      id,
      title,
      description: description || title,
      link,
      pubDate: pubDateStr,
      timestamp,
      source: sourceName,
    });
  }

  return results;
}

function detectCategory(title: string, desc: string): PortfolioNewsItem['category'] {
  const text = `${title} ${desc}`.toLowerCase();

  if (
    text.includes('fato relevante') ||
    text.includes('comunicado ao mercado') ||
    text.includes('aviso aos acionistas') ||
    text.includes('oferta pública') ||
    text.includes('aquisição') ||
    text.includes('fusão') ||
    text.includes('assembleia geral') ||
    text.includes('renúncia') ||
    text.includes('eleição de')
  ) {
    return 'fato-relevante';
  }

  if (
    text.includes('dividendo') ||
    text.includes('juros sobre capital') ||
    text.includes(' jcp ') ||
    text.includes('jcp:') ||
    text.includes('provento') ||
    text.includes('rendimento') ||
    text.includes('data com') ||
    text.includes('data-com') ||
    text.includes('pagará r$') ||
    text.includes('anuncia pagamento')
  ) {
    return 'provento';
  }

  if (
    text.includes('balanço') ||
    text.includes('lucro') ||
    text.includes('prejuízo') ||
    text.includes('ebitda') ||
    text.includes('resultado') ||
    text.includes('receita líquida') ||
    text.includes('trimestre')
  ) {
    return 'resultado';
  }

  return 'mercado';
}

function detectTickers(
  title: string,
  desc: string,
  portfolioTickers: string[]
): { tickers: string[]; isPortfolio: boolean } {
  const normalizedUserTickers = new Set(
    portfolioTickers.map(t => t.replace('.SA', '').toUpperCase().trim()).filter(Boolean)
  );
  const matched = new Set<string>();
  const textUpper = `${title} ${desc}`.toUpperCase();

  // 1. Detect standard B3 format (e.g. PETR4, VALE3, MXRF11, XPML11)
  const b3Matches = textUpper.match(/\b([A-Z]{4}(?:3|4|5|6|11))\b/g);
  if (b3Matches) {
    for (const ticker of b3Matches) {
      matched.add(ticker);
    }
  }

  // 2. Check for company names mentioned
  for (const [companyName, ticker] of Object.entries(COMPANY_NAME_MAP)) {
    if (textUpper.includes(companyName)) {
      matched.add(ticker);
    }
  }

  // 3. Match against user's specific portfolio tickers
  for (const userTicker of normalizedUserTickers) {
    if (textUpper.includes(userTicker)) {
      matched.add(userTicker);
    }
  }

  const matchedArray = Array.from(matched);
  const isPortfolio = matchedArray.some(t => normalizedUserTickers.has(t));

  return { tickers: matchedArray, isPortfolio };
}

/**
 * Fetches RSS feed converting via RSS2JSON (CORS safe everywhere),
 * with fallback to local proxy in dev or raw XML proxy.
 */
async function fetchFeedResilient(
  directRssUrl: string,
  localDevPath: string,
  sourceName: string
): Promise<Omit<PortfolioNewsItem, 'category' | 'matchedTickers' | 'isPortfolioAsset'>[]> {
  // Strategy 1: Public RSS2JSON API (Works everywhere on production web & PWA without CORS issues)
  try {
    const rss2JsonUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(directRssUrl)}`;
    const res = await fetch(rss2JsonUrl, { signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'ok' && Array.isArray(data.items) && data.items.length > 0) {
        return data.items.map((item: any) => {
          const title = cleanHtml(item.title || '');
          const link = cleanHtml(item.link || '').replace(/\s/g, '');
          const pubDateStr = cleanHtml(item.pubDate || '');
          let description = cleanHtml(item.description || item.content || '');
          if (description.length > 200) description = description.slice(0, 197) + '...';
          const parsedDate = pubDateStr ? new Date(pubDateStr) : new Date();
          const timestamp = isNaN(parsedDate.getTime()) ? Date.now() : parsedDate.getTime();
          const id = item.guid || `${sourceName}-${title.slice(0, 30)}-${timestamp}`;

          return {
            id,
            title,
            description: description || title,
            link,
            pubDate: pubDateStr,
            timestamp,
            source: sourceName,
          };
        }).filter((item: any) => Boolean(item.title && item.link));
      }
    }
  } catch {
    // Continue to next strategy
  }

  // Strategy 2: Local Vite dev proxy if available and in DEV mode
  if (import.meta.env.DEV && localDevPath) {
    try {
      const res = await fetch(localDevPath, { signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const text = await res.text();
        const parsed = parseRssXml(text, sourceName);
        if (parsed.length > 0) return parsed;
      }
    } catch {
      // Continue to next strategy
    }
  }

  // Strategy 3: CodeTabs CORS Proxy for raw XML
  try {
    const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(directRssUrl)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const text = await res.text();
      const parsed = parseRssXml(text, sourceName);
      if (parsed.length > 0) return parsed;
    }
  } catch {
    // Failed all strategies
  }

  return [];
}

/**
 * Fallback static market items in case network is completely offline
 */
const BACKUP_MARKET_NEWS: Omit<PortfolioNewsItem, 'category' | 'matchedTickers' | 'isPortfolioAsset'>[] = [
  {
    id: 'backup-1',
    title: 'Ibovespa: Ações do setor financeiro e commodities concentram fluxo de investidores',
    description: 'Empresas como Petrobras (PETR4), Vale (VALE3) e grandes bancos sustentam o volume financeiro na B3.',
    link: 'https://www.infomoney.com.br/mercados/',
    pubDate: new Date().toLocaleDateString('pt-BR'),
    timestamp: Date.now() - 3600000,
    source: 'InfoMoney',
  },
  {
    id: 'backup-2',
    title: 'Fatos Relevantes e Proventos: Temporada de dividendos e JCP movimentam o mercado',
    description: 'Companhias listadas na B3 atualizam cronograma de pagamento de dividendos e informes aos acionistas.',
    link: 'https://www.moneytimes.com.br/',
    pubDate: new Date().toLocaleDateString('pt-BR'),
    timestamp: Date.now() - 7200000,
    source: 'Money Times',
  },
  {
    id: 'backup-3',
    title: 'Fundos Imobiliários: MXRF11, HGLG11 e XPML11 divulgam rendimentos mensais',
    description: 'FIIs de papel e logística mantêm regularidade de distribuição de proventos aos cotistas.',
    link: 'https://www.seudinheiro.com/',
    pubDate: new Date().toLocaleDateString('pt-BR'),
    timestamp: Date.now() - 10800000,
    source: 'Seu Dinheiro',
  }
];

export async function getPortfolioNews(
  portfolioTickers: string[] = [],
  forceRefresh: boolean = false
): Promise<PortfolioNewsItem[]> {
  const now = Date.now();

  // Return in-memory cache if valid
  if (!forceRefresh && cachedNews.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedNews.map(item => {
      const { isPortfolio } = detectTickers(item.title, item.description, portfolioTickers);
      return { ...item, isPortfolioAsset: isPortfolio };
    });
  }

  // Check persistent storage on startup
  if (!forceRefresh && cachedNews.length === 0) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: PortfolioNewsItem[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cachedNews = parsed;
          lastFetchTime = now;
          return cachedNews.map(item => {
            const { isPortfolio } = detectTickers(item.title, item.description, portfolioTickers);
            return { ...item, isPortfolioAsset: isPortfolio };
          });
        }
      }
    } catch {
      // Ignore storage error
    }
  }

  const normalizedUserTickers = Array.from(
    new Set(portfolioTickers.map(t => t.replace('.SA', '').toUpperCase().trim()).filter(Boolean))
  );

  // 1. Brazilian Market & Corporate RSS Feeds
  const feedPromises: Promise<Omit<PortfolioNewsItem, 'category' | 'matchedTickers' | 'isPortfolioAsset'>[]>[] = [
    fetchFeedResilient(
      'https://www.moneytimes.com.br/feed/',
      '/api/feeds/moneytimes/feed/',
      'Money Times'
    ),
    fetchFeedResilient(
      'https://www.infomoney.com.br/feed/',
      '/api/feeds/infomoney/feed/',
      'InfoMoney'
    ),
    fetchFeedResilient(
      'https://g1.globo.com/rss/g1/economia/',
      '',
      'G1 Economia'
    ),
    fetchFeedResilient(
      'https://www.seudinheiro.com/feed/',
      '/api/feeds/seudinheiro/feed/',
      'Seu Dinheiro'
    ),
  ];

  // 2. Specific Yahoo Finance RSS for active portfolio tickers (up to 5 assets)
  const topPortfolioTickers = normalizedUserTickers.slice(0, 5);
  for (const ticker of topPortfolioTickers) {
    const formatted = `${ticker}.SA`;
    feedPromises.push(
      fetchFeedResilient(
        `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${formatted}`,
        `/api/feeds/yahoo-rss/rss/2.0/headline?s=${encodeURIComponent(formatted)}`,
        `Yahoo Finance (${ticker})`
      )
    );
  }

  const feedResults = await Promise.allSettled(feedPromises);
  const rawItems: Omit<PortfolioNewsItem, 'category' | 'matchedTickers' | 'isPortfolioAsset'>[] = [];

  for (const res of feedResults) {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      rawItems.push(...res.value);
    }
  }

  // If no items were fetched (e.g. total network block), fallback to backup items
  if (rawItems.length === 0) {
    rawItems.push(...BACKUP_MARKET_NEWS);
  }

  // Deduplicate by URL and similar title
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const consolidated: PortfolioNewsItem[] = [];

  for (const raw of rawItems) {
    const cleanLink = (raw.link || '').split('?')[0].toLowerCase();
    const titleKey = (raw.title || '').slice(0, 45).toLowerCase().replace(/[^\w]/g, '');

    if (seenLinks.has(cleanLink) || (titleKey && seenTitles.has(titleKey))) {
      continue;
    }
    if (cleanLink) seenLinks.add(cleanLink);
    if (titleKey) seenTitles.add(titleKey);

    const category = detectCategory(raw.title, raw.description);
    const { tickers, isPortfolio } = detectTickers(raw.title, raw.description, portfolioTickers);

    if (raw.source.includes('Yahoo Finance (') && !tickers.length) {
      const matchSourceTicker = raw.source.match(/\((.*?)\)/)?.[1];
      if (matchSourceTicker) {
        tickers.push(matchSourceTicker);
      }
    }

    consolidated.push({
      ...raw,
      category,
      matchedTickers: tickers,
      isPortfolioAsset: isPortfolio || raw.source.includes('Yahoo Finance ('),
    });
  }

  // Sort by newest publication date
  consolidated.sort((a, b) => b.timestamp - a.timestamp);

  cachedNews = consolidated;
  lastFetchTime = Date.now();

  // Save to localStorage for instant startup and offline resilience
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(consolidated.slice(0, 50)));
  } catch {
    // Ignore storage write error
  }

  return consolidated;
}
