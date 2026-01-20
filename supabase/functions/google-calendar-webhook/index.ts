import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-goog-channel-id, x-goog-channel-token, x-goog-resource-id, x-goog-resource-state, x-goog-message-number',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Google sends these headers with webhook notifications
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceId = req.headers.get('x-goog-resource-id');
    const resourceState = req.headers.get('x-goog-resource-state');
    const messageNumber = req.headers.get('x-goog-message-number');

    console.log('Received Google Calendar webhook:', {
      channelId,
      resourceId,
      resourceState,
      messageNumber,
    });

    // Verify this is a valid channel we created
    if (!channelId || !resourceId) {
      console.error('Missing channel or resource ID');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Handle sync state - Google sends this when first setting up the channel
    if (resourceState === 'sync') {
      console.log('Received sync notification, channel is ready');
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    // Find the user associated with this channel
    const { data: syncData, error: syncError } = await supabaseAdmin
      .from('google_calendar_sync')
      .select('user_id, calendar_id, sync_token')
      .eq('channel_id', channelId)
      .eq('resource_id', resourceId)
      .single();

    if (syncError || !syncData) {
      console.error('Could not find sync data for channel:', channelId, syncError);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    console.log('Found sync data for user:', syncData.user_id);

    // We can't perform the actual sync here because we don't have the user's
    // provider_token (OAuth token). Instead, we'll mark that a sync is needed.
    // The frontend will need to poll for changes or the user will sync manually.

    // Update the sync record to indicate pending changes
    await supabaseAdmin
      .from('google_calendar_sync')
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', syncData.user_id)
      .eq('calendar_id', syncData.calendar_id);

    // For now, we log that changes are pending
    // In a production system, you might:
    // 1. Store the user's refresh_token and use it to get a new access_token
    // 2. Send a push notification to the user's device to trigger sync
    // 3. Use a background job to sync later

    console.log('Marked sync as pending for user:', syncData.user_id);

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (err: any) {
    console.error('Error in google-calendar-webhook:', err);
    // Always return 200 to Google, otherwise they'll stop sending notifications
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});
