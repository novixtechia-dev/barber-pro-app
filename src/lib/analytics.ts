import { differenceInDays } from 'date-fns';

export interface RFVMetrics {
  recency: number; // dias desde a última visita
  frequency: number; // total de visitas
  value: number; // total gasto
}

export type RFVCategory = 
  | 'campeão'
  | 'gastador'
  | 'promissor'
  | 'fiel'
  | 'em risco'
  | 'perdido'
  | 'cliente regular'
  | 'cliente novo';

export interface ClientAnalytics {
  clientId: string;
  name: string;
  rfvMetrics: RFVMetrics;
  category: RFVCategory;
}

export const categorizeRFV = (rfv: RFVMetrics): RFVCategory => {
  const { recency, frequency, value } = rfv;

  // Campeão: Comprou recentemente, compra frequentemente e gasta muito
  if (recency <= 30 && frequency >= 5 && value >= 500) return 'campeão';
  
  // Fiel: Compra frequentemente, independente do valor
  if (frequency >= 4) return 'fiel';
  
  // Gastador: Gasta muito, mas talvez não tão frequentemente
  if (value >= 500 && frequency >= 2) return 'gastador';
  
  // Promissor: Cliente novo que já começou a gastar razoavelmente
  if (recency <= 30 && frequency >= 2 && frequency <= 3) return 'promissor';
  
  // Cliente Novo: Primeira vez recentemente
  if (recency <= 30 && frequency === 1) return 'cliente novo';
  
  // Cliente Regular: Veio algumas vezes, mas não gastou rios de dinheiro
  if (recency > 30 && recency <= 90 && frequency >= 2) return 'cliente regular';
  
  // Em Risco: Comprava com frequência mas faz tempo que não vem
  if (recency > 90 && recency <= 180 && frequency >= 2) return 'em risco';
  
  // Perdido: Não vem há muito tempo
  if (recency > 180) return 'perdido';

  // Default fallback (se não cair em nada específico)
  if (frequency === 1) return 'cliente novo';
  return 'cliente regular';
};

export const processCRMData = (bookings: any[], payments: any[]) => {
  const clientMap = new Map<string, ClientAnalytics>();
  
  const now = new Date();

  // 1. Processar Frequência e Recência baseada nos bookings concluídos
  bookings.forEach(b => {
    if (b.status !== 'completed' || !b.client_id) return;

    const bDate = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
    const daysSince = differenceInDays(now, bDate);
    
    let client = clientMap.get(b.client_id);
    if (!client) {
      client = {
        clientId: b.client_id,
        name: b.client?.full_name || 'Desconhecido',
        rfvMetrics: { recency: daysSince, frequency: 0, value: 0 },
        category: 'cliente novo'
      };
      clientMap.set(b.client_id, client);
    }
    
    // Atualizar recência (o menor valor de dias)
    if (daysSince < client.rfvMetrics.recency) {
      client.rfvMetrics.recency = daysSince;
    }
    
    client.rfvMetrics.frequency += 1;
  });

  // 2. Processar Valor (payments)
  payments.forEach(p => {
    if (p.status !== 'paid' || !p.client_id) return;
    
    let client = clientMap.get(p.client_id);
    if (client) {
      client.rfvMetrics.value += (p.amount || 0);
    }
  });

  // 3. Categorizar e retornar lista
  const clients = Array.from(clientMap.values()).map(c => {
    c.category = categorizeRFV(c.rfvMetrics);
    return c;
  });

  return clients;
};
