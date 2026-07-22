'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { CalendarIcon, ClockIcon, ScissorsIcon, UserIcon } from '@heroicons/react/24/outline';

const isMocked = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('SEU_PROJETO');

export default function BookingsPage() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'future' | 'history'>('future');
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (isMocked()) { setLoading(false); return; }
    if (!profile) return;

    const loadBookings = async () => {
      const { data } = await supabase
        .from('bookings')
        .select(`
          id,
          scheduled_date,
          scheduled_time,
          status,
          cancellation_reason,
          barber:barbers(display_name),
          service:services(name, price)
        `)
        .eq('client_id', profile.id)
        .order('scheduled_date', { ascending: false })
        .order('scheduled_time', { ascending: false });

      if (data) setBookings(data);
      setLoading(false);
    };

    loadBookings();
  }, [profile]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-400 bg-green-400/10';
      case 'pending': return 'text-electric bg-electric/10 text-electric';
      case 'cancelled': return 'text-red-400 bg-red-400/10';
      case 'completed': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-zinc-400 bg-surface border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'cancelled': return 'Cancelado';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelBookingId) return;
    setCancelling(true);
    try {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, barber_id, scheduled_date, scheduled_time, barber:barbers(profile_id)')
        .eq('id', cancelBookingId)
        .single();

      if (!booking) throw new Error('Agendamento não encontrado');

      const { error } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
          cancellation_reason: cancelReason || 'Cancelado pelo cliente',
          cancelled_by_role: 'client'
        })
        .eq('id', cancelBookingId);

      if (error) throw error;

      setBookings(prev => prev.map(b => 
        b.id === cancelBookingId 
          ? { ...b, status: 'cancelled', cancellation_reason: cancelReason || 'Cancelado pelo cliente' } 
          : b
      ));

      // Obter info da unidade (logo, etc)
      const { data: unit } = await supabase.from('units').select('name, logo_url').limit(1).single();

      // Notificar barbeiro
      const notifyRes = await fetch('/api/notify-barber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: (booking.barber as any)?.profile_id || booking.barber_id,
          title: 'Agendamento Cancelado ❌',
          message: `Um cliente cancelou o agendamento do dia ${format(parseISO(booking.scheduled_date), 'dd/MM')} às ${booking.scheduled_time.substring(0,5)}. Deseja disponibilizar a vaga?`,
          logoUrl: unit?.logo_url
        })
      });
      
      if (!notifyRes.ok) {
        console.error('Erro ao notificar barbeiro do cancelamento');
      }

      setCancelBookingId(null);
      setCancelReason('');
    } catch (e) {
      console.error(e);
      alert('Erro ao cancelar agendamento.');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="px-4 pt-4 md:px-0 md:pt-0">
        <h1 className="text-2xl font-bold">Meus Agendamentos</h1>
        <div className="flex items-center gap-4 mt-4 border-b border-white/10">
          <button
            onClick={() => setActiveTab('future')}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'future' ? 'text-electric border-electric' : 'text-zinc-500 border-transparent hover:text-white'}`}
          >
            Aguardando
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'history' ? 'text-electric border-electric' : 'text-zinc-500 border-transparent hover:text-white'}`}
          >
            Histórico
          </button>
        </div>
      </div>

      <div className="px-4 md:px-0">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 pb-24">
            {(() => {
              const filteredBookings = bookings.filter(b => {
                const isActive = ['pending', 'confirmed', 'in_progress'].includes(b.status);
                
                if (activeTab === 'future') {
                  return isActive;
                } else {
                  return !isActive;
                }
              });

              if (filteredBookings.length === 0) {
                return (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16 bg-dark border border-white/5 rounded-3xl mt-4 shadow-xl">
                    <div className="w-20 h-20 bg-surface border-border rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-white/5">
                      <CalendarIcon className="w-10 h-10 text-electric" />
                    </div>
                    <h3 className="text-white font-black text-xl mb-2">Nenhum agendamento</h3>
                    <p className="text-zinc-400 text-sm mb-8 px-6">
                      {activeTab === 'future' 
                        ? 'Você não possui horários marcados para o futuro. Que tal dar um trato no visual?' 
                        : 'Seu histórico está vazio. Faça seu primeiro agendamento!'}
                    </p>
                    <a href="/booking" className="inline-block bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all px-8 py-3 rounded-xl font-black text-sm  active:scale-95 transition-transform uppercase tracking-wider">
                      Agendar Horário
                    </a>
                  </motion.div>
                );
              }

              return filteredBookings.map((booking, i) => {
                if (booking.status === 'cancelled') {
                  return (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="bg-red-500/5 border border-red-500/20 p-5 rounded-3xl flex flex-col gap-1 shadow-md"
                    >
                      <p className="text-red-400 font-black text-sm uppercase tracking-widest mb-1">Cancelado X</p>
                      <p className="text-zinc-300 text-sm">{booking.cancellation_reason || 'Motivo não informado.'}</p>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-dark border border-white/5 p-5 rounded-3xl flex flex-col gap-4 shadow-md hover:border-electric/30 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="bg-electric/10 text-electric p-2.5 rounded-xl border border-electric/30">
                          <CalendarIcon className="w-6 h-6 text-electric" />
                        </div>
                        <div>
                          <p className="text-white font-bold capitalize text-sm leading-tight mb-1">
                            {format(parseISO(booking.scheduled_date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                          </p>
                          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
                            <ClockIcon className="w-4 h-4 text-electric" />
                            <span className="text-electric font-bold">{booking.scheduled_time.substring(0, 5)}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-widest ${getStatusColor(booking.status)}`}>
                        {getStatusText(booking.status)}
                      </span>
                    </div>

                    <div className="h-px bg-white/5 w-full my-1" />

                    <div className="flex justify-between items-end">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-zinc-300 text-sm font-medium">
                          <ScissorsIcon className="w-4 h-4 text-zinc-500" />
                          {booking.service?.name || 'Serviço excluído'}
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400 text-sm">
                          <UserIcon className="w-4 h-4 text-zinc-500" />
                          {booking.barber?.display_name || 'Profissional'}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {booking.service?.price && (
                          <div className="text-right">
                            <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mb-0.5">Valor</p>
                            <p className="text-electric font-black text-lg leading-none">R$ {booking.service.price.toFixed(0)}</p>
                          </div>
                        )}
                        {activeTab === 'future' && (
                          <button
                            onClick={() => setCancelBookingId(booking.id)}
                            className="text-xs font-bold text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20 hover:bg-red-400/20 transition-colors"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* Modal Cancelamento Cliente */}
      {cancelBookingId && (
        <div className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-dark border border-white/10 rounded-3xl p-6 w-full max-w-sm relative shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">Cancelar Agendamento</h3>
            <p className="text-sm text-zinc-400 mb-4">Tem certeza que deseja cancelar? O barbeiro será notificado.</p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Motivo (opcional)"
              className="w-full bg-dark border border-white/10 rounded-xl p-3 text-sm text-white mb-4 focus:outline-none focus:border-red-400"
              rows={3}
            />
            <div className="flex gap-2">
              <button 
                onClick={() => setCancelBookingId(null)} 
                disabled={cancelling} 
                className="flex-1 py-3 font-bold text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
              <button 
                onClick={handleCancelBooking} 
                disabled={cancelling} 
                className="flex-1 py-3 bg-red-400 text-black font-bold rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {cancelling ? 'Cancelando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
