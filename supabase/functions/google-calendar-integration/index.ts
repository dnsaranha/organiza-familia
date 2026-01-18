import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { session }, error: sessionError } = await supabaseAdmin.auth.getSession();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Não foi possível obter a sessão do usuário' }), { status: 401, headers: corsHeaders });
    }

    const providerToken = session.provider_token;
    if (!providerToken) {
      return new Response(JSON.stringify({ error: 'Token do provedor Google não encontrado.' }), { status: 403, headers: corsHeaders });
    }

    const task = await req.json();
    if (!task || !task.title || !task.date || !task.id) {
      return new Response(JSON.stringify({ error: 'Dados da tarefa inválidos.' }), { status: 400, headers: corsHeaders });
    }

    const event = {
      'summary': task.title,
      'description': task.description || `Criado pelo App Organiza a partir da tarefa ID: ${task.id}`,
      'start': {
        'dateTime': new Date(task.date).toISOString(),
        'timeZone': 'America/Sao_Paulo',
      },
      'end': {
        'dateTime': new Date(new Date(task.date).getTime() + 60 * 60 * 1000).toISOString(),
        'timeZone': 'America/Sao_Paulo',
      },
    };

    const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json();
      const status = response.status;
      // Se o erro for de permissão, retorne um status que o frontend possa identificar
      if (status === 403) {
          return new Response(JSON.stringify({ error: 'Permissão do Google Calendar negada.', details: errorData }), { status: 403, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: 'Falha ao criar evento no Google Calendar', details: errorData }), { status, headers: corsHeaders });
    }

    const calendarEvent = await response.json();

    const { error: updateError } = await supabaseAdmin
      .from('scheduled_tasks')
      .update({ google_calendar_event_id: calendarEvent.id })
      .eq('id', task.id);

    if (updateError) {
      console.error('Falha ao salvar o ID do evento do Google:', updateError);
    }

    return new Response(JSON.stringify(calendarEvent), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
