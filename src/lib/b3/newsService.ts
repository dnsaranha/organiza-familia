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
  if (!xmlText) return results;

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

    // Cut off redundant trailing boilerplate from RSS aggregators
    description = description.split('The post')[0].trim();
    if (description.length > 180) {
      description = description.slice(0, 177) + '...';
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
  const normalizedUserTickers = new Set(portfolioTickers.map(t => t.replace('.SA', '').toUpperCase().trim()));
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

async function fetchFeedSafe(primaryUrl: string, fallbackUrl: string, sourceName: string): Promise<Omit<PortfolioNewsItem, 'category' | 'matchedTickers' | 'isPortfolioAsset'>[]> {
  try {
    const res = await fetch(primaryUrl);
    if (res.ok) {
      const text = await res.text();
      const parsed = parseRssXml(text, sourceName);
      if (parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn(`[NewsService] Primary feed failed for ${sourceName}:`, err);
  }

  if (fallbackUrl) {
    try {
      const resFallback = await fetch(fallbackUrl);
      if (resFallback.ok) {
        const text = await resFallback.text();
        return parseRssXml(text, sourceName);
      }
    } catch (fallbackErr) {
      console.warn(`[NewsService] Fallback feed failed for ${sourceName}:`, fallbackErr);
    }
  }

  return [];
}

export async function getPortfolioNews(
  portfolioTickers: string[] = [],
  forceRefresh: boolean = false
): Promise<PortfolioNewsItem[]> {
  const now = Date.now();
  if (!forceRefresh && cachedNews.length > 0 && now - lastFetchTime < CACHE_TTL_MS) {
    // Re-evaluate portfolio matches based on current portfolio tickers
    return cachedNews.map(item => {
      const { isPortfolio } = detectTickers(item.title, item.description, portfolioTickers);
      return { ...item, isPortfolioAsset: isPortfolio };
    });
  }

  const normalizedUserTickers = Array.from(
    new Set(portfolioTickers.map(t => t.replace('.SA', '').toUpperCase().trim()))
  );

  // 1. General Brazilian Market & Corporate RSS Feeds (Free public feeds)
  const feedPromises: Promise<Omit<PortfolioNewsItem, 'category' | 'matchedTickers' | 'isPortfolioAsset'>[]>[] = [
    fetchFeedSafe(
      '/api/feeds/moneytimes/feed/',
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.moneytimes.com.br/feed/'),
      'Money Times'
    ),
    fetchFeedSafe(
      '/api/feeds/infomoney/feed/',
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.infomoney.com.br/feed/'),
      'InfoMoney'
    ),
    fetchFeedSafe(
      '/api/feeds/seudinheiro/feed/',
      'https://api.allorigins.win/raw?url=' + encodeURIComponent('https://www.seudinheiro.com/feed/'),
      'Seu Dinheiro'
    ),
  ];

  // 2. Specific Yahoo Finance RSS for active portfolio tickers (up to 8 assets to avoid rate limiting)
  const topPortfolioTickers = normalizedUserTickers.slice(0, 8);
  for (const ticker of topPortfolioTickers) {
    const formatted = `${ticker}.SA`;
    feedPromises.push(
      fetchFeedSafe(
        `/api/feeds/yahoo-rss/rss/2.0/headline?s=${encodeURIComponent(formatted)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${formatted}`)}`,
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

  // Deduplicate by URL and similar title
  const seenLinks = new Set<string>();
  const seenTitles = new Set<string>();
  const consolidated: PortfolioNewsItem[] = [];

  for (const raw of rawItems) {
    const cleanLink = raw.link.split('?')[0].toLowerCase();
    const titleKey = raw.title.slice(0, 45).toLowerCase().replace(/[^\w]/g, '');

    if (seenLinks.has(cleanLink) || seenTitles.has(titleKey)) {
      continue;
    }
    seenLinks.add(cleanLink);
    seenTitles.add(titleKey);

    const category = detectCategory(raw.title, raw.description);
    const { tickers, isPortfolio } = detectTickers(raw.title, raw.description, portfolioTickers);

    // If item comes from ticker-specific Yahoo RSS, ensure that ticker is tagged
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

  return consolidated;
}
