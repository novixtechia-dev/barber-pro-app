'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { createBooking, getAvailableSlots } from '@/services/booking.service';
import { Unit, Barber, Service, BookingFlowState, PaymentMethod } from '@/types';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChevronLeftIcon, CheckCircleIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { MapPinIcon, StarIcon, ClockIcon, ScissorsIcon } from '@heroicons/react/24/outline';
import { BarberProfilePreview } from './BarberProfilePreview';

import { useSearchParams } from 'next/navigation';

const STEPS = ['Serviço', 'Barbeiro', 'Dia e Horário', 'Confirmação'];

export default function BookingFlow() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialServiceId = searchParams.get('service_id');
  const [flow, setFlow] = useState<BookingFlowState>({ step: 1 });
  const [units, setUnits] = useState<Unit[]>([]);
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Preview do barbeiro
  const [previewBarber, setPreviewBarber] = useState<Barber | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Carregar unidade padrão (opcional)
      const { data: defaultUnit } = await supabase.from('units').select('*').eq('is_active', true).limit(1).maybeSingle();
      if (defaultUnit) {
        setFlow(f => ({ ...f, unit: defaultUnit }));
      }

      // Carregar barbeiros ativos (com ou sem unit)
      const barberQuery = supabase
        .from('barbers')
        .select('*, profile:profiles(full_name, avatar_url), barber_services(service_id)')
        .eq('is_active', true)
        .neq('display_name', 'Novo Barbeiro');

      const { data: barberData } = await barberQuery;
      setBarbers(barberData || []);

      // Carregar serviços ativos
      const { data: srvs } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('name');

      setServices(srvs || []);

      if (initialServiceId && srvs) {
        const found = srvs.find(s => s.id === initialServiceId);
        if (found) {
          setFlow(f => ({ ...f, service: found, step: 2 }));
        }
      }
    };
    loadData();
  }, [initialServiceId]);

  const loadSlots = async (barberId: string, date: string, duration: number) => {
    setLoading(true);
    const slots = await getAvailableSlots(barberId, date, duration);
    setSlots(slots);
    setLoading(false);
  };

  // Nagevação
  const goToStep = (step: number) => setFlow(f => ({ ...f, step: step as BookingFlowState['step'] }));

  const selectService = (service: Service) => {
    setFlow(f => ({ ...f, service, step: 2, barber: undefined, date: undefined, time: undefined }));
  };

  const handleBarberClick = (barber: Barber) => {
    setFlow(f => ({ ...f, barber, step: 3, date: undefined, time: undefined }));
  };

  const confirmBarber = () => {
    if (previewBarber) {
      setFlow(f => ({ ...f, barber: previewBarber, step: 3, date: undefined, time: undefined }));
      setPreviewBarber(null);
    }
  };

  const selectDate = async (date: string) => {
    setFlow(f => ({ ...f, date }));
    if (flow.barber && flow.service) {
      await loadSlots(flow.barber.id, date, flow.service.duration_minutes);
    }
  };

  const selectTime = (time: string) => {
    setFlow(f => ({ ...f, time, step: 4 }));
  };

  const confirmBooking = async (paymentMethod: PaymentMethod, couponId?: string, finalPrice?: number) => {
    if (!user || !flow.unit || !flow.barber || !flow.service || !flow.date || !flow.time) return;
    setLoading(true);
    try {
      await createBooking(user.id, { ...flow, paymentMethod } as any, couponId, finalPrice);
      setCompleted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center"
      >
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
          <CheckCircleIcon className="w-24 h-24 text-electric" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Agendamento Confirmado!</h2>
          <p className="text-gray-400">{flow.barber?.display_name} • {flow.date} às {flow.time}</p>
          <p className="text-electric font-semibold mt-1">{flow.service?.name}</p>
        </div>
        <button onClick={() => router.push('/bookings')} className="w-full bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold py-4 rounded-2xl mt-4">
          Ver meus agendamentos
        </button>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Drawer do Barbeiro */}
      <BarberProfilePreview
        barber={previewBarber}
        isOpen={!!previewBarber}
        onClose={() => setPreviewBarber(null)}
        onConfirm={confirmBarber}
      />

      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <div className="flex gap-1 mb-4">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i + 1 <= flow.step ? 'bg-electric' : 'bg-white/10'
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 mb-6">
          {flow.step > 1 && (
            <button onClick={() => goToStep(flow.step - 1)} className="p-1 -ml-1">
              <ChevronLeftIcon className="w-6 h-6 text-gray-400" />
            </button>
          )}
          <div>
            <p className="text-xs text-gray-500 font-medium">Passo {flow.step} de {STEPS.length}</p>
            <h2 className="text-xl font-bold text-white">{STEPS[flow.step - 1]}</h2>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={flow.step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex-1 px-4"
        >
          {flow.step === 1 && <StepServices services={services} onSelect={selectService} />}
          {flow.step === 2 && (
            <StepBarbers 
              barbers={flow.service ? barbers.filter((b: any) => b.barber_services?.some((bs: any) => bs.service_id === flow.service?.id)) : barbers} 
              onSelect={handleBarberClick} 
            />
          )}
          {flow.step === 3 && <StepDateTime flow={flow} slots={slots} loading={loading} onSelectDate={selectDate} onSelectTime={selectTime} />}
          {flow.step === 4 && <StepPayment flow={flow} loading={loading} onConfirm={confirmBooking} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────



function StepBarbers({ barbers, onSelect }: { barbers: Barber[]; onSelect: (b: Barber) => void }) {
  if (barbers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 mt-10 text-center bg-dark border border-white/5 rounded-3xl">
        <div className="w-16 h-16 bg-surface border-border rounded-full flex items-center justify-center mb-4">
          <ScissorsIcon className="w-8 h-8 text-zinc-600" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2">Poxa!</h3>
        <p className="text-sm font-medium text-zinc-500">Nenhum barbeiro disponível para este serviço no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-8">
      {barbers.map(barber => (
        <button
          key={barber.id}
          onClick={() => onSelect(barber)}
          className="w-full bg-dark border border-white/5 rounded-2xl p-4 text-left hover:border-electric/40 transition-all active:scale-95"
        >
          <div className="flex gap-4 items-center">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-surface border-border flex-shrink-0">
              {barber.profile?.avatar_url && <img src={barber.profile.avatar_url} alt={barber.display_name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-white text-lg">{barber.display_name}</h3>
              <div className="flex items-center gap-1 mt-0.5">
                <StarIcon className="w-4 h-4 text-electric" />
                <span className="text-electric font-medium">{barber.rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({barber.total_reviews} avaliações)</span>
              </div>
              <div className="text-xs text-electric mt-2 font-medium">Selecionar &rarr;</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function StepServices({ services, onSelect }: { services: Service[]; onSelect: (s: Service) => void }) {
  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const bucket = path.startsWith('services/') ? 'uploads' : 'portfolio';
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl;
  };

  return (
    <div className="grid grid-cols-2 gap-3 pb-8">
      {services.map(service => (
        <button
          key={service.id}
          onClick={() => onSelect(service)}
          className="bg-dark border border-white/5 rounded-2xl overflow-hidden text-left hover:border-electric/40 transition-all active:scale-95 flex flex-col h-full"
        >
          <div className="w-full aspect-[4/3] bg-surface border-border relative flex items-center justify-center">
            {service.image_url ? (
               <img src={getImageUrl(service.image_url) || ''} alt={service.name} className="w-full h-full object-cover" />
            ) : (
               <span className="text-zinc-600 text-xs font-medium">Sem foto</span>
            )}
          </div>
          <div className="p-3 flex flex-col flex-1">
            <h3 className="font-bold text-white text-sm line-clamp-1">{service.name}</h3>
            {service.description && <p className="text-gray-400 text-[10px] mt-0.5 line-clamp-2">{service.description}</p>}
            
            <div className="mt-auto pt-3 flex items-center justify-between">
              <div className="flex items-center gap-1 text-zinc-500 text-xs font-medium bg-surface border-border w-fit px-1.5 py-0.5 rounded-md">
                <ClockIcon className="w-3 h-3" />
                <span>{service.duration_minutes} min</span>
              </div>
              <span className="text-electric font-bold text-sm">
                R$ {service.price.toFixed(0)}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function StepDateTime({ flow, slots, loading, onSelectDate, onSelectTime }: { flow: BookingFlowState; slots: { time: string; available: boolean }[]; loading: boolean; onSelectDate: (d: string) => void; onSelectTime: (t: string) => void }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  const renderDays = () => {
    const blanks = Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`blank-${i}`} className="p-2" />);
    const days = Array.from({ length: daysInMonth }).map((_, i) => {
      const day = i + 1;
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isPast = date < today;
      const isToday = date.getTime() === today.getTime();
      
      const dateString = date.toISOString().split('T')[0];
      const isSelected = flow.date === dateString;

      return (
        <button
          key={day}
          disabled={isPast}
          onClick={() => onSelectDate(dateString)}
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
          <span className="text-lg">{day}</span>
          {isToday && !isSelected && <span className="w-1 h-1 bg-electric rounded-full mt-0.5" />}
        </button>
      );
    });
    return [...blanks, ...days];
  };

  // Turnos para horários
  const morning = slots.filter(s => parseInt(s.time.split(':')[0]) < 12);
  const afternoon = slots.filter(s => parseInt(s.time.split(':')[0]) >= 12 && parseInt(s.time.split(':')[0]) < 18);
  const evening = slots.filter(s => parseInt(s.time.split(':')[0]) >= 18);

  const TimeGrid = ({ items, label }: { items: typeof slots; label: string }) => {
    if (items.length === 0) return null;
    return (
      <div className="mb-6">
        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-3 ml-1">{label}</h4>
        <div className="grid grid-cols-3 gap-2">
          {items.map(slot => (
            <button
              key={slot.time}
              onClick={() => slot.available && onSelectTime(slot.time)}
              disabled={!slot.available}
              className={`py-3.5 rounded-xl font-bold text-sm transition-all ${
                slot.available
                  ? 'bg-dark border border-white/5 text-white hover:border-electric hover:text-electric active:scale-95 shadow-sm'
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
    <div className="pb-8 space-y-6">
      {/* Calendário */}
      <div className="bg-dark border border-white/5 rounded-3xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-6 px-2">
          <button onClick={prevMonth} className="p-2 hover:bg-surface border-border rounded-full transition-colors text-white">
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h3 className="text-white font-bold text-lg capitalize tracking-wide">
            {currentMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={nextMonth} className="p-2 hover:bg-surface border-border rounded-full transition-colors text-white">
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[10px] font-black text-zinc-500 uppercase tracking-widest pb-2">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {renderDays()}
        </div>
      </div>

      {/* Horários */}
      <AnimatePresence>
        {flow.date && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="pt-2"
          >
            <h3 className="text-white font-bold text-lg mb-4 ml-1">Horários Disponíveis</h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-electric border-t-transparent rounded-full animate-spin" />
              </div>
            ) : slots.length === 0 ? (
              <div className="bg-dark border border-white/5 rounded-2xl text-center p-8 text-zinc-500 font-medium">
                Nenhum horário disponível para esta data.
              </div>
            ) : (
              <div>
                <TimeGrid items={morning} label="Manhã" />
                <TimeGrid items={afternoon} label="Tarde" />
                <TimeGrid items={evening} label="Noite" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StepPayment({ flow, loading, onConfirm }: { flow: BookingFlowState; loading: boolean; onConfirm: (m: PaymentMethod, couponId?: string, finalPrice?: number) => void }) {
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [coupon, setCoupon] = useState<{ id: string; discount_type: string; discount_value: number; code: string } | null>(null);
  const [couponError, setCouponError] = useState('');

  const paymentOptions: { method: PaymentMethod; label: string; icon: string; desc: string }[] = [
    { method: 'pix', label: 'PIX', icon: '⚡', desc: 'Confirmação imediata pelo app' },
    { method: 'on_site', label: 'Pagar na Barbearia', icon: '💰', desc: 'Dinheiro, Cartão ou Pix no local' },
  ];

  const applyCoupon = async () => {
    if (!couponCode) return;
    setValidatingCoupon(true);
    setCouponError('');
    
    // Buscar cupom
    const { data: c, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', couponCode.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error || !c) {
      setCouponError('Cupom inválido ou não encontrado.');
      setValidatingCoupon(false);
      return;
    }

    // Verificar regras
    if (c.valid_until && new Date(c.valid_until) < new Date()) {
      setCouponError('Este cupom já expirou.');
      setValidatingCoupon(false);
      return;
    }

    if (c.barber_id && c.barber_id !== flow.barber?.id) {
      setCouponError('Cupom válido apenas para outro barbeiro.');
      setValidatingCoupon(false);
      return;
    }

    // Se houver validação de cliente ou tier, podemos fazer aqui.
    // Para simplificar, vamos assumir que tá OK se chegou até aqui.
    setCoupon(c);
    setCouponCode('');
    setValidatingCoupon(false);
  };

  const originalPrice = flow.service?.price || 0;
  let discountAmount = 0;
  if (coupon) {
    if (coupon.discount_type === 'percent') {
      discountAmount = originalPrice * (coupon.discount_value / 100);
    } else {
      discountAmount = coupon.discount_value;
    }
  }
  const finalPrice = Math.max(0, originalPrice - discountAmount);

  return (
    <div className="space-y-6 pb-8">
      <div className="bg-dark rounded-3xl p-5 border border-white/5">
        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
          <CheckCircleIcon className="w-5 h-5 text-electric" /> Resumo do Agendamento
        </h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between items-center bg-dark/50 p-3 rounded-xl">
            <span className="text-gray-400">Barbeiro</span>
            <span className="text-white font-medium">{flow.barber?.display_name}</span>
          </div>
          <div className="flex justify-between items-center bg-dark/50 p-3 rounded-xl">
            <span className="text-gray-400">Serviço</span>
            <span className="text-white font-medium">{flow.service?.name}</span>
          </div>
          <div className="flex justify-between items-center bg-dark/50 p-3 rounded-xl">
            <span className="text-gray-400">Data e Hora</span>
            <span className="text-electric font-bold bg-electric/10 text-electric px-2 py-1 rounded-lg">
              {flow.date?.split('-').reverse().join('/')} às {flow.time}
            </span>
          </div>
          
          <div className="h-px bg-white/10 my-4" />
          
          <div className="flex flex-col gap-2 bg-dark/30 p-4 rounded-xl border border-white/5">
            {!coupon ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Cupom de desconto"
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value)}
                  className="flex-1 bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-electric outline-none uppercase"
                />
                <button 
                  onClick={applyCoupon}
                  disabled={validatingCoupon || !couponCode}
                  className="bg-surface border-border text-white px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-electric hover:text-black transition-colors"
                >
                  {validatingCoupon ? '...' : 'Aplicar'}
                </button>
              </div>
            ) : (
              <div className="flex justify-between items-center bg-electric/10 text-electric border border-electric/30 p-3 rounded-xl">
                <div>
                  <span className="text-electric font-bold text-sm block">Cupom: {coupon.code}</span>
                  <span className="text-zinc-400 text-xs">- {coupon.discount_type === 'percent' ? `${coupon.discount_value}%` : `R$ ${coupon.discount_value}`}</span>
                </div>
                <button onClick={() => setCoupon(null)} className="text-red-400 text-xs font-bold px-2 py-1 bg-red-400/10 rounded-lg">Remover</button>
              </div>
            )}
            {couponError && <p className="text-red-400 text-xs mt-1">{couponError}</p>}
          </div>

          <div className="flex justify-between items-end mt-4">
            <span className="text-gray-400 font-semibold">Total a pagar</span>
            <div className="text-right">
              {coupon && (
                <span className="text-zinc-500 text-sm line-through block mb-1">
                  R$ {originalPrice.toFixed(2).replace('.', ',')}
                </span>
              )}
              <span className="text-electric font-black text-2xl">
                R$ {finalPrice.toFixed(2).replace('.', ',')}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-zinc-400 ml-1">Como prefere pagar?</h4>
        {paymentOptions.map(opt => (
          <button
            key={opt.method}
            onClick={() => onConfirm(opt.method, coupon?.id, finalPrice)}
            disabled={loading}
            className="w-full bg-dark border border-white/5 rounded-2xl p-4 text-left hover:border-electric/40 transition-all active:scale-95 disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-dark rounded-xl flex items-center justify-center text-xl">
                {opt.icon}
              </div>
              <div>
                <div className="text-white font-bold text-base">{opt.label}</div>
                <div className="text-gray-400 text-xs mt-0.5">{opt.desc}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-4 gap-2 text-electric font-medium">
          <div className="w-5 h-5 border-2 border-electric border-t-transparent rounded-full animate-spin" />
          Confirmando...
        </div>
      )}
    </div>
  );
}
