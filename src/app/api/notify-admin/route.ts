import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * API Route: POST /api/notify-admin
 * Chamada sempre que um novo agendamento for criado.
 * Dispara uma notificação push via OneSignal para todos os admin/managers.
 */
export async function POST(req: NextRequest) {
  try {
    const { clientName, barbeirodName, serviceName, scheduledDate, scheduledTime } = await req.json();

    const appId = "7fc580f6-af36-4d42-add1-7e56b5bca89d";
    const apiKey = "os_v2_app_p7cyb5vpgzguflorpzlllpfitu5lbzvjtvyuzzmplmnfkfyu2w5eqpdlbctxyo4cwaggzlzviezws2s5z23otedqrq5m5mmj7a2gl4q";

    if (!appId || !apiKey) {
      return NextResponse.json({ error: 'OneSignal not configured' }, { status: 500 });
    }

    const dateFormatted = new Date(scheduledDate + 'T' + scheduledTime).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        // Envia para TODOS os usuários admin (via tag) ou todos os inscritos
        included_segments: ['All'],
        filters: [
          { field: 'tag', key: 'role', relation: '=', value: 'admin' },
        ],
        headings: { en: '📅 New Booking!', pt: '📅 Novo Agendamento!' },
        contents: {
          en: `${clientName} booked ${serviceName} with ${barbeirodName} at ${dateFormatted}.`,
          pt: `${clientName} agendou ${serviceName} com ${barbeirodName} em ${dateFormatted}.`,
        },
        data: {
          type: 'new_booking',
          redirect: '/admin/dashboard',
        },
        // Fallback sem filtro (notifica todos) caso não haja tags configuradas
        // Comente as linhas de `filters` acima para enviar para todos
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OneSignal error:', data);
      return NextResponse.json({ error: data }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (error) {
    console.error('Notify admin error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
