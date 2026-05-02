import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QuotesRequest {
  symbols: string[];
}

// Mapeamento de símbolos para Yahoo Finance
const mapSymbolToYahoo = (symbol: string): string => {
  // Ações brasileiras
  if (symbol.match(/^[A-Z]{4}[0-9]{1,2}$/)) {
    return `${symbol}.SA`;
  }

  // FIIs brasileiros
  if (symbol.match(/^[A-Z]{4}11$/)) {
    return `${symbol}.SA`;
  }

  // Criptomoedas
  if (symbol === "BTC") return "BTC-USD";
  if (symbol === "ETH") return "ETH-USD";

  // ETFs brasileiros
  if (
    symbol.startsWith("BOVA") ||
    symbol.startsWith("SMAL") ||
    symbol.startsWith("IVVB")
  ) {
    return `${symbol}.SA`;
  }

  return symbol;
};

// Função para gerar dados de fallback quando a API falhar
const generateFallbackQuote = (symbol: string) => {
  const basePrice = 100 + Math.random() * 50;
  const change = (Math.random() - 0.5) * 5;
  const changePercent = (change / basePrice) * 100;

  return {
    symbol: symbol.replace(".SA", ""),
    shortName: symbol.replace(".SA", ""),
    longName: `${symbol.replace(".SA", "")} - Dados Indisponíveis`,
    currency: "BRL",
    regularMarketPrice: basePrice,
    regularMarketChange: change,
    regularMarketChangePercent: changePercent,
    regularMarketTime: new Date().toISOString(),
    marketCap: 0,
    volume: 0,
    averageDailyVolume3Month: 0,
    fiftyTwoWeekLow: basePrice * 0.8,
    fiftyTwoWeekHigh: basePrice * 1.2,
    dividendYield: null,
    trailingPE: null,
    forwardPE: null,
  };
};

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    let parsed: QuotesRequest;
    try {
      parsed = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { symbols } = parsed || ({} as QuotesRequest);
    if (!Array.isArray(symbols) || symbols.length === 0 || symbols.length > 50) {
      return new Response(
        JSON.stringify({ error: 'symbols must be a non-empty array (max 50)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }
    const symbolPattern = /^[A-Za-z0-9._-]{1,15}$/;
    if (!symbols.every((s) => typeof s === 'string' && symbolPattern.test(s))) {
      return new Response(
        JSON.stringify({ error: 'Invalid symbol format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Mapear símbolos para formato Yahoo Finance
    const yahooSymbols = symbols.map(mapSymbolToYahoo);
    const symbolsParam = yahooSymbols.join(",");

    // Buscar cotações via Yahoo Finance com timeout
    console.log(`Fetching quotes for symbols: ${symbolsParam}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

    let yahooData;
    let useFallback = false;
    
    try {
      const yahooResponse = await fetch(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbolsParam}`,
        {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json",
            "Accept-Language": "en-US,en;q=0.9",
            "Accept-Encoding": "gzip, deflate, br",
            Referer: "https://finance.yahoo.com/",
            Origin: "https://finance.yahoo.com",
          },
        },
      );

      clearTimeout(timeoutId);

      console.log(`Yahoo Finance response status: ${yahooResponse.status}`);

      if (!yahooResponse.ok) {
        const errorText = await yahooResponse.text();
        console.error(`Yahoo Finance error response: ${errorText}`);
        console.warn("Yahoo Finance API indisponível, usando dados de fallback");
        useFallback = true;
      } else {
        yahooData = await yahooResponse.json();
        
        if (!yahooData.quoteResponse || !yahooData.quoteResponse.result) {
          console.warn("Resposta do Yahoo Finance inválida, usando dados de fallback");
          useFallback = true;
        }
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error("Request timeout para Yahoo Finance");
      } else {
        console.error("Erro ao buscar dados do Yahoo Finance:", error);
      }
      
      console.warn("Usando dados de fallback devido a erro na API");
      useFallback = true;
    }

    // Se precisar usar fallback, gerar dados simulados
    if (useFallback) {
      const fallbackQuotes = yahooSymbols.map(generateFallbackQuote);
      return new Response(JSON.stringify({ quotes: fallbackQuotes, fallback: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!yahooData.quoteResponse || !yahooData.quoteResponse.result) {
      console.warn("Resposta do Yahoo Finance não contém quoteResponse.result");
      return new Response(JSON.stringify({ quotes: [], fallback: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Processar e formatar dados, filtrando resultados nulos ou sem preço
    const quotes = yahooData.quoteResponse.result
      .map((quote: any) => {
        if (!quote || typeof quote.regularMarketPrice !== "number") {
          return null; // Ignorar resultados inválidos
        }

        return {
          symbol: quote.symbol.replace(".SA", ""), // Mapear de volta para o símbolo original
          shortName: quote.shortName || quote.symbol.replace(".SA", ""),
          longName:
            quote.longName ||
            quote.shortName ||
            quote.symbol.replace(".SA", ""),
          currency: quote.currency || "BRL",
          regularMarketPrice: quote.regularMarketPrice,
          regularMarketChange: quote.regularMarketChange || 0,
          regularMarketChangePercent: quote.regularMarketChangePercent || 0,
          regularMarketTime: quote.regularMarketTime
            ? new Date(quote.regularMarketTime * 1000).toISOString()
            : new Date().toISOString(),
          marketCap: quote.marketCap || 0,
          volume: quote.regularMarketVolume || 0,
          averageDailyVolume3Month: quote.averageDailyVolume3Month || 0,
          fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
          fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
          dividendYield: quote.dividendYield || null,
          trailingPE: quote.trailingPE || null,
          forwardPE: quote.forwardPE || null,
        };
      })
      .filter((quote: any): quote is any => quote !== null);

    return new Response(JSON.stringify({ quotes, fallback: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Erro na função b3-quotes:", error);
    return new Response(JSON.stringify({ error: 'An error occurred processing your request' }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
