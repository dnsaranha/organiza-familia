import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CALENDAR_NAME = 'Organiza';

// Get or create the "Organiza" calendar
async function getOrCreateOrganizaCalendar(providerToken: string): Promise<string> {
  // First, list existing calendars to check if "Organiza" already exists
  const listResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: {
      'Authorization': `Bearer ${providerToken}`,
    },
  });

  if (!listResponse.ok) {
    const errorData = await listResponse.json();
    console.error('Error listing calendars:', errorData);
    throw new Error('Falha ao listar calendários');
  }

  const calendarList = await listResponse.json();
  
  // Check if "Organiza" calendar already exists
  const organizaCalendar = calendarList.items?.find(
    (cal: any) => cal.summary === CALENDAR_NAME
  );

  if (organizaCalendar) {
    console.log('Found existing Organiza calendar:', organizaCalendar.id);
    return organizaCalendar.id;
  }

  // Create new "Organiza" calendar
  console.log('Creating new Organiza calendar...');
  const createResponse = await fetch('https://www.googleapis.com/calendar/v3/calendars', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${providerToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: CALENDAR_NAME,
      description: 'Tarefas criadas pelo App Organiza',
      timeZone: 'America/Sao_Paulo',
    }),
  });

  if (!createResponse.ok) {
    const errorData = await createResponse.json();
    console.error('Error creating calendar:', errorData);
    throw new Error('Falha ao criar calendário Organiza');
  }

  const newCalendar = await createResponse.json();
  console.log('Created new Organiza calendar:', newCalendar.id);
  
  // Set calendar color to make it distinct (optional - green color)
  try {
    await fetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(newCalendar.id)}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        colorId: '10', // Green
      }),
    });
  } catch (e) {
    console.log('Could not set calendar color:', e);
  }

  return newCalendar.id;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

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

    const googleIdentity = user.identities?.find(id => id.provider === 'google');
    
    if (!googleIdentity) {
      return new Response(
        JSON.stringify({ error: 'Usuário não conectado com Google. Faça login com sua conta Google primeiro.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action = 'create' } = body;
    
    if (!body || !body.title || !body.date || !body.id) {
      return new Response(
        JSON.stringify({ error: 'Dados da tarefa inválidos. Necessário: id, title, date.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Get or create the "Organiza" calendar
    let calendarId: string;
    try {
      calendarId = await getOrCreateOrganizaCalendar(providerToken);
    } catch (error) {
      console.error('Error getting/creating calendar:', error);
      return new Response(
        JSON.stringify({ error: 'Falha ao acessar calendário Organiza', needsReauth: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const event = {
      summary: body.title,
      description: body.description || `Criado pelo App Organiza - ID: ${body.id}`,
      start: {
        dateTime: new Date(body.date).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
      end: {
        dateTime: new Date(new Date(body.date).getTime() + 60 * 60 * 1000).toISOString(),
        timeZone: 'America/Sao_Paulo',
      },
    };

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Handle UPDATE action
    if (action === 'update' && body.google_calendar_event_id) {
      console.log('Updating Google Calendar event:', body.google_calendar_event_id);
      
      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${body.google_calendar_event_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${providerToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error('Google Calendar update error:', errorData);
        
        // If event not found, try to create a new one
        if (updateResponse.status === 404) {
          console.log('Event not found, creating new one...');
          // Fall through to create logic below
        } else {
          return new Response(
            JSON.stringify({ error: 'Falha ao atualizar evento no Google Calendar', details: errorData }),
            { status: updateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        const updatedEvent = await updateResponse.json();
        console.log('Calendar event updated:', updatedEvent.id);
        
        return new Response(
          JSON.stringify({ ...updatedEvent, action: 'updated' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Handle DELETE action
    if (action === 'delete' && body.google_calendar_event_id) {
      console.log('Deleting Google Calendar event:', body.google_calendar_event_id);
      
      const deleteResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${body.google_calendar_event_id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${providerToken}`,
          },
        }
      );

      if (!deleteResponse.ok && deleteResponse.status !== 404) {
        const errorData = await deleteResponse.json();
        console.error('Google Calendar delete error:', errorData);
        return new Response(
          JSON.stringify({ error: 'Falha ao excluir evento no Google Calendar', details: errorData }),
          { status: deleteResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clear the google_calendar_event_id from the task
      await supabaseAdmin
        .from('scheduled_tasks')
        .update({ google_calendar_event_id: null })
        .eq('id', body.id);

      return new Response(
        JSON.stringify({ success: true, action: 'deleted' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // CREATE new event
    console.log('Creating Google Calendar event:', event);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${providerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

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
    const { error: updateError } = await supabaseAdmin
      .from('scheduled_tasks')
      .update({ google_calendar_event_id: calendarEvent.id })
      .eq('id', body.id);

    if (updateError) {
      console.error('Failed to save Google event ID:', updateError);
    }

    return new Response(
      JSON.stringify({ ...calendarEvent, action: 'created' }),
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
