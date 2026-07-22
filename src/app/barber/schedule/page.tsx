'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { ClockIcon, CalendarIcon, CheckIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' }
];

export default function BarberSchedulePage() {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [barberId, setBarberId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const router = useRouter();

  useEffect(() => {
    if (profile) {
      loadSchedules();
    }
  }, [profile]);

  const loadSchedules = async () => {
    setLoading(true);
    // Find the barber record for this user
    const { data: barber } = await supabase
      .from('barbers')
      .select('id')
      .eq('profile_id', profile!.id)
      .single();

    if (barber) {
      setBarberId(barber.id);
      const { data } = await supabase
        .from('barber_schedules')
        .select('*')
        .eq('barber_id', barber.id);
      
      const loadedSchedules = data || [];
      
      // Initialize missing days
      const allDays = DAYS_OF_WEEK.map(day => {
        const existing = loadedSchedules.find(s => s.day_of_week === day.value);
        if (existing) return existing;
        return {
          barber_id: barber.id,
          day_of_week: day.value,
          starts_at: '09:00',
          ends_at: '18:00',
          slot_duration_minutes: 30,
          is_active: false
        };
      });

      setSchedules(allDays.sort((a, b) => a.day_of_week - b.day_of_week));
    }
    setLoading(false);
  };

  const handleUpdate = (index: number, field: string, value: any) => {
    const newSchedules = [...schedules];
    newSchedules[index] = { ...newSchedules[index], [field]: value };
    setSchedules(newSchedules);
  };

  const saveSchedules = async () => {
    if (!barberId) return;
    setSaving(true);
    
    // Upsert all schedules
    for (const schedule of schedules) {
      if (schedule.id) {
        await supabase
          .from('barber_schedules')
          .update({
            starts_at: schedule.starts_at,
            ends_at: schedule.ends_at,
            slot_duration_minutes: schedule.slot_duration_minutes,
            is_active: schedule.is_active
          })
          .eq('id', schedule.id);
      } else {
        await supabase
          .from('barber_schedules')
          .insert({
            barber_id: barberId,
            day_of_week: schedule.day_of_week,
            starts_at: schedule.starts_at,
            ends_at: schedule.ends_at,
            slot_duration_minutes: schedule.slot_duration_minutes,
            is_active: schedule.is_active
          });
      }
    }
    
    setSaving(false);
    setToast('Horários salvos com sucesso!');
    setTimeout(() => setToast(''), 3000);
    loadSchedules(); // Reload to get IDs
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <div className="w-8 h-8 border-4 border-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.back()} 
            className="p-2 -ml-2 bg-dark hover:bg-surface border-border rounded-full transition-colors flex-shrink-0"
          >
            <ArrowLeftIcon className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider leading-tight">
              Meus Horários
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1">
              Defina dias e horários de trabalho
            </p>
          </div>
        </div>
        <button
          onClick={saveSchedules}
          disabled={saving}
          className="w-full sm:w-auto bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all px-6 py-3.5 sm:py-3 rounded-xl font-black flex items-center justify-center gap-2 hover:brightness-110 transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : (
            <>
              <CheckIcon className="w-5 h-5" />
              Salvar
            </>
          )}
        </button>
      </div>

      <div className="space-y-4">
        {schedules.map((schedule, index) => {
          const dayName = DAYS_OF_WEEK.find(d => d.value === schedule.day_of_week)?.label;
          
          return (
            <div key={schedule.day_of_week} className={`bg-dark border ${schedule.is_active ? 'border-electric/50' : 'border-white/5'} rounded-2xl p-4 transition-colors`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleUpdate(index, 'is_active', !schedule.is_active)}
                    className={`w-12 h-6 rounded-full transition-colors relative ${schedule.is_active ? 'bg-electric' : 'bg-zinc-700'}`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full mx-0.5 absolute top-0.5 transition-transform ${schedule.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                  <span className={`font-bold ${schedule.is_active ? 'text-electric' : 'text-zinc-500'}`}>
                    {dayName}
                  </span>
                </div>
              </div>

              {schedule.is_active && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-white/5">
                  <div>
                    <label className="text-xs text-zinc-500 font-medium uppercase mb-1.5 block">Início</label>
                    <div className="relative">
                      <ClockIcon className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="time"
                        value={schedule.starts_at.substring(0, 5)}
                        onChange={e => handleUpdate(index, 'starts_at', e.target.value)}
                        className="w-full bg-dark border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-electric focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-medium uppercase mb-1.5 block">Fim</label>
                    <div className="relative">
                      <ClockIcon className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="time"
                        value={schedule.ends_at.substring(0, 5)}
                        onChange={e => handleUpdate(index, 'ends_at', e.target.value)}
                        className="w-full bg-dark border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white focus:border-electric focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-medium uppercase mb-1.5 block">Duração (min)</label>
                    <select
                      value={schedule.slot_duration_minutes}
                      onChange={e => handleUpdate(index, 'slot_duration_minutes', parseInt(e.target.value))}
                      className="w-full bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-electric focus:outline-none"
                    >
                      <option value={15}>15 minutos</option>
                      <option value={20}>20 minutos</option>
                      <option value={30}>30 minutos</option>
                      <option value={40}>40 minutos</option>
                      <option value={45}>45 minutos</option>
                      <option value={60}>1 hora</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-surface border-border text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 z-50 flex items-center gap-2"
          >
            <CheckIcon className="w-5 h-5 text-electric" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
