import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CALENDAR_NAME = 'Organiza';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Get or create the "Organiza" calendar
async function getOrCreateOrganizaCalendar(providerToken: string): Promise<string> {
  const listResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
    headers: { 'Authorization': `Bearer ${providerToken}` },
  });

  if (!listResponse.ok) {
    const errorData = await listResponse.json();
    console.error('Error listing calendars:', errorData);
    throw new Error('Falha ao listar calendários');
  }

  const calendarList = await listResponse.json();
  const organizaCalendar = calendarList.items?.find((cal: any) => cal.summary === CALENDAR_NAME);

  if (organizaCalendar) {
    console.log('Found existing Organiza calendar:', organizaCalendar.id);
    return organizaCalendar.id;
  }

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

  // Set calendar color (green)
  try {
    await fetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList/${encodeURIComponent(newCalendar.id)}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ colorId: '10' }),
    });
  } catch (e) {
    console.log('Could not set calendar color:', e);
  }

  return newCalendar.id;
}

// Build event object with extendedProperties for Organiza metadata
function buildGoogleEvent(task: any, calendarId: string) {
  const startDate = new Date(task.date || task.schedule_date);
  const endDate = task.end_date ? new Date(task.end_date) : new Date(startDate.getTime() + 60 * 60 * 1000);

  return {
    summary: task.title,
    description: task.description || '',
    start: {
      dateTime: startDate.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: 'America/Sao_Paulo',
    },
    extendedProperties: {
      private: {
        organizaId: task.id,
        categoria: task.category || '',
        valor: task.value?.toString() || '0',
        tipo: 'tarefa',
        taskType: task.task_type || 'custom',
      },
    },
  };
}

// Create event in Google Calendar
async function createEvent(providerToken: string, calendarId: string, task: any, supabaseAdmin: any): Promise<any> {
  const event = buildGoogleEvent(task, calendarId);
  console.log('Creating Google Calendar event:', event.summary);

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
    
    if (response.status === 401 || response.status === 403) {
      return { error: 'Permissão negada ou token expirado', needsReauth: true, status: 403 };
    }
    return { error: 'Falha ao criar evento', details: errorData, status: response.status };
  }

  const calendarEvent = await response.json();
  console.log('Calendar event created:', calendarEvent.id);

  // Update task with Google Calendar event ID and calendar_id
  await supabaseAdmin
    .from('scheduled_tasks')
    .update({ 
      google_calendar_event_id: calendarEvent.id,
      calendar_id: calendarId,
      last_modified_source: 'organiza',
    })
    .eq('id', task.id);

  return { ...calendarEvent, action: 'created' };
}

// Update event in Google Calendar
async function updateEvent(providerToken: string, calendarId: string, eventId: string, task: any): Promise<any> {
  const event = buildGoogleEvent(task, calendarId);
  console.log('Updating Google Calendar event:', eventId);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Google Calendar update error:', errorData);
    
    if (response.status === 404) {
      return { notFound: true };
    }
    return { error: 'Falha ao atualizar evento', details: errorData, status: response.status };
  }

  const updatedEvent = await response.json();
  console.log('Calendar event updated:', updatedEvent.id);
  return { ...updatedEvent, action: 'updated' };
}

