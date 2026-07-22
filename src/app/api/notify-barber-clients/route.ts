import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { clientIds, title, message, logoUrl, deepLink } = body;

    const appId = "7fc580f6-af36-4d42-add1-7e56b5bca89d";
    const apiKey = "os_v2_app_p7cyb5vpgzguflorpzlllpfitu5lbzvjtvyuzzmplmnfkfyu2w5eqpdlbctxyo4cwaggzlzviezws2s5z23otedqrq5m5mmj7a2gl4q";

    if (!appId || !apiKey) {
      console.warn('OneSignal env keys missing.');
      return NextResponse.json({ success: false, error: 'Configuração do OneSignal ausente' }, { status: 500 });
    }

    if (!clientIds || clientIds.length === 0) {
      return NextResponse.json({ success: true, message: 'Nenhum cliente para notificar' });
    }

    const payload: any = {
      app_id: appId,
      target_channel: 'push',
      include_aliases: { external_id: clientIds },
      headings: { en: title, pt: title },
      contents: { en: message, pt: message },
    };

    if (logoUrl) {
      payload.chrome_web_icon = logoUrl;
      payload.large_icon = logoUrl;
    }
    
    if (deepLink) {
      // url param makes it a deep link on mobile and web
      payload.app_url = deepLink;
      payload.url = deepLink;
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.errors) {
      console.error('[NOTIFY-BARBER-CLIENTS] Error:', data);
      return NextResponse.json({ success: false, error: data.errors?.[0] || 'Erro ao enviar notificação' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('API notify-barber-clients error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
