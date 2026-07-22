export type WhatsAppProvider = 'official' | 'custom';

interface WhatsAppConfig {
  provider: WhatsAppProvider;
  apiUrl: string;
  token: string;
  instanceId?: string; // Para APIs não oficiais (Evolution API, Z-API, etc)
}

// Configuração atual (idealmente vindo do banco ou ENV)
const getConfig = (): WhatsAppConfig => ({
  provider: (process.env.NEXT_PUBLIC_WA_PROVIDER as WhatsAppProvider) || 'custom',
  apiUrl: process.env.NEXT_PUBLIC_WA_API_URL || 'https://api.sua-api.com/v1',
  token: process.env.NEXT_PUBLIC_WA_TOKEN || 'SUA_CHAVE_AQUI',
  instanceId: process.env.NEXT_PUBLIC_WA_INSTANCE_ID || 'instancia_1'
});

/**
 * Envia uma mensagem de texto via WhatsApp
 * @param phone Número do telefone com DDI (ex: 5511999999999)
 * @param message Mensagem a ser enviada
 */
export async function sendWhatsAppMessage(phone: string, message: string) {
  // Em localhost/dev, podemos apenas logar para não gastar saldo
  if (process.env.NODE_ENV === 'development') {
    console.log(`[WHATSAPP DEV] Para: ${phone} | Mensagem: ${message}`);
    return { success: true, mocked: true };
  }

  const config = getConfig();
  const cleanPhone = phone.replace(/\D/g, ''); // Limpa formatação
  
  try {
    if (config.provider === 'official') {
      // Integração API Oficial Meta (Cloud API)
      const response = await fetch(`${config.apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: cleanPhone,
          type: "text",
          text: { body: message }
        })
      });
      return await response.json();
    } else {
      // Integração API Customizada (ex: Evolution API / CodeChat)
      const response = await fetch(`${config.apiUrl}/message/sendText/${config.instanceId}`, {
        method: 'POST',
        headers: {
          'apikey': config.token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          number: cleanPhone,
          options: { delay: 1200 },
          textMessage: { text: message }
        })
      });
      return await response.json();
    }
  } catch (error) {
    console.error('Erro ao enviar WhatsApp:', error);
    return null;
  }
}
