import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { barberId, clientName, serviceName, time, date, title, message, logoUrl } = await req.json();

    const ONESIGNAL_APP_ID = "7fc580f6-af36-4d42-add1-7e56b5bca89d";
    const ONESIGNAL_API_KEY = "os_v2_app_p7cyb5vpgzguflorpzlllpfitu5lbzvjtvyuzzmplmnfkfyu2w5eqpdlbctxyo4cwaggzlzviezws2s5z23otedqrq5m5mmj7a2gl4q";

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      console.warn('OneSignal env vars missing.');
      return NextResponse.json({ success: false, error: 'Configuração OneSignal ausente' }, { status: 500 });
    }

    if (!barberId) {
      return NextResponse.json({ success: false, error: 'barberId é obrigatório' }, { status: 400 });
    }

    const formattedDate = date ? date.split('-').reverse().join('/') : '';
    
    const finalTitle = title || 'Novo Agendamento! 🎉';
    const finalMessage = message || `${formattedDate}, ${time}, ${clientName}, ${serviceName}. Deseja aprovar?`;
    const finalLogo = logoUrl || "https://barberpro-nu.vercel.app/icons/icon-192x192.png";

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        target_channel: 'push',
        headings: { en: finalTitle, pt: finalTitle },
        contents: { en: finalMessage, pt: finalMessage },
        chrome_web_icon: finalLogo,
        large_icon: finalLogo,
        url: 'https://barberpro-nu.vercel.app/barber/dashboard',
        include_aliases: { external_id: [barberId] },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OneSignal Error:', errText);
      return NextResponse.json({ success: false, error: errText }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao notificar barbeiro:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
