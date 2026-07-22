// supabase/functions/send-reminders/index.ts
// Deploy: supabase functions deploy send-reminders
// Agendar no Supabase Dashboard > Edge Functions > Cron

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')!;
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_REST_API_KEY')!;

async function sendPush(playerIds: string[], title: string, body: string, data: object) {
  await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${ONESIGNAL_API_KEY}`,
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { pt: title, en: title },
      contents: { pt: body, en: body },
      data,
    }),
  });
}

Deno.serve(async () => {
  const now = new Date();

  // Buscar agendamentos que precisam de lembrete
  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, scheduled_date, scheduled_time,
      reminder_24h_sent, reminder_2h_sent, reminder_30m_sent,
      client:profiles(onesignal_player_id),
      barber:barbers(display_name)
    `)
    .in('status', ['confirmed', 'pending'])
    .gte('scheduled_date', now.toISOString().split('T')[0]);

  let sent = 0;

  for (const booking of bookings || []) {
    const bookingDateTime = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
    const diffMs = bookingDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffMinutes = diffMs / (1000 * 60);
    const playerId = booking.client?.onesignal_player_id;
    if (!playerId) continue;

    // 24h reminder
    if (!booking.reminder_24h_sent && diffHours > 23 && diffHours <= 25) {
      await sendPush(
        [playerId],
        '⏰ Lembrete: amanhã é seu dia!',
        `Você tem um horário com ${booking.barber.display_name} amanhã às ${booking.scheduled_time.slice(0,5)}.`,
        { type: 'reminder_24h', booking_id: booking.id }
      );
      await supabase.from('bookings').update({ reminder_24h_sent: true }).eq('id', booking.id);
      sent++;
    }

    // 2h reminder
    if (!booking.reminder_2h_sent && diffHours > 1.75 && diffHours <= 2.25) {
      await sendPush(
        [playerId],
        '⏰ Seu horário é daqui 2 horas!',
        `Lembre-se do seu horário com ${booking.barber.display_name}.`,
        { type: 'reminder_2h', booking_id: booking.id }
      );
      await supabase.from('bookings').update({ reminder_2h_sent: true }).eq('id', booking.id);
      sent++;
    }

    // 30min reminder
    if (!booking.reminder_30m_sent && diffMinutes > 25 && diffMinutes <= 35) {
      await sendPush(
        [playerId],
        '🔔 30 minutos para seu horário!',
        `Seu horário com ${booking.barber.display_name} começa em breve.`,
        { type: 'reminder_30m', booking_id: booking.id }
      );
      await supabase.from('bookings').update({ reminder_30m_sent: true }).eq('id', booking.id);
      sent++;
    }
  }

  // Limpar stories expirados
  const { count } = await supabase
    .from('stories')
    .delete({ count: 'exact' })
    .lt('expires_at', now.toISOString());

  return new Response(JSON.stringify({
    ok: true,
    reminders_sent: sent,
    stories_deleted: count || 0,
    timestamp: now.toISOString(),
  }), { headers: { 'Content-Type': 'application/json' } });
});
