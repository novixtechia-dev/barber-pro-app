/**
 * notifyAdmin — Dispara push notification para todos os admins via OneSignal
 * Chamado no momento que um agendamento é criado.
 */
export async function notifyAdminNewBooking({
  clientName,
  barberName,
  serviceName,
  scheduledDate,
  scheduledTime,
}: {
  clientName: string;
  barberName: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime: string;
}) {
  try {
    await fetch('/api/notify-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientName, barbeirodName: barberName, serviceName, scheduledDate, scheduledTime }),
    });
  } catch (e) {
    // Silently fail — notificação não é crítica para o fluxo de agendamento
    console.warn('Failed to notify admin:', e);
  }
}

export async function notifyBarberNewBooking({
  barberId,
  clientName,
  serviceName,
  scheduledDate,
  scheduledTime,
}: {
  barberId: string;
  clientName: string;
  serviceName: string;
  scheduledDate: string;
  scheduledTime: string;
}) {
  try {
    await fetch('/api/notify-barber', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barberId, clientName, serviceName, date: scheduledDate, time: scheduledTime }),
    });
  } catch (e) {
    console.warn('Failed to notify barber:', e);
  }
}

export async function notifyClientBookingStatus({
  clientId,
  title,
  message,
}: {
  clientId: string;
  title: string;
  message: string;
}) {
  try {
    await fetch('/api/notify-client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId, title, message }),
    });
  } catch (e) {
    console.warn('Failed to notify client:', e);
  }
}

/**
 * registerOneSignalTag — Salva a role do usuário como tag no OneSignal.
 * Permite enviar notificações segmentadas apenas para admins.
 */
export async function registerOneSignalTag(role: string, userId?: string) {
  try {
    if (typeof window !== 'undefined' && (window as any).OneSignal) {
      const OneSignal = (window as any).OneSignal;
      if (userId) {
        await OneSignal.login(userId);
      }
      await OneSignal.User.addTags({ role });
    }
  } catch (e) {
    console.warn('Failed to tag OneSignal user:', e);
  }
}
