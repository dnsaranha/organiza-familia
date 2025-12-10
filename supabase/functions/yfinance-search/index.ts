import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Yahoo Finance search API endpoint
const YFINANCE_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract search query from request body
    const { query } = await req.json();
    console.log(`Buscando tickers para: ${query}`);

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing "query" parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch search results from Yahoo Finance
    const searchUrl = `${YFINANCE_SEARCH_URL}?q=${encodeURIComponent(query)}&lang=pt-BR&quotesCount=20&newsCount=0`;
    console.log(`Fetching from: ${searchUrl}`);
    
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`);
      throw new Error(`Yahoo Finance API returned ${response.status}`);
    }

    const data = await response.json();
    console.log(`Received ${data.quotes?.length || 0} quotes from Yahoo Finance`);

    // Filter for relevant exchanges (São Paulo, NASDAQ, NYSE, Crypto, and others)
    const relevantExchanges = ['SAO', 'NMS', 'NYQ', 'CRYPTO', 'PNK', 'NCM', 'NGM', 'BTS'];
    const filteredResults = (data.quotes || [])
      .filter((quote: any) => {
        // Include if in relevant exchanges OR if it's a Brazilian stock (ends with .SA)
        const isRelevantExchange = relevantExchanges.includes(quote.exchange);
        const isBrazilianStock = quote.symbol?.endsWith('.SA');
        return (isRelevantExchange || isBrazilianStock) && quote.symbol;
      })
      .map((quote: any) => ({
        // Return a clean symbol (without .SA) for consistency in our app
        symbol: quote.symbol.replace(/\.SA$/, ''), 
        name: quote.longname || quote.shortname || quote.symbol,
        exchange: quote.exchange,
      }))
      .slice(0, 15); // Limit to 15 results

    console.log(`Returning ${filteredResults.length} filtered results`);

    return new Response(
      JSON.stringify(filteredResults),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in yfinance-search:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
