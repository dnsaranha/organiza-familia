import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Family Budget App',
    version: '1.0.0',
  },
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

function corsResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[stripe-customer-portal] Request received');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[stripe-customer-portal] No authorization header');
      return corsResponse({ error: 'No authorization header' }, 401);
    }

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get the user from Supabase auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[stripe-customer-portal] Auth error:', authError);
      return corsResponse({ error: 'Unauthorized' }, 401);
    }

    console.log(`[stripe-customer-portal] User authenticated: ${user.id}`);

    // Get return URL from request body
    const { return_url } = await req.json().catch(() => ({}));
    const finalReturnUrl = return_url || `${req.headers.get('origin')}/profile`;

    // Create admin client to fetch customer
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get customer ID from database
    const { data: customerData, error: customerError } = await supabaseAdmin
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (customerError) {
      console.error('[stripe-customer-portal] Error fetching customer:', customerError);
      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    if (!customerData || !customerData.customer_id) {
      console.error('[stripe-customer-portal] No customer found for user');
      return corsResponse({ error: 'No subscription found. Please subscribe first.' }, 404);
    }

    console.log(`[stripe-customer-portal] Creating portal session for customer: ${customerData.customer_id}`);

    // Verify customer exists in Stripe
    try {
      const customer = await stripe.customers.retrieve(customerData.customer_id);
      if ('deleted' in customer && customer.deleted) {
        return corsResponse({ error: 'Customer not found. Please contact support.' }, 404);
      }
    } catch (err: any) {
      console.error('[stripe-customer-portal] Customer not found in Stripe:', err.message);
      return corsResponse({ error: 'Customer not found. Please contact support.' }, 404);
    }

    // Create Stripe Customer Portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerData.customer_id,
      return_url: finalReturnUrl,
    });

    console.log(`[stripe-customer-portal] Portal session created: ${portalSession.id}`);

    return corsResponse({ url: portalSession.url });
  } catch (error: any) {
    console.error('[stripe-customer-portal] Error:', error);
    return corsResponse({ error: error.message }, 500);
  }
});
