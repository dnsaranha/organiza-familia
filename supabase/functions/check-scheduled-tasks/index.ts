import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Checking scheduled tasks for push notifications");

    // Create Supabase client with service role key for database access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 1 * 60 * 1000);

    console.log(`Checking tasks between ${now.toISOString()} and ${oneMinuteFromNow.toISOString()}`);

    // Find tasks that are due in the next minute and haven't been notified yet
    const { data: upcomingTasks, error } = await supabase
      .from("scheduled_tasks")
      .select("*")
      .eq("is_completed", false)
      .eq("notification_push", true)
      .gte("schedule_date", now.toISOString())
      .lte("schedule_date", oneMinuteFromNow.toISOString())
      .is("notified_at", null); // Only tasks that haven't been notified

    if (error) {
      console.error("Error fetching scheduled tasks:", error);
      throw error;
    }

    console.log(`Found ${upcomingTasks?.length || 0} tasks to notify`);

    let notificationsSent = 0;
    let notificationsFailed = 0;

    if (upcomingTasks && upcomingTasks.length > 0) {
      // Process each task
      for (const task of upcomingTasks) {
        try {
          console.log(`Processing task: ${task.title} (${task.id})`);

          // Send push notification
          const { error: pushError } = await supabase.functions.invoke(
            'send-push-notification',
            {
              body: {
                userId: task.user_id,
                title: `⏰ ${task.title}`,
                body: task.description || "Tarefa agendada próxima do vencimento",
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-96x96.png',
                tag: `task-${task.id}`,
                requireInteraction: false,
              }
            }
          );

          if (pushError) {
            console.error(`Failed to send push notification for task ${task.id}:`, pushError);
            notificationsFailed++;
          } else {
            console.log(`Push notification sent for task ${task.id}`);
            notificationsSent++;
          }

          // Mark task as notified regardless of push notification success
          // This prevents spam if push fails but allows email to still work
          const { error: updateError } = await supabase
            .from("scheduled_tasks")
            .update({ notified_at: new Date().toISOString() })
            .eq("id", task.id);

          if (updateError) {
            console.error(`Failed to mark task ${task.id} as notified:`, updateError);
          }

          // Send email notification if enabled
          if (task.notification_email) {
            try {
              // Get user email
              const { data: userData, error: userError } = await supabase.auth.admin.getUserById(task.user_id);
              
              if (userError || !userData?.user?.email) {
                console.error(`Could not get user email for task ${task.id}:`, userError);
              } else {
                await supabase.functions.invoke("send-notification", {
                  body: {
                    taskId: task.id,
                    userEmail: userData.user.email,
                    title: task.title,
                    description: task.description,
                    scheduleDate: task.schedule_date,
                  },
                });
                console.log(`Email notification sent for task ${task.id}`);
              }
            } catch (emailError) {
              console.error(`Failed to send email for task ${task.id}:`, emailError);
            }
          }

        } catch (taskError) {
          console.error(`Error processing task ${task.id}:`, taskError);
          notificationsFailed++;
        }
      }
    }

    console.log(`Task check completed. Sent: ${notificationsSent}, Failed: ${notificationsFailed}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Checked ${upcomingTasks?.length || 0} tasks`,
      notificationsSent,
      notificationsFailed,
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in check-scheduled-tasks function:", error);
    return new Response(
      JSON.stringify({ 
        error: "An error occurred processing your request",
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