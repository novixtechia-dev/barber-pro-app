import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, message, imageUrl, logoUrl } = body;

    const appId = "7fc580f6-af36-4d42-add1-7e56b5bca89d";
    const apiKey = "os_v2_app_p7cyb5vpgzguflorpzlllpfitu5lbzvjtvyuzzmplmnfkfyu2w5eqpdlbctxyo4cwaggzlzviezws2s5z23otedqrq5m5mmj7a2gl4q";

    if (!appId || !apiKey) {
      console.warn('OneSignal env keys missing.');
      return NextResponse.json({ success: false, error: 'Configuração do OneSignal ausente' }, { status: 500 });
    }

    const payload: any = {
      app_id: appId,
      included_segments: ['Subscribed Users', 'Active Users', 'Total Subscriptions'], // Multiple segments to avoid empty targets
      target_channel: 'push',
      headings: { en: title, pt: title },
      contents: { en: message, pt: message },
    };

    if (logoUrl) {
      payload.chrome_web_icon = logoUrl;
      payload.large_icon = logoUrl;
    }

    if (imageUrl) {
      payload.big_picture = imageUrl; // Android
      payload.ios_attachments = { id1: imageUrl }; // iOS
    }

    console.log('[NOTIFY-BROADCAST] Sending to OneSignal:', JSON.stringify(payload, null, 2));

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('[NOTIFY-BROADCAST] OneSignal Response Status:', response.status);
    console.log('[NOTIFY-BROADCAST] OneSignal Response Data:', JSON.stringify(data, null, 2));

    if (!response.ok || data.errors) {
      console.error('[NOTIFY-BROADCAST] Error:', data);
      return NextResponse.json({ success: false, error: data.errors?.[0] || 'Erro ao enviar notificação', raw: data }, { status: response.status === 200 ? 500 : response.status });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API notify-broadcast error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
