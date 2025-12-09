import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Yahoo Finance search API endpoint
const YFINANCE_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';

// CORS helper
const handleOptions = (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

serve(async (req) => {
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  try {
    // Extract search query from request body
    const { query } = await req.json();

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Missing "query" parameter' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Fetch search results from Yahoo Finance
    const response = await fetch(`${YFINANCE_SEARCH_URL}?q=${encodeURIComponent(query)}&lang=pt-BR`);
    if (!response.ok) {
      throw new Error('Failed to fetch from Yahoo Finance search API');
    }

    const data = await response.json();

    // Filter for relevant exchanges (São Paulo, NASDAQ, NYSE, Crypto)
    const relevantExchanges = ['SAO', 'NMS', 'NYQ', 'CRYPTO'];
    const filteredResults = data.quotes
      .filter((quote: any) => 
        relevantExchanges.includes(quote.exchange) && quote.symbol
      )
      .map((quote: any) => ({
        // Return a clean symbol (without .SA) for consistency in our app
        symbol: quote.symbol.replace(/\.SA$/, ''), 
        name: quote.longname || quote.shortname,
        exchange: quote.exchange,
      }));

    return new Response(
      JSON.stringify(filteredResults),
      { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  }
});
