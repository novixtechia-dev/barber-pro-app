import { supabase } from '@/lib/supabase';
import { Booking, BookingFlowState, TimeSlot } from '@/types';
import { notifyAdminNewBooking, notifyBarberNewBooking } from './notifications';

// ─── Buscar slots disponíveis para um barbeiro em uma data ────
export async function getAvailableSlots(
  barberId: string,
  date: string,
  serviceDurationMinutes: number
): Promise<TimeSlot[]> {
  const [year, month, day] = date.split('-').map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  // 1. Pegar bloqueios do dia inteiro (folgas/férias)
  const { data: timeOff } = await supabase
    .from('barber_time_offs')
    .select('id')
    .eq('barber_id', barberId)
    .eq('off_date', date)
    .maybeSingle();

  if (timeOff) return []; // Dia inteiro bloqueado

  // 2. Pegar horário de trabalho do dia
  const { data: schedule } = await supabase
    .from('barber_schedules')
    .select('*')
    .eq('barber_id', barberId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)
    .maybeSingle();

  if (!schedule) return [];

  // 3. Pegar agendamentos já feitos no dia
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('scheduled_time, end_time')
    .eq('barber_id', barberId)
    .eq('scheduled_date', date)
    .in('status', ['pending', 'confirmed', 'in_progress']);

  // 4. Gerar todos os slots do dia baseados no intervalo padrão
  const slots: TimeSlot[] = [];
  const slotDuration = schedule.slot_duration_minutes || 30;
  const [startH, startM] = schedule.starts_at.split(':').map(Number);
  const [endH, endM] = schedule.ends_at.split(':').map(Number);

  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current + serviceDurationMinutes <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, '0');
    const m = (current % 60).toString().padStart(2, '0');
    const timeStr = `${h}:${m}`;
    const slotEnd = current + serviceDurationMinutes;

    const isBooked = (existingBookings || []).some(booking => {
      const bStart = timeToMinutes(booking.scheduled_time);
      const bEnd = timeToMinutes(booking.end_time);
      return current < bEnd && slotEnd > bStart;
    });

    slots.push({ time: timeStr, available: !isBooked });
    // Increment by the slot_duration interval (e.g. 30 mins)
    current += slotDuration;
  }

  return slots;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// ─── Criar agendamento ────────────────────────────────────────
export async function createBooking(
  clientId: string,
  flow: Required<BookingFlowState>,
  couponId?: string,
  finalPrice?: number
): Promise<Booking> {
  // Calcular end_time
  const [h, m] = flow.time.split(':').map(Number);
  const endMinutes = h * 60 + m + flow.service.duration_minutes;
  const endH = Math.floor(endMinutes / 60).toString().padStart(2, '0');
  const endM = (endMinutes % 60).toString().padStart(2, '0');
  const endTime = `${endH}:${endM}`;

  // Obter configurações do barbeiro
  const { data: barberSettings } = await supabase
    .from('barbers')
    .select('auto_approve_type, auto_approve_time')
    .eq('id', flow.barber.id)
    .single();

  let initialStatus = 'pending';
  if (barberSettings) {
    if (barberSettings.auto_approve_type === 'all') {
      initialStatus = 'confirmed';
    } else if (barberSettings.auto_approve_type === 'until_time' && barberSettings.auto_approve_time) {
      if (flow.time <= barberSettings.auto_approve_time.substring(0, 5)) {
        initialStatus = 'confirmed';
      }
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      client_id: clientId,
      barber_id: flow.barber.id,
      ...(flow.unit?.id ? { unit_id: flow.unit.id } : {}),
      service_id: flow.service.id,
      scheduled_date: flow.date,
      scheduled_time: flow.time,
      end_time: endTime,
      status: initialStatus,
    })
    .select(`
      *,
      barber:barbers(*, profile:profiles(*)),
      service:services(*),
      unit:units(*)
    `)
    .single();

  if (error) throw error;

  const amountToCharge = finalPrice !== undefined ? finalPrice : flow.service.price;

  // Criar payment
  const { error: paymentError } = await supabase.from('payments').insert({
    booking_id: data.id,
    client_id: clientId,
    amount: amountToCharge,
    method: flow.paymentMethod,
    status: flow.paymentMethod === 'on_site' ? 'pending' : 'pending',
  });

  if (paymentError) {
    console.error('Erro ao criar pagamento:', paymentError);
  }

  try {
    // Notificar admin e cliente
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', clientId)
      .single();

    const barberName = data.barber.profile?.full_name || data.barber.display_name;

    if (clientProfile?.full_name) {
      await notifyAdminNewBooking({
        clientName: clientProfile.full_name,
        barberName: barberName,
        serviceName: flow.service.name,
        scheduledDate: flow.date,
        scheduledTime: flow.time
      });

      // Notificar o barbeiro também
      await notifyBarberNewBooking({
        barberId: flow.barber.id,
        clientName: clientProfile.full_name,
        serviceName: flow.service.name,
        scheduledDate: flow.date,
        scheduledTime: flow.time
      });
    }

    // Enviar WhatsApp para o cliente
    if (clientProfile?.phone) {
      const { sendWhatsAppMessage } = await import('./whatsapp.service');
      const msg = `Olá ${clientProfile.full_name.split(' ')[0]}! Seu agendamento no Barber Pro foi confirmado.\n\n✂️ Serviço: ${flow.service.name}\n💈 Barbeiro: ${barberName}\n📅 Data: ${flow.date.split('-').reverse().join('/')}\n⏰ Horário: ${flow.time}\n\nTe esperamos lá!`;
      await sendWhatsAppMessage(clientProfile.phone, msg);
    }
  } catch (notificationError) {
    console.error('Erro ao enviar notificações:', notificationError);
  }

  // TODO: Agendar lembrete "20 minutos antes" no backend via Cron ou Supabase Edge Functions.

  return data;
}

// ─── Cancelar agendamento ─────────────────────────────────────
export async function cancelBooking(bookingId: string, reason?: string) {
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, client:profiles(onesignal_player_id), barber:barbers(display_name)')
    .eq('id', bookingId)
    .single();

  await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancellation_reason: reason })
    .eq('id', bookingId);

  // Notificar fila de espera
  await notifyWaitingList(booking.barber_id, booking.scheduled_date);
}

// ─── Notificar fila de espera ─────────────────────────────────
async function notifyWaitingList(barberId: string, date: string) {
  const { data: waiters } = await supabase
    .from('waiting_list')
    .select('*, client:profiles(onesignal_player_id), barber:barbers(display_name)')
    .eq('barber_id', barberId)
    .eq('desired_date', date)
    .eq('notified', false);

  // TODO: Add push notifications for waiting list logic here
}

// ─── Buscar agendamentos do cliente ───────────────────────────
export async function getClientBookings(clientId: string): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      barber:barbers(display_name, profile:profiles(avatar_url)),
      service:services(name, price, duration_minutes),
      unit:units(name, address),
      payment:payments(method, status, amount)
    `)
    .eq('client_id', clientId)
    .order('scheduled_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

// ─── Buscar agendamentos do barbeiro ──────────────────────────
export async function getBarberBookings(barberId: string, date?: string): Promise<Booking[]> {
  let query = supabase
    .from('bookings')
    .select(`
      *,
      client:profiles(full_name, avatar_url, phone),
      service:services(name, duration_minutes, price),
      payment:payments(method, status)
    `)
    .eq('barber_id', barberId)
    .order('scheduled_time');

  if (date) query = query.eq('scheduled_date', date);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
