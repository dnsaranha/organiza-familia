import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  userId: string;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, title, body, icon, badge, tag, requireInteraction = false, actions }: PushNotificationRequest = await req.json();

    console.log("Processing push notification for user:", userId);

    // Configure VAPID
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = "mailto:admin@organiza.app";

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error("VAPID keys not configured");
    }

    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's push subscriptions
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', userId);

    if (error) {
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("No push subscriptions found for user:", userId);
      return new Response(JSON.stringify({ 
        success: false, 
        message: "No push subscriptions found" 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Notification payload
    const notificationPayload = {
      title,
      body,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-96x96.png',
      tag: tag || 'organiza-notification',
      requireInteraction,
      actions: actions || [
        {
          action: 'open',
          title: 'Abrir App',
          icon: '/icons/icon-48x48.png'
        },
        {
          action: 'dismiss',
          title: 'Dispensar',
          icon: '/icons/icon-48x48.png'
        }
      ],
      data: {
        url: '/',
        timestamp: Date.now()
      }
    };

    // Send notifications to all user subscriptions
    const promises = subscriptions.map(async (sub) => {
      try {
        const subscription = JSON.parse(sub.subscription);
        await webpush.sendNotification(subscription, JSON.stringify(notificationPayload));
        console.log("Push notification sent successfully");
        return { success: true };
      } catch (pushError) {
        console.error("Error sending push notification:", pushError);
        return { success: false, error: pushError.message };
      }
    });

    const results = await Promise.all(promises);
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`Push notifications sent: ${successCount} success, ${failureCount} failures`);

    return new Response(JSON.stringify({ 
      success: true,
      sent: successCount,
      failed: failureCount,
      total: results.length
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-push-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);