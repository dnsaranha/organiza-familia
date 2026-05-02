import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  taskId: string;
  userEmail: string;
  title: string;
  description?: string;
  scheduleDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { taskId, userEmail, title, description, scheduleDate }: NotificationRequest = await req.json();

    console.log("Processing notification for task:", taskId, "to:", userEmail);

    const emailResponse = await resend.emails.send({
      from: "Organiza <onboarding@resend.dev>",
      to: [userEmail],
      subject: `⏰ Lembrete: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb; text-align: center;">💰 Organiza - Lembrete</h1>
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="color: #1e293b; margin: 0 0 10px 0;">${title}</h2>
            ${description ? `<p style="color: #64748b; margin: 10px 0;">${description}</p>` : ''}
            <p style="color: #475569; margin: 10px 0;">
              <strong>Data agendada:</strong> ${new Date(scheduleDate).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <p style="color: #64748b; font-size: 14px;">
              Este é um lembrete automático do seu aplicativo Organiza.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      emailId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
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