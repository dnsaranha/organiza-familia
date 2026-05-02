import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PortfolioRequest {
  brokerId: string;
  accessToken: string;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const { brokerId, accessToken }: PortfolioRequest = await req.json();

    // Para demonstração, retornamos dados simulados mais realistas
    // Em produção, isso faria chamadas reais para APIs das corretoras
    
    // Simular delay de API real
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Dados simulados mais realistas baseados em cotações reais
    const mockPortfolio = {
      accountId: `${brokerId}-account-001`,
      positions: [
        {
          symbol: 'PETR4',
          quantity: 100,
          averagePrice: 30.50,
          currentPrice: 32.15,
          marketValue: 3215.00,
          gainLoss: 165.00,
          gainLossPercent: 5.41,
          assetType: 'STOCK' as const,
        },
        {
          symbol: 'VALE3',
          quantity: 50,
          averagePrice: 65.20,
          currentPrice: 68.45,
          marketValue: 3422.50,
          gainLoss: 162.50,
          gainLossPercent: 4.98,
          assetType: 'STOCK' as const,
        },
        {
          symbol: 'KNRI11',
          quantity: 80,
          averagePrice: 160.00,
          currentPrice: 165.30,
          marketValue: 13224.00,
          gainLoss: 424.00,
          gainLossPercent: 3.31,
          assetType: 'FII' as const,
        },
        {
          symbol: 'BOVA11',
          quantity: 25,
          averagePrice: 120.50,
          currentPrice: 125.80,
          marketValue: 3145.00,
          gainLoss: 132.50,
          gainLossPercent: 4.40,
          assetType: 'ETF' as const,
        },
      ],
      totalValue: 0,
      totalCost: 0,
      totalGainLoss: 0,
      totalGainLossPercent: 0,
    };

    // Calcular totais
    mockPortfolio.totalCost = mockPortfolio.positions.reduce(
      (sum, pos) => sum + (pos.averagePrice * pos.quantity), 0
    );
    mockPortfolio.totalValue = mockPortfolio.positions.reduce(
      (sum, pos) => sum + pos.marketValue, 0
    );
    mockPortfolio.totalGainLoss = mockPortfolio.totalValue - mockPortfolio.totalCost;
    mockPortfolio.totalGainLossPercent = (mockPortfolio.totalGainLoss / mockPortfolio.totalCost) * 100;

    return new Response(
      JSON.stringify({ portfolio: mockPortfolio }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Erro na função b3-portfolio:', error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});