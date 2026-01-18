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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get the authorization header from the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get their session
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    // Get user from the token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      console.error('User error:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get provider token from user's identities
    const googleIdentity = user.identities?.find(id => id.provider === 'google');
    
    if (!googleIdentity) {
      return new Response(
        JSON.stringify({ error: 'Usuário não conectado com Google. Faça login com sua conta Google primeiro.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // We need the provider_token which is stored in the session, not in identities
    // The provider_token is only available during the OAuth flow and needs to be passed from the client
    // Let's check if it's in the request body
    const body = await req.json();
    
    if (!body || !body.title || !body.date || !body.id) {
      return new Response(
        JSON.stringify({ error: 'Dados da tarefa inválidos. Necessário: id, title, date.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to get the provider token from the session
    // The client needs to pass the access token or we need to get it from the session
    const providerToken = body.provider_token;
    
    if (!providerToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Token do Google Calendar não encontrado. Por favor, reconecte sua conta Google com permissão de calendário.',
          needsReauth: true 
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = {
      summary: body.title,
      description: body.description || `Criado pelo App Organiza a partir da tarefa ID: ${body.id}`,
      start: {
        dateTime: new Date(body.date).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(new Date(body.date).getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
    };

    console.log('Creating Google Calendar event:', event);

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
      console.error('Google Calendar API error:', errorData);
      const status = response.status;
      
      if (status === 401 || status === 403) {
        return new Response(
          JSON.stringify({ 
            error: 'Permissão do Google Calendar negada ou token expirado. Reconecte sua conta.',
            details: errorData,
            needsReauth: true
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ error: 'Falha ao criar evento no Google Calendar', details: errorData }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendarEvent = await response.json();
    console.log('Calendar event created:', calendarEvent.id);

    // Update the task with the Google Calendar event ID
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { error: updateError } = await supabaseAdmin
      .from('scheduled_tasks')
      .update({ google_calendar_event_id: calendarEvent.id })
      .eq('id', body.id);

    if (updateError) {
      console.error('Failed to save Google event ID:', updateError);
    }

    return new Response(
      JSON.stringify(calendarEvent),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Error in google-calendar-integration:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
