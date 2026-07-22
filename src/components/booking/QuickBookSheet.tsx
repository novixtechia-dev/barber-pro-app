'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckCircleIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ClockIcon } from '@heroicons/react/24/solid';
import { Barber, Service, TimeSlot, PaymentMethod } from '@/types';
import { getAvailableSlots, createBooking } from '@/services/booking.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface Props {
  barber: Barber | null;
  initialService?: Service | null;
  initialDate?: string | null;
  initialTime?: string | null;
  onClose: () => void;
}

const STEPS = ['Serviço', 'Dia e Horário', 'Confirmação'];

export function QuickBookSheet({ barber, initialService, initialDate, initialTime, onClose }: Props) {
  const { user, profile } = useAuth();
  const router = useRouter();
  
  const todayStr = new Date().toLocaleDateString('en-CA');
  
  const [step, setStep] = useState(1);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || todayStr);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string | null>(initialTime || null);
  
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [success, setSuccess] = useState(false);

  // Pagination for calendar
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    if (barber) {
      if (initialService) setSelectedServices([initialService]);
      if (initialDate) setSelectedDate(initialDate);
      if (initialTime) setSelectedTime(initialTime);
      
      // Se já vier com serviço, vai pro passo 2 (Calendário)
      if (initialService) setStep(2);
      else setStep(1);

      Promise.all([
        supabase.from('barber_services').select('custom_price, service:services(*)').eq('barber_id', barber.id),
        supabase.from('services').select('*').eq('barber_id', barber.id).eq('is_active', true)
      ]).then(([bsRes, csRes]) => {
        let finalServices: Service[] = [];
        if (bsRes.data) {
          bsRes.data.forEach((bs: any) => {
            if (bs.service && bs.service.is_active) {
              finalServices.push({
                ...bs.service,
                price: bs.custom_price !== null ? bs.custom_price : bs.service.price
              });
            }
          });
        }
        if (csRes.data) {
          finalServices = [...finalServices, ...csRes.data];
        }
        finalServices.sort((a, b) => a.name.localeCompare(b.name));
        setServices(finalServices);
      });
    } else {
      setSelectedServices([]);
      setSelectedDate(todayStr);
      setSelectedTime(null);
      setSuccess(false);
      setStep(1);
    }
  }, [barber, initialService, initialDate, initialTime, todayStr]);

  // Total duration & price
  const totalDuration = selectedServices.reduce((acc, s) => acc + s.duration_minutes, 0) || 15;
  const totalPrice = selectedServices.reduce((acc, s) => acc + s.price, 0);

  useEffect(() => {
    if (barber && selectedDate && step === 2) {
      setLoadingSlots(true);
      getAvailableSlots(barber.id, selectedDate, totalDuration)
        .then(res => {
          setSlots(res);
          // Only clear if not available
          if (selectedTime && !res.find(s => s.time === selectedTime && s.available)) {
            setSelectedTime(null);
          }
        })
        .finally(() => setLoadingSlots(false));
    }
  }, [barber, selectedDate, step, selectedTime, totalDuration]);

  const handleBook = async (paymentMethod: PaymentMethod) => {
    if (!user) {
      router.push('/login');
      return;
    }
    if (!barber || selectedServices.length === 0 || !selectedTime || !selectedDate) return;
    
    setLoading(true);
    try {
      await createBooking(user.id, {
        step: 4,
        barber,
        unit: { id: barber.unit_id } as any,
        service: {
          ...selectedServices[0],
          name: selectedServices.map(s => s.name).join(' + '),
          duration_minutes: totalDuration,
        },
        date: selectedDate,
        time: selectedTime,
        paymentMethod
      } as any, undefined, totalPrice);
      
      setSuccess(true);
      
      fetch('/api/notify-barber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barberId: barber.profile_id,
          clientName: profile?.full_name || user.email || 'Cliente',
          serviceName: selectedServices.map(s => s.name).join(' + '),
          time: selectedTime,
          date: selectedDate
        })
      }).catch(console.error);

      // Notifica o próprio cliente
      fetch('/api/notify-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: user.id,
          title: 'AGENDAMENTO PENDENTE! 🟡',
          message: 'Aguardando aprovação.'
        })
      }).catch(console.error);

    } catch (err) {
      console.error(err);
      alert('Erro ao confirmar agendamento.');
    } finally {
      setLoading(false);
    }
  };

  const getWhatsAppLink = () => {
    const rawPhone = barber?.profile?.phone || '5511999999999';
    const phone = rawPhone.replace(/\D/g, '');
    const srvNames = selectedServices.map(s => s.name).join(', ');
    const msg = encodeURIComponent(`Olá ${barber?.display_name}, acabei de agendar: ${srvNames} para dia ${selectedDate.split('-').reverse().join('/')} às ${selectedTime}.`);
    return `https://wa.me/55${phone}?text=${msg}`;
  };

  // Calendar logic
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const morning = slots.filter(s => parseInt(s.time.split(':')[0]) < 12);
  const afternoon = slots.filter(s => parseInt(s.time.split(':')[0]) >= 12 && parseInt(s.time.split(':')[0]) < 18);
  const evening = slots.filter(s => parseInt(s.time.split(':')[0]) >= 18);

  const TimeGrid = ({ items, label }: { items: typeof slots; label: string }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 ml-1">{label}</h4>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {items.map(slot => (
            <button
              key={slot.time}
              onClick={() => {
                if (slot.available) {
                  setSelectedTime(slot.time);
                  setTimeout(() => setStep(3), 300); // auto-advance para o passo 3
                }
              }}
              disabled={!slot.available}
              className={`py-3.5 rounded-xl font-bold text-sm transition-all ${
                slot.available
                  ? selectedTime === slot.time
                    ? 'bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all '
                    : 'bg-dark border border-white/5 text-white hover:border-electric hover:text-electric active:scale-95'
                  : 'bg-dark/30 text-zinc-600 line-through cursor-not-allowed border border-transparent'
              }`}
            >
              {slot.time}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {barber && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-dark border-t md:border-x border-white/10 rounded-t-3xl z-[101] max-h-[90vh] flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-dark/50 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-surface border-border border border-white/10">
                  {barber.profile?.avatar_url && <img src={barber.profile.avatar_url} className="w-full h-full object-cover" />}
                </div>
                <div>
                  <h3 className="text-white font-bold tracking-tight">{barber.display_name}</h3>
                  <p className="text-zinc-500 text-xs font-medium uppercase tracking-wider">Agendamento</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Steps Progress */}
            {!success && (
              <div className="px-4 pt-4 shrink-0">
                <div className="flex gap-1 mb-4">
                  {STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        i + 1 <= step ? 'bg-electric' : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 mb-2">
                  {step > 1 && (
                    <button onClick={() => setStep(step - 1)} className="p-1 -ml-1">
                      <ChevronLeftIcon className="w-6 h-6 text-gray-400" />
                    </button>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Passo {step} de {STEPS.length}</p>
                    <h2 className="text-xl font-bold text-white">{STEPS[step - 1]}</h2>
                  </div>
                </div>
              </div>
            )}

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              {success ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                    <div className="relative">
                      <div className="absolute inset-0 bg-electric/20 text-electric blur-xl rounded-full" />
                      <CheckCircleIcon className="w-20 h-20 text-electric relative z-10" />
                    </div>
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-black text-white mb-1 tracking-tight">Confirmado!</h2>
                    <p className="text-zinc-400 text-sm">Horário garantido para <br/><strong className="text-white">{selectedDate.split('-').reverse().join('/')} às {selectedTime}</strong></p>
                  </div>
                  
                  <a
                    href={getWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-[#25D366] text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-colors mt-6 shadow-lg shadow-[#25D366]/20 active:scale-[0.98]"
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.82 9.82 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                    </svg>
                    Avisar no WhatsApp
                  </a>
                  
                  <button onClick={onClose} className="w-full bg-white/5 text-zinc-300 font-bold py-4 rounded-2xl mt-3 hover:bg-white/10 transition-colors">
                    Fechar
                  </button>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* STEP 1: SERVIÇO */}
                    {step === 1 && (
                      <div className="pb-8">
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          {services.map(s => {
                            const isSelected = selectedServices.some(x => x.id === s.id);
                            return (
                              <button
                                key={s.id}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedServices(prev => prev.filter(x => x.id !== s.id));
                                  } else {
                                    setSelectedServices(prev => [...prev, s]);
                                  }
                                }}
                                className={`bg-dark border rounded-2xl overflow-hidden text-left hover:border-electric/40 transition-all active:scale-95 flex flex-col h-full ${isSelected ? 'border-electric ring-1 ring-electric' : 'border-white/5'}`}
                              >
                                <div className="w-full aspect-[4/3] bg-surface border-border relative flex items-center justify-center">
                                  {s.image_url ? (
                                    <img src={s.image_url.startsWith('http') ? s.image_url : supabase.storage.from(s.image_url.startsWith('services/') ? 'uploads' : 'portfolio').getPublicUrl(s.image_url).data.publicUrl} alt={s.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-zinc-600 text-xs font-medium">Sem foto</span>
                                  )}
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all rounded-full p-1 shadow-md">
                                      <CheckCircleIcon className="w-4 h-4" />
                                    </div>
                                  )}
                                </div>
                                <div className="p-3 flex flex-col flex-1">
                                  <h3 className="font-bold text-white text-sm line-clamp-1">{s.name}</h3>
                                  <div className="mt-auto pt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-1 text-zinc-500 text-xs font-medium bg-surface border-border w-fit px-1.5 py-0.5 rounded-md">
                                      <ClockIcon className="w-3 h-3 text-electric" />
                                      <span>{s.duration_minutes} min</span>
                                    </div>
                                    <span className="text-electric font-bold text-sm">
                                      R$ {s.price.toFixed(0)}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        
                        {/* Selected info and Proceed */}
                        {selectedServices.length > 0 && (
                          <div className="bg-electric/10 text-electric border border-electric/30 p-4 rounded-2xl mb-4 flex justify-between items-center">
                            <div>
                              <p className="text-white font-bold mb-1">Pronto para agendar?</p>
                              <p className="text-zinc-400 text-sm">Você selecionou {selectedServices.length} serviço(s).</p>
                            </div>
                            <button onClick={() => setStep(2)} className="bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black px-5 py-2.5 rounded-xl active:scale-95 transition-transform">
                              Continuar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STEP 2: DIA E HORA */}
                    {step === 2 && (
                      <div className="pb-8 space-y-6">
                        <div className="bg-dark border border-white/5 rounded-3xl p-5 shadow-xl">
                          <div className="flex items-center justify-between mb-4 px-2">
                            <button onClick={prevMonth} className="p-2 hover:bg-surface border-border rounded-full transition-colors text-white">
                              <ChevronLeftIcon className="w-5 h-5" />
                            </button>
                            <h3 className="text-white font-bold text-base capitalize tracking-wide">
                              {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </h3>
                            <button onClick={nextMonth} className="p-2 hover:bg-surface border-border rounded-full transition-colors text-white">
                              <ChevronRightIcon className="w-5 h-5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-7 gap-1 mb-2">
                            {weekDays.map(day => (
                              <div key={day} className="text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest pb-1">
                                {day}
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-7 gap-1">
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`blank-${i}`} className="p-1" />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                              const day = i + 1;
                              const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                              const isPast = date < today;
                              const isToday = date.getTime() === today.getTime();
                              const dateString = date.toISOString().split('T')[0];
                              const isSelected = selectedDate === dateString;

                              return (
                                <button
                                  key={day}
                                  disabled={isPast}
                                  onClick={() => setSelectedDate(dateString)}
                                  className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all ${
                                    isPast 
                                      ? 'text-zinc-600 cursor-not-allowed opacity-50' 
                                      : isSelected
                                        ? 'bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black  scale-105'
                                        : isToday
                                          ? 'border border-electric/50 text-electric font-bold hover:bg-electric/10 text-electric'
                                          : 'text-white hover:bg-surface border-border font-medium active:scale-95'
                                  }`}
                                >
                                  <span className="text-sm">{day}</span>
                                  {isToday && !isSelected && <span className="w-1 h-1 bg-electric rounded-full mt-0.5" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-2">
                          <h3 className="text-white font-bold text-lg mb-4 ml-1">Horários Disponíveis</h3>
                          {loadingSlots ? (
                            <div className="flex items-center justify-center py-12">
                              <div className="w-8 h-8 border-4 border-electric border-t-transparent rounded-full animate-spin" />
                            </div>
                          ) : slots.filter(s => s.available).length === 0 ? (
                            <div className="bg-dark border border-white/5 rounded-2xl text-center p-8 text-zinc-500 font-medium">
                              Nenhum horário disponível para {totalDuration} min de duração.
                            </div>
                          ) : (
                            <div>
                              <TimeGrid items={morning} label="Manhã" />
                              <TimeGrid items={afternoon} label="Tarde" />
                              <TimeGrid items={evening} label="Noite" />
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* STEP 3: CONFIRMAÇÃO */}
                    {step === 3 && (
                      <div className="space-y-6 pb-8">
                        <div className="bg-dark rounded-3xl p-5 border border-white/5">
                          <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-electric" /> Resumo
                          </h3>
                          <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center bg-dark/50 p-3 rounded-xl">
                              <span className="text-gray-400">Barbeiro</span>
                              <span className="text-white font-medium">{barber.display_name}</span>
                            </div>
                            <div className="flex justify-between items-start bg-dark/50 p-3 rounded-xl">
                              <span className="text-gray-400">Serviço(s)</span>
                              <div className="flex flex-col items-end">
                                {selectedServices.map(s => (
                                  <span key={s.id} className="text-white font-medium text-right">{s.name}</span>
                                ))}
                              </div>
                            </div>
                            <div className="flex justify-between items-center bg-dark/50 p-3 rounded-xl">
                              <span className="text-gray-400">Data e Hora</span>
                              <span className="text-electric font-bold bg-electric/10 text-electric px-2 py-1 rounded-lg">
                                {selectedDate.split('-').reverse().join('/')} às {selectedTime}
                              </span>
                            </div>
                            <div className="flex justify-between items-end mt-4 pt-4 border-t border-white/10">
                              <span className="text-gray-400 font-semibold">Total a pagar</span>
                              <span className="text-electric font-black text-2xl">
                                R$ {totalPrice.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-zinc-400 ml-1">Como prefere pagar?</h4>
                          {[
                            { method: 'pix' as const, label: 'PIX', icon: '⚡', desc: 'Confirmação imediata' },
                            { method: 'on_site' as const, label: 'Pagar na Barbearia', icon: '💰', desc: 'Dinheiro ou Cartão' }
                          ].map(opt => (
                            <button
                              key={opt.method}
                              onClick={() => handleBook(opt.method)}
                              disabled={loading}
                              className="w-full bg-dark border border-white/5 rounded-2xl p-4 text-left hover:border-electric/40 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-dark rounded-xl flex items-center justify-center text-xl">{opt.icon}</div>
                                <div>
                                  <div className="text-white font-bold text-base">{opt.label}</div>
                                  <div className="text-gray-400 text-xs mt-0.5">{opt.desc}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>

            {/* Footer Buttons */}
            {!success && (
              <div className="p-4 border-t border-white/5 bg-dark shrink-0 pb-safe">
                {step === 1 && (
                  <button
                    disabled={selectedServices.length === 0 || loading}
                    onClick={() => setStep(2)}
                    className="w-full bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black py-4 rounded-2xl hover:brightness-110 transition-all disabled:opacity-50 disabled:grayscale active:scale-[0.98] flex justify-center items-center gap-2 "
                  >
                    Avançar para Horário
                  </button>
                )}
                {step === 2 && (
                  <button
                    disabled={!selectedTime || loading}
                    onClick={() => setStep(3)}
                    className="w-full bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black py-4 rounded-2xl hover:brightness-110 transition-all disabled:opacity-50 disabled:grayscale active:scale-[0.98] flex justify-center items-center gap-2 "
                  >
                    Avançar para Pagamento
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
