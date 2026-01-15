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
    console.log('[stripe-sync-subscription] Request received');

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[stripe-sync-subscription] No authorization header');
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
      console.error('[stripe-sync-subscription] Auth error:', authError);
      return corsResponse({ error: 'Unauthorized' }, 401);
    }

    const userEmail = user.email;
    if (!userEmail) {
      return corsResponse({ error: 'User email not found' }, 400);
    }

    console.log(`[stripe-sync-subscription] Syncing for user ${user.id}, email: ${userEmail}`);

    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Search for ALL customers with this email in Stripe
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 10,
    });

    console.log(`[stripe-sync-subscription] Found ${customers.data.length} customers in Stripe for email ${userEmail}`);

    let activeSubscription: Stripe.Subscription | null = null;
    let activeCustomerId: string | null = null;

    // Find the customer with an active subscription
    for (const customer of customers.data) {
      if ('deleted' in customer && customer.deleted) continue;

      console.log(`[stripe-sync-subscription] Checking customer ${customer.id}`);
      
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'all',
        limit: 5,
      });

      for (const sub of subscriptions.data) {
        console.log(`[stripe-sync-subscription] Found subscription ${sub.id} with status ${sub.status}`);
        
        // Prioritize active or trialing subscriptions
        if (sub.status === 'active' || sub.status === 'trialing') {
          activeSubscription = sub;
          activeCustomerId = customer.id;
          break;
        }
        
        // If no active found yet, keep track of most recent
        if (!activeSubscription && (sub.status === 'past_due' || sub.status === 'incomplete')) {
          activeSubscription = sub;
          activeCustomerId = customer.id;
        }
      }

      if (activeSubscription && (activeSubscription.status === 'active' || activeSubscription.status === 'trialing')) {
        break; // Found the best subscription, stop searching
      }
    }

    if (!activeSubscription || !activeCustomerId) {
      console.log('[stripe-sync-subscription] No active subscription found');
      return corsResponse({ 
        success: false, 
        message: 'No active subscription found for this email',
        customersFound: customers.data.length
      });
    }

    console.log(`[stripe-sync-subscription] Found active subscription ${activeSubscription.id} for customer ${activeCustomerId}`);

    // Update or insert the customer record
    const { data: existingCustomer } = await supabaseAdmin
      .from('stripe_customers')
      .select('id, customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingCustomer) {
      if (existingCustomer.customer_id !== activeCustomerId) {
        console.log(`[stripe-sync-subscription] Updating customer_id from ${existingCustomer.customer_id} to ${activeCustomerId}`);
        await supabaseAdmin
          .from('stripe_customers')
          .update({ 
            customer_id: activeCustomerId, 
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', user.id);
      }
    } else {
      console.log(`[stripe-sync-subscription] Creating new customer record`);
      await supabaseAdmin
        .from('stripe_customers')
        .insert({
          user_id: user.id,
          customer_id: activeCustomerId,
        });
    }

    // Get payment method details
    let paymentMethodBrand: string | null = null;
    let paymentMethodLast4: string | null = null;
    
    if (activeSubscription.default_payment_method) {
      try {
        const pm = await stripe.paymentMethods.retrieve(
          activeSubscription.default_payment_method as string
        );
        paymentMethodBrand = pm.card?.brand ?? null;
        paymentMethodLast4 = pm.card?.last4 ?? null;
      } catch (e) {
        console.warn('[stripe-sync-subscription] Could not fetch payment method:', e);
      }
    }

    // Update or insert the subscription record
    const subscriptionData = {
      customer_id: activeCustomerId,
      subscription_id: activeSubscription.id,
      price_id: activeSubscription.items.data[0]?.price.id ?? null,
      status: activeSubscription.status,
      current_period_start: activeSubscription.current_period_start,
      current_period_end: activeSubscription.current_period_end,
      cancel_at_period_end: activeSubscription.cancel_at_period_end,
      payment_method_brand: paymentMethodBrand,
      payment_method_last4: paymentMethodLast4,
    };

    console.log('[stripe-sync-subscription] Upserting subscription:', subscriptionData);

    const { error: subError } = await supabaseAdmin
      .from('stripe_subscriptions')
      .upsert(subscriptionData, { onConflict: 'customer_id' });

    if (subError) {
      console.error('[stripe-sync-subscription] Error upserting subscription:', subError);
      return corsResponse({ error: 'Failed to save subscription' }, 500);
    }

    console.log('[stripe-sync-subscription] Subscription synced successfully');

    return corsResponse({
      success: true,
      message: 'Subscription synced successfully',
      subscription: {
        id: activeSubscription.id,
        status: activeSubscription.status,
        customerId: activeCustomerId,
      }
    });
  } catch (error: any) {
    console.error('[stripe-sync-subscription] Error:', error);
    return corsResponse({ error: error.message }, 500);
  }
});
