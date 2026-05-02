import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DividendsRequest {
  brokerId: string;
  accessToken: string;
  fromDate?: string;
  toDate?: string;
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders });
    }

    const { brokerId, accessToken, fromDate, toDate }: DividendsRequest = await req.json();

    // Simular delay de API real
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));

    // Dados simulados de dividendos dos últimos meses
    const currentDate = new Date();
    const mockDividends = [
      {
        symbol: 'PETR4',
        exDate: new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentDate: new Date(currentDate.getTime() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 0.85,
        type: 'DIVIDEND' as const,
        status: 'PAID' as const,
      },
      {
        symbol: 'VALE3',
        exDate: new Date(currentDate.getTime() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentDate: new Date(currentDate.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 1.20,
        type: 'DIVIDEND' as const,
        status: 'PAID' as const,
      },
      {
        symbol: 'KNRI11',
        exDate: new Date(currentDate.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentDate: new Date(currentDate.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 0.95,
        type: 'DIVIDEND' as const,
        status: 'PAID' as const,
      },
      {
        symbol: 'BOVA11',
        exDate: new Date(currentDate.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        paymentDate: new Date(currentDate.getTime() - 55 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        amount: 0.45,
        type: 'DIVIDEND' as const,
        status: 'PAID' as const,
      },
    ];

    // Filtrar por data se fornecido
    let filteredDividends = mockDividends;
    if (fromDate) {
      filteredDividends = filteredDividends.filter(div => div.exDate >= fromDate);
    }
    if (toDate) {
      filteredDividends = filteredDividends.filter(div => div.exDate <= toDate);
    }

    return new Response(
      JSON.stringify({ dividends: filteredDividends }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Erro na função b3-dividends:', error);
    return new Response(
      JSON.stringify({ error: "An error occurred processing your request" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});