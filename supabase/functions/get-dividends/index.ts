import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DividendRequest {
  tickers: string[];
  months?: number; // Number of months to look back (default 12)
}

interface DividendData {
  ticker: string;
  totalDividends: number;
  lastDividendDate?: string;
  lastDividendAmount?: number;
  dividendHistory: Array<{
    date: string;
    amount: number;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tickers, months = 12 }: DividendRequest = await req.json();

    if (!tickers || tickers.length === 0) {
      throw new Error('Tickers array is required');
    }

    console.log(`Fetching dividend data for ${tickers.length} tickers`);

    const dividendPromises = tickers.map(ticker => fetchTickerDividends(ticker, months));
    const dividendResults = await Promise.all(dividendPromises);
    const validDividends = dividendResults.filter(d => d !== null);

    return new Response(
      JSON.stringify({ dividends: validDividends }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in get-dividends function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function fetchTickerDividends(ticker: string, months: number): Promise<DividendData | null> {
  try {
    // Calculate date range
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = Math.floor((Date.now() - (months * 30 * 24 * 60 * 60 * 1000)) / 1000);

    // Yahoo Finance dividends endpoint
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${startDate}&period2=${endDate}&interval=1d&events=div`;

    console.log(`Fetching dividends for ${ticker}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const dividendHistory: Array<{ date: string; amount: number; paymentDate?: string; type?: string; status?: string }> = [];

    if (response.ok) {
      const data = await response.json();
      const chart = data?.chart?.result?.[0];
      const events = chart?.events?.dividends;

      if (events) {
        Object.values(events).forEach((div: any) => {
          const amount = div.amount || 0;
          const date = new Date(div.date * 1000).toISOString().split('T')[0];
          dividendHistory.push({ date, amount, status: 'paid' });
        });
      }
    }

    // Brazilian enrichment
    const cleanTicker = ticker.replace('.SA', '').trim().toUpperCase();
    try {
      const brapiRes = await fetch(`https://brapi.dev/api/quote/${encodeURIComponent(cleanTicker)}?dividends=true`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (brapiRes.ok) {
        const brapiJson = await brapiRes.json();
        const cashDivs = brapiJson?.results?.[0]?.dividendsData?.cashDividends;
        if (Array.isArray(cashDivs)) {
          const todayStr = new Date().toISOString().split('T')[0];
          for (const d of cashDivs) {
            const rate = typeof d.rate === 'number' ? d.rate : parseFloat(d.rate);
            if (!rate || isNaN(rate) || rate <= 0) continue;
            const payDate = d.paymentDate ? new Date(d.paymentDate).toISOString().split('T')[0] : (d.lastDatePrior ? new Date(d.lastDatePrior).toISOString().split('T')[0] : null);
            if (!payDate) continue;

            const label = (d.label || d.relatedTo || 'DIVIDEND').toUpperCase();
            let type = 'DIVIDEND';
            if (label.includes('JCP') || label.includes('JUROS')) type = 'JCP';
            else if (label.includes('RENDIMENTO') || label.includes('FII')) type = 'RENDIMENTO';

            const isAnnounced = payDate >= todayStr;

            const existing = dividendHistory.find(y => Math.abs(new Date(y.date).getTime() - new Date(payDate).getTime()) < 15 * 86400000 && Math.abs(y.amount - rate) < 0.02);
            if (existing) {
              existing.paymentDate = payDate;
              existing.type = type;
              existing.status = isAnnounced ? 'announced' : 'paid';
            } else {
              dividendHistory.push({
                date: payDate,
                amount: rate,
                paymentDate: payDate,
                type,
                status: isAnnounced ? 'announced' : 'paid',
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Brapi enrichment skipped for ${ticker}:`, e);
    }

    // Sort by date descending
    dividendHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let totalDividends = 0;
    let lastDividendDate: string | undefined;
    let lastDividendAmount: number | undefined;

    dividendHistory.forEach(d => {
      totalDividends += d.amount;
      if (!lastDividendDate || d.date > lastDividendDate) {
        lastDividendDate = d.date;
        lastDividendAmount = d.amount;
      }
    });

    return {
      ticker,
      totalDividends: Number(totalDividends.toFixed(4)),
      lastDividendDate,
      lastDividendAmount,
      dividendHistory,
    };
  } catch (error) {
    console.error(`Error fetching dividends for ${ticker}:`, error);
    return {
      ticker,
      totalDividends: 0,
      dividendHistory: [],
    };
  }
}
