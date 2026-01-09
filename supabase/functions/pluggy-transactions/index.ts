import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const PLUGGY_API_URL = 'https://api.pluggy.ai';
const PLUGGY_CLIENT_ID = Deno.env.get('PLUGGY_CLIENT_ID') ?? '';
const PLUGGY_CLIENT_SECRET = Deno.env.get('PLUGGY_CLIENT_SECRET') ?? '';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { accountId, itemId } = await req.json();
    if (!accountId) {
      throw new Error('O `accountId` é obrigatório.');
    }
    if (!itemId) {
      throw new Error('O `itemId` é obrigatório para verificação de propriedade.');
    }

    // Verify ownership of the itemId (accountId belongs to an item owned by user)
    const { data: item, error: itemError } = await supabase
      .from('pluggy_items')
      .select('user_id, item_id')
      .eq('item_id', itemId)
      .eq('user_id', user.id)
      .single();

    if (itemError || !item) {
      return new Response(JSON.stringify({ error: 'Forbidden - Item not found or not owned by user' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authResponse = await fetch(`${PLUGGY_API_URL}/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: PLUGGY_CLIENT_ID,
        clientSecret: PLUGGY_CLIENT_SECRET,
      }),
    });

    if (!authResponse.ok) throw new Error(`Erro de autenticação: ${await authResponse.text()}`);
    const { apiKey } = await authResponse.json();

    const transactionsResponse = await fetch(`${PLUGGY_API_URL}/transactions?accountId=${accountId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
    });

    if (!transactionsResponse.ok) throw new Error(`Erro ao buscar transações: ${await transactionsResponse.text()}`);
    const { results } = await transactionsResponse.json();

    return new Response(
      JSON.stringify({ transactions: results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in pluggy-transactions:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