// Delete event from Google Calendar
async function deleteEvent(providerToken: string, calendarId: string, eventId: string, taskId: string, supabaseAdmin: any): Promise<any> {
  console.log('Deleting Google Calendar event:', eventId);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${providerToken}` },
    }
  );

  if (!response.ok && response.status !== 404 && response.status !== 410) {
    const errorData = await response.json();
    console.error('Google Calendar delete error:', errorData);
    return { error: 'Falha ao excluir evento', details: errorData, status: response.status };
  }

  // Clear Google Calendar event ID from task
  await supabaseAdmin
    .from('scheduled_tasks')
    .update({ google_calendar_event_id: null, calendar_id: null })
    .eq('id', taskId);

  return { success: true, action: 'deleted' };
}

// Sync from Organiza to Google Calendar (for batch sync)
async function syncToGoogle(providerToken: string, calendarId: string, userId: string, supabaseAdmin: any): Promise<any> {
  console.log('Syncing all tasks to Google Calendar for user:', userId);

  // Get all active tasks without Google Calendar event ID
  const { data: tasks, error } = await supabaseAdmin
    .from('scheduled_tasks')
    .select('*')
    .eq('user_id', userId)
    .is('google_calendar_event_id', null)
    .neq('status', 'cancelado');

  if (error) {
    console.error('Error fetching tasks:', error);
    return { error: 'Falha ao buscar tarefas', status: 500 };
  }

  const results = { created: 0, failed: 0, errors: [] as string[] };

  for (const task of tasks || []) {
    try {
      const result = await createEvent(providerToken, calendarId, task, supabaseAdmin);
      if (result.error) {
        results.failed++;
        results.errors.push(`${task.title}: ${result.error}`);
      } else {
        results.created++;
      }
    } catch (e: any) {
      results.failed++;
      results.errors.push(`${task.title}: ${e.message}`);
    }
  }

  return { success: true, action: 'batch_sync', ...results };
}

// Setup webhook for incremental sync (Google → Organiza)
async function setupWebhook(providerToken: string, calendarId: string, userId: string, supabaseAdmin: any): Promise<any> {
  const webhookUrl = `${SUPABASE_URL}/functions/v1/google-calendar-webhook`;
  const channelId = `organiza-${userId}-${Date.now()}`;
  
  console.log('Setting up webhook for calendar:', calendarId);

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/watch`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${providerToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        params: { ttl: '604800' }, // 7 days
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Webhook setup error:', errorData);
    return { error: 'Falha ao configurar webhook', details: errorData, status: response.status };
  }

  const channel = await response.json();
  console.log('Webhook channel created:', channel);

  // Save channel info for later
  await supabaseAdmin
    .from('google_calendar_sync')
    .upsert({
      user_id: userId,
      calendar_id: calendarId,
      channel_id: channel.id,
      resource_id: channel.resourceId,
      channel_expiration: new Date(parseInt(channel.expiration)).toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,calendar_id' });

  return { success: true, action: 'webhook_setup', channel };
}

// Perform incremental sync using syncToken
async function incrementalSync(providerToken: string, calendarId: string, userId: string, supabaseAdmin: any): Promise<any> {
  console.log('Performing incremental sync for calendar:', calendarId);

  // Get saved sync token
  const { data: syncData } = await supabaseAdmin
    .from('google_calendar_sync')
    .select('sync_token')
    .eq('user_id', userId)
    .eq('calendar_id', calendarId)
    .single();

  let url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?privateExtendedProperty=tipo%3Dtarefa`;
  
  if (syncData?.sync_token) {
    url += `&syncToken=${syncData.sync_token}`;
  } else {
    // First sync - get events from last 30 days
    const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    url += `&timeMin=${timeMin}`;
  }

  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${providerToken}` },
  });

  if (!response.ok) {
    if (response.status === 410) {
      // Sync token expired, need full sync
      console.log('Sync token expired, performing full sync');
      await supabaseAdmin
        .from('google_calendar_sync')
        .update({ sync_token: null })
        .eq('user_id', userId)
        .eq('calendar_id', calendarId);
      return incrementalSync(providerToken, calendarId, userId, supabaseAdmin);
    }
    const errorData = await response.json();
    console.error('Incremental sync error:', errorData);
    return { error: 'Falha na sincronização incremental', details: errorData };
  }

  const data = await response.json();
  const results = { updated: 0, deleted: 0, skipped: 0 };

  for (const event of data.items || []) {
    const organizaId = event.extendedProperties?.private?.organizaId;
    
    if (!organizaId) {
      results.skipped++;
      continue;
    }

    if (event.status === 'cancelled') {
      // Event was deleted in Google, update status in Organiza
      await supabaseAdmin
        .from('scheduled_tasks')
        .update({ 
          status: 'cancelado',
          last_modified_source: 'google',
          updated_at: new Date().toISOString(),
        })
        .eq('id', organizaId)
        .eq('user_id', userId);
      results.deleted++;
    } else {
      // Event was updated in Google - update dates in Organiza
      // (Google wins for dates, Organiza wins for metadata)
      const updateData: any = {
        last_modified_source: 'google',
        updated_at: new Date().toISOString(),
      };

      if (event.start?.dateTime) {
        updateData.schedule_date = event.start.dateTime;
      }
      if (event.end?.dateTime) {
        updateData.end_date = event.end.dateTime;
      }

      await supabaseAdmin
        .from('scheduled_tasks')
        .update(updateData)
        .eq('id', organizaId)
        .eq('user_id', userId);
      results.updated++;
    }
  }

  // Save new sync token
  if (data.nextSyncToken) {
    await supabaseAdmin
      .from('google_calendar_sync')
      .upsert({
        user_id: userId,
        calendar_id: calendarId,
        sync_token: data.nextSyncToken,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,calendar_id' });
  }

  return { success: true, action: 'incremental_sync', ...results, nextSyncToken: !!data.nextSyncToken };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token de autorização não fornecido.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
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
        JSON.stringify({ error: 'Usuário não conectado com Google.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action = 'create', provider_token: providerToken } = body;

    if (!providerToken) {
      return new Response(
        JSON.stringify({ error: 'Token do Google Calendar não encontrado.', needsReauth: true }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

    let result: any;

    switch (action) {
      case 'create':
        if (!body.id || !body.title || !body.date) {
          return new Response(
            JSON.stringify({ error: 'Dados da tarefa inválidos. Necessário: id, title, date.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await createEvent(providerToken, calendarId, body, supabaseAdmin);
        break;

      case 'update':
        if (!body.google_calendar_event_id) {
          return new Response(
            JSON.stringify({ error: 'google_calendar_event_id é obrigatório para update.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await updateEvent(providerToken, calendarId, body.google_calendar_event_id, body);
        if (result.notFound) {
          // Event not found, create new one
          result = await createEvent(providerToken, calendarId, body, supabaseAdmin);
        }
        break;

      case 'delete':
        if (!body.google_calendar_event_id || !body.id) {
          return new Response(
            JSON.stringify({ error: 'google_calendar_event_id e id são obrigatórios para delete.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await deleteEvent(providerToken, calendarId, body.google_calendar_event_id, body.id, supabaseAdmin);
        break;

      case 'sync_to_google':
        result = await syncToGoogle(providerToken, calendarId, user.id, supabaseAdmin);
        break;

      case 'setup_webhook':
        result = await setupWebhook(providerToken, calendarId, user.id, supabaseAdmin);
        break;

      case 'incremental_sync':
        result = await incrementalSync(providerToken, calendarId, user.id, supabaseAdmin);
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Ação desconhecida: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (result.error) {
      return new Response(
        JSON.stringify(result),
        { status: result.status || 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ...result, calendarId }),
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
