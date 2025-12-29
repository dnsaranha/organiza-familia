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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeSecret) {
    console.error('STRIPE_SECRET_KEY not configured');
    return corsResponse({ error: 'Stripe not configured' }, 500);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase environment variables not configured');
    return corsResponse({ error: 'Server configuration error' }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const stripe = new Stripe(stripeSecret, {
    appInfo: {
      name: 'Family Budget App',
      version: '1.0.0',
    },
  });

  try {
    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    const { price_id, success_url, cancel_url, mode } = await req.json();

    console.log('Received checkout request:', { price_id, success_url, cancel_url, mode });

    if (!price_id || !success_url || !cancel_url || !mode) {
      return corsResponse({ error: 'Missing required parameters' }, 400);
    }

    if (!['payment', 'subscription'].includes(mode)) {
      return corsResponse({ error: 'Invalid mode. Must be payment or subscription' }, 400);
    }

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      console.error('Auth error:', getUserError);
      return corsResponse({ error: 'Failed to authenticate user' }, 401);
    }

    if (!user) {
      return corsResponse({ error: 'User not found' }, 404);
    }

    console.log('User authenticated:', user.id);

    // Check if customer already exists
    const { data: existingCustomer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to fetch customer information from the database', getCustomerError);
      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    let customerId;

    if (!existingCustomer || !existingCustomer.customer_id) {
      console.log('Creating new Stripe customer');
      const newCustomer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
        },
      });

      customerId = newCustomer.id;
      console.log(`Created new Stripe customer ${customerId} for user ${user.id}`);

      const { error: createCustomerError } = await supabase
        .from('stripe_customers')
        .insert({
          user_id: user.id,
          customer_id: customerId,
        });

      if (createCustomerError) {
        console.error('Failed to save new customer in the database', createCustomerError);
        // Attempt to clean up Stripe customer if DB insert fails
        try {
          await stripe.customers.del(newCustomer.id);
        } catch (deleteError) {
          console.error('Failed to clean up Stripe customer after DB error:', deleteError);
        }
        return corsResponse({ error: 'Failed to create customer' }, 500);
      }
      console.log(`Successfully created customer record for new customer ${customerId}`);
    } else {
      customerId = existingCustomer.customer_id;
      console.log(`Found existing Stripe customer ${customerId} for user ${user.id}`);
    }

    // create Checkout Session
    console.log('Creating checkout session with:', { customerId, price_id, mode, success_url, cancel_url });
    
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

    console.log(`Created checkout session ${session.id} for customer ${customerId}`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`Checkout error: ${error.message}`, error);
    
    // Provide more specific error messages
    let errorMessage = error.message || 'Unknown error occurred';
    
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = `Stripe error: ${error.message}`;
    } else if (error.type === 'StripeAuthenticationError') {
      errorMessage = 'Stripe authentication failed. Check API key.';
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      errorMessage = 'Unable to connect to Stripe. Check network connection.';
    }
    
    return corsResponse({ error: errorMessage }, 500);
  }
});