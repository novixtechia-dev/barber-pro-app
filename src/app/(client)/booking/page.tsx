'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ShieldCheckIcon, StarIcon } from '@heroicons/react/24/solid';
import { ScissorsIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import { QuickBookSheet } from '@/components/booking/QuickBookSheet';
import { getAvailableSlots } from '@/services/booking.service';
import { TimeSlot } from '@/types';

const isMocked = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('SEU_PROJETO');

export default function BookingPage() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickBookBarber, setQuickBookBarber] = useState<any>(null);
  const [initialDate, setInitialDate] = useState<string | null>(null);
  const [initialTime, setInitialTime] = useState<string | null>(null);

  useEffect(() => {
    if (isMocked()) return;
    const loadBarbers = async () => {
      const { data } = await supabase
        .from('barbers')
        .select('*, profile:profiles(avatar_url, phone)')
        .eq('is_active', true)
        .neq('display_name', 'Novo Barbeiro')
        .order('display_name', { ascending: true });
      
      if (data) setBarbers(data);
      setLoading(false);
    };
    loadBarbers();
  }, []);

  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl;
  };

  const startQuickBook = (barber: any, date: string, time: string) => {
    setInitialDate(date);
    setInitialTime(time);
    setQuickBookBarber(barber);
  };

  const BarberCardWithSlots = ({ barber, index }: { barber: any; index: number }) => {
    const [slots, setSlots] = useState<TimeSlot[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(true);
    const todayStr = new Date().toLocaleDateString('en-CA');

    useEffect(() => {
      getAvailableSlots(barber.id, todayStr, 15).then(res => {
        setSlots(res.filter(s => s.available));
        setLoadingSlots(false);
      });
    }, [barber.id, todayStr]);

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="w-full max-w-[320px] mx-auto flex flex-col gap-3"
      >
        <div 
          onClick={() => {
            setInitialDate(null);
            setInitialTime(null);
            setQuickBookBarber(barber);
          }}
          className="relative aspect-[3/4] rounded-[2rem] overflow-hidden group cursor-pointer"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-2 border-electric/30 rounded-[2rem] shadow-[0_0_30px_rgba(251,191,36,0.1)] group-hover:border-electric/80 group-hover:shadow-[0_0_40px_rgba(251,191,36,0.2)] transition-all duration-500" />
          
          {/* Pattern */}
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:10px_10px]" />

          {/* Top Stats */}
          <div className="absolute top-6 left-6 z-20 flex flex-col items-center">
            <span className="text-3xl font-black text-electric drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              99
            </span>
            <span className="text-[10px] font-black uppercase text-electric/80 tracking-widest">
              OVR
            </span>
            <div className="w-8 h-[1px] bg-electric/30 my-2" />
            <ScissorsIcon className="w-5 h-5 text-zinc-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
          </div>

          {/* Photo Area */}
          <div className="absolute top-0 inset-x-0 h-[65%] flex items-end justify-center pointer-events-none">
            {getImageUrl(barber.profile?.avatar_url) ? (
              <img 
                src={getImageUrl(barber.profile?.avatar_url)!} 
                alt={barber.display_name} 
                className="h-full object-cover object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                style={{ maskImage: 'linear-gradient(to top, transparent 0%, black 20%)', WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 20%)' }}
              />
            ) : (
              <div className="w-40 h-40 mb-10 rounded-full bg-surface border-border/50 flex items-center justify-center border-4 border-electric/30 shadow-2xl">
                <UserIcon className="w-20 h-20 text-zinc-600" />
              </div>
            )}
          </div>

          {/* Content Bottom Area */}
          <div className="absolute bottom-0 inset-x-0 h-[45%] bg-gradient-to-t from-black via-zinc-950/95 to-transparent flex flex-col items-center justify-end pb-6 px-6 z-20">
            <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-md text-center">
              {barber.display_name}
            </h2>
            <div className="flex items-center gap-4 text-[10px] font-black text-electric uppercase tracking-widest mb-4">
              <div className="flex items-center gap-1">
                <StarIcon className="w-3.5 h-3.5" />
                <span>5.0</span>
              </div>
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              <div className="flex items-center gap-1">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                <span>VERIFICADO</span>
              </div>
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              <span>MASTER</span>
            </div>
            <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-electric/30 to-transparent mb-5" />
          </div>
        </div>

        {/* Slots Area */}
        <div className="bg-dark/50 rounded-2xl p-4 border border-white/5">
          <h3 className="text-zinc-400 text-xs font-bold tracking-widest uppercase mb-3 flex items-center gap-1.5">
            <ClockIcon className="w-4 h-4 text-electric" /> Vagas Hoje
          </h3>
          {loadingSlots ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-5 h-5 border-2 border-electric border-t-transparent rounded-full animate-spin" />
            </div>
          ) : slots.length === 0 ? (
            <p className="text-zinc-600 text-xs text-center py-2">Sem vagas para hoje</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 px-1 pb-1">
              {slots.map((slot, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    startQuickBook(barber, todayStr, slot.time);
                  }}
                  className="bg-dark border border-white/10 hover:border-electric text-white font-bold py-2 rounded-xl text-sm transition-colors text-center"
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex flex-col pb-24 gap-6 min-h-screen pt-6 px-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">Agendar Horário</h1>
        <p className="text-zinc-400 text-sm">Selecione seu barbeiro preferido para agendar.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-electric border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {barbers.map((b, i) => (
            <BarberCardWithSlots key={b.id} barber={b} index={i} />
          ))}
        </div>
      )}

      {/* QuickBook Modal */}
      <QuickBookSheet 
        barber={quickBookBarber} 
        initialDate={initialDate}
        initialTime={initialTime}
        onClose={() => { 
          setQuickBookBarber(null);
          setInitialDate(null);
          setInitialTime(null);
        }} 
      />
    </div>
  );
}
