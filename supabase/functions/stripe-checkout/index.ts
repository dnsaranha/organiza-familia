import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function corsResponse(body: string | object | null, status = 200) {
  if (status === 204) {
    return new Response(null, { status, headers: corsHeaders });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  // Log request start
  console.log('[stripe-checkout] Request received', { method: req.method, url: req.url });

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecret) {
    console.error('[stripe-checkout] ERROR: STRIPE_SECRET_KEY not configured');
    return corsResponse({ error: 'Stripe not configured (missing secret key)' }, 500);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[stripe-checkout] ERROR: Supabase environment variables not configured');
    return corsResponse({ error: 'Server configuration error (missing Supabase vars)' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const stripe = new Stripe(stripeSecret, {
    appInfo: {
      name: 'Family Budget App',
      version: '1.0.0',
    },
    httpClient: Stripe.createFetchHttpClient(), // Ensure fetch client is used for Edge Runtime compatibility
  });

  try {
    if (req.method !== 'POST') {
      console.warn('[stripe-checkout] Method not allowed:', req.method);
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Read and parse body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[stripe-checkout] Failed to parse JSON body', e);
      return corsResponse({ error: 'Invalid JSON body' }, 400);
    }

    const { price_id, success_url, cancel_url, mode } = body;

    console.log('[stripe-checkout] Processing checkout for:', { price_id, mode });

    if (!price_id || !success_url || !cancel_url || !mode) {
      console.error('[stripe-checkout] Missing required parameters', { price_id, success_url, cancel_url, mode });
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    if (!['payment', 'subscription'].includes(mode)) {
      console.error('[stripe-checkout] Invalid mode:', mode);
      return corsResponse({ error: 'Invalid mode. Must be payment or subscription' }, 400);
    }

    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        console.error('[stripe-checkout] Missing Authorization header');
        return corsResponse({ error: 'Missing Authorization header' }, 401);
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      console.error('[stripe-checkout] Auth error:', getUserError);
      return corsResponse({ error: 'Failed to authenticate user: ' + getUserError.message }, 401);
    }

    if (!user) {
      console.error('[stripe-checkout] User not found via getUser');
      return corsResponse({ error: 'User not found' }, 404);
    }

    console.log('[stripe-checkout] User authenticated:', user.id);

    // Check if customer already exists in DB
    console.log('[stripe-checkout] Checking for existing customer in DB...');
    const { data: existingCustomer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (getCustomerError) {
      console.error('[stripe-checkout] DB Error fetching customer:', getCustomerError);
      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    let customerId;

    // Helper function to create a new Stripe customer
    const createNewStripeCustomer = async () => {
      console.log('[stripe-checkout] Creating new Stripe customer...');
      const newCustomer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
        },
      });
      return newCustomer.id;
    };

    // Helper function to save customer to DB
    const saveCustomerToDb = async (custId: string) => {
      // First delete any existing record for this user
      await supabase
        .from('stripe_customers')
        .delete()
        .eq('user_id', user.id);
      
      // Insert new record
      const { error: insertError } = await supabase
        .from('stripe_customers')
        .insert({
          user_id: user.id,
          customer_id: custId,
        });

      if (insertError) {
        console.error('[stripe-checkout] Failed to save customer to DB:', insertError);
        throw new Error('Failed to create customer record');
      }
    };

    if (!existingCustomer || !existingCustomer.customer_id) {
      console.log('[stripe-checkout] No local customer found.');
      try {
        customerId = await createNewStripeCustomer();
        console.log(`[stripe-checkout] Created new Stripe customer ${customerId}`);
        await saveCustomerToDb(customerId);
      } catch (stripeCustError: any) {
        console.error('[stripe-checkout] Stripe customer creation failed:', stripeCustError);
        return corsResponse({ error: 'Stripe customer creation failed: ' + stripeCustError.message }, 500);
      }
    } else {
      customerId = existingCustomer.customer_id;
      console.log(`[stripe-checkout] Found existing customer ${customerId}`);
      
      // Verify the customer still exists in Stripe
      try {
        await stripe.customers.retrieve(customerId);
        console.log(`[stripe-checkout] Customer ${customerId} verified in Stripe`);
      } catch (retrieveError: any) {
        console.warn(`[stripe-checkout] Customer ${customerId} not found in Stripe, creating new one...`);
        try {
          customerId = await createNewStripeCustomer();
          console.log(`[stripe-checkout] Created replacement Stripe customer ${customerId}`);
          await saveCustomerToDb(customerId);
        } catch (createError: any) {
          console.error('[stripe-checkout] Failed to create replacement customer:', createError);
          return corsResponse({ error: 'Failed to create customer: ' + createError.message }, 500);
        }
      }
    }

    // Create Checkout Session
    console.log('[stripe-checkout] Creating Stripe session...');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode,
      success_url,
      cancel_url,
    });

    console.log(`[stripe-checkout] Session created successfully: ${session.id}`);

    return corsResponse({ sessionId: session.id, url: session.url });

  } catch (error: any) {
    console.error(`[stripe-checkout] FATAL ERROR:`, error);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Unknown error occurred';
    
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = `Stripe invalid request: ${error.message}`;
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Stripe authentication failed. Check API key.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to Stripe. Check network connection.';
    }
    
    return corsResponse({ error: errorMessage }, 500);
  }
});
