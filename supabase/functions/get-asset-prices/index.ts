import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// This is the unofficial Yahoo Finance API endpoint
const YFINANCE_API_URL = 'https://query1.finance.yahoo.com/v7/finance/quote';

// Helper function to handle CORS preflight requests
const handleOptions = (req: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // Allow any origin
    'Access-Control-Allow-Methods': 'GET, OPTIONS', // Allow GET and OPTIONS methods
    'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Allow specific headers
  };
  // For preflight requests, return OK with CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

// Main server function
serve(async (req) => {
  // Handle CORS preflight requests first
  const optionsResponse = handleOptions(req);
  if (optionsResponse) {
    return optionsResponse;
  }

  const url = new URL(req.url);
  const symbolsParam = url.searchParams.get('symbols');

  // Return an error if the 'symbols' parameter is missing
  if (!symbolsParam) {
    return new Response(
      JSON.stringify({ error: 'Missing "symbols" query parameter' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }

  // Sanitize and format tickers before sending to Yahoo Finance
  const originalSymbols = symbolsParam.split(',');
  const formattedSymbols = originalSymbols.map(symbol => {
    const trimmed = symbol.trim().toUpperCase();
    // B3 assets (stocks, FIIs, etc.) need the .SA suffix.
    // We identify them by checking that they are NOT crypto tickers (which contain a '-')
    if (!trimmed.includes('-')) {
      return `${trimmed}.SA`;
    } 
    // Crypto tickers (like BTC-USD) and others remain unchanged.
    return trimmed;
  });

  try {
    // Fetch data from Yahoo Finance API with the formatted symbols
    const response = await fetch(`${YFINANCE_API_URL}?symbols=${formattedSymbols.join(',')}`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Yahoo Finance API request failed with status ${response.status}: ${errorText}`);
      throw new Error(`Yahoo Finance API request failed.`);
    }
    const data = await response.json();

    if (!data.quoteResponse || !data.quoteResponse.result) {
      throw new Error('Invalid response structure from Yahoo Finance API');
    }

    // Map the Yahoo Finance response back to our desired structure
    const prices = data.quoteResponse.result.map((asset: any) => ({
      // Return the original symbol without the .SA suffix for consistency in the frontend
      symbol: asset.symbol.replace(/\.SA$/, ''),
      price: asset.regularMarketPrice,
      // Add the asset's name, falling back from longName to shortName
      name: asset.longName || asset.shortName || null,
      currency: asset.currency,
    }));

    return new Response(
      JSON.stringify(prices),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*', // Ensure CORS header is present in final response
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});
