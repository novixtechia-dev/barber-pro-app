import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ONESIGNAL_APP_ID = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

export async function GET(request: Request) {
  // 1. Verificação de Segurança (Vercel Cron)
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // 2. Calcular o intervalo de tempo: 20 minutos a partir de agora
    const now = new Date();
    // Definimos uma janela segura (ex: entre 19 e 21 minutos no futuro) para evitar que atrase e pule
    const targetMin = new Date(now.getTime() + 19 * 60000);
    const targetMax = new Date(now.getTime() + 21 * 60000);

    const todayStr = now.toLocaleDateString('en-CA');
    
    // Converter targetMin e targetMax para strings de tempo (HH:MM:SS) no timezone local
    const minTimeStr = targetMin.toTimeString().split(' ')[0];
    const maxTimeStr = targetMax.toTimeString().split(' ')[0];

    // 3. Buscar Agendamentos Pendentes
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id, scheduled_date, scheduled_time, 
        client:profiles!client_id(id, full_name), 
        barber:barbers!barber_id(id, display_name, user_id),
        service:services!service_id(name)
      `)
      .eq('scheduled_date', todayStr)
      .gte('scheduled_time', minTimeStr)
      .lte('scheduled_time', maxTimeStr)
      .eq('status', 'confirmed')
      .neq('reminder_sent', true);

    if (bookingsError || !bookings || bookings.length === 0) {
      return NextResponse.json({ message: 'Nenhum lembrete pendente', count: 0 });
    }

    // 4. Buscar Templates
    const { data: templates } = await supabase
      .from('notification_templates')
      .select('*')
      .in('event_type', ['REMINDER_20_MIN_CLIENT', 'REMINDER_20_MIN_BARBER']);

    const clientTemplate = templates?.find(t => t.event_type === 'REMINDER_20_MIN_CLIENT');
    const barberTemplate = templates?.find(t => t.event_type === 'REMINDER_20_MIN_BARBER');

    let sentCount = 0;

    // 5. Processar cada agendamento
    for (const rawB of bookings) {
      const b: any = rawB;
      const vars = {
        '{cliente}': b.client?.full_name?.split(' ')[0] || 'Cliente',
        '{barbeiro}': b.barber?.display_name || 'Barbeiro',
        '{servico}': b.service?.name || 'Serviço',
        '{hora}': b.scheduled_time.substring(0, 5)
      };

      const replaceVars = (text: string) => {
        let res = text;
        Object.entries(vars).forEach(([key, val]) => {
          res = res.replace(new RegExp(key, 'g'), val);
        });
        return res;
      };

      // Notificar Cliente
      if (clientTemplate && b.client?.id) {
        const title = replaceVars(clientTemplate.title);
        const msg = replaceVars(clientTemplate.message);
        await sendOneSignalPush(b.client.id, title, msg);
        await logNotification(supabase, null, b.client.id, title, msg, 'push', 'delivered');
      }

      // Notificar Barbeiro
      if (barberTemplate && b.barber?.user_id) {
        const title = replaceVars(barberTemplate.title);
        const msg = replaceVars(barberTemplate.message);
        await sendOneSignalPush(b.barber.user_id, title, msg);
        await logNotification(supabase, null, b.barber.user_id, title, msg, 'push', 'delivered');
      }

      // Atualizar status
      await supabase.from('bookings').update({ reminder_sent: true }).eq('id', b.id);
      sentCount++;
    }

    return NextResponse.json({ message: 'Lembretes enviados', count: sentCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ── Helpers ─────────────────────────────────────────────────────────

async function sendOneSignalPush(externalId: string, title: string, message: string) {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) return;
  
  try {
    await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_aliases: { external_id: [externalId] },
        target_channel: 'push',
        headings: { en: title, pt: title },
        contents: { en: message, pt: message }
      })
    });
  } catch (e) {
    console.error('OneSignal Push Error', e);
  }
}

async function logNotification(supabase: any, senderId: string | null, recipientId: string, title: string, message: string, type: string, status: string) {
  await supabase.from('notification_logs').insert({
    sender_id: senderId,
    recipient_id: recipientId,
    title,
    message,
    type,
    status
  });
}
