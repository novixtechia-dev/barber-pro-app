'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { CheckIcon, ArrowPathIcon } from '@heroicons/react/24/solid';

const WEEK_DAYS = [
  { id: 0, label: 'Domingo' },
  { id: 1, label: 'Segunda-feira' },
  { id: 2, label: 'Terça-feira' },
  { id: 3, label: 'Quarta-feira' },
  { id: 4, label: 'Quinta-feira' },
  { id: 5, label: 'Sexta-feira' },
  { id: 6, label: 'Sábado' },
];

interface Barber {
  id: string;
  display_name: string;
}

interface Schedule {
  day_of_week: number;
  starts_at: string;
  ends_at: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

export default function ManageSchedules() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [selectedBarberId, setSelectedBarberId] = useState<string>('');
  const [scheduleConfig, setScheduleConfig] = useState({
    starts_at: '09:00',
    ends_at: '19:00',
    slot_duration_minutes: 30,
    active_days: [1, 2, 3, 4, 5, 6] as number[]
  });
  const [timeOffs, setTimeOffs] = useState<{id?: string, off_date: string, reason: string}[]>([]);
  const [newTimeOffDate, setNewTimeOffDate] = useState('');
  const [newTimeOffReason, setNewTimeOffReason] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { loadBarbers(); }, []);
  useEffect(() => {
    if (selectedBarberId) {
      loadSchedules(selectedBarberId);
    } else {
      setScheduleConfig({ starts_at: '09:00', ends_at: '19:00', slot_duration_minutes: 30, active_days: [] });
      setTimeOffs([]);
    }
  }, [selectedBarberId]);

  const loadBarbers = async () => {
    setLoading(true);
    const { data } = await supabase.from('barbers').select('id, display_name').eq('is_active', true);
    setBarbers(data || []);
    setLoading(false);
  };

  const loadSchedules = async (barberId: string) => {
    setLoading(true);
    // Load active days
    const { data: schedData } = await supabase.from('barber_schedules').select('*').eq('barber_id', barberId);
    
    if (schedData && schedData.length > 0) {
      const activeDays = schedData.filter(s => s.is_active).map(s => s.day_of_week);
      const sample = schedData.find(s => s.is_active) || schedData[0];
      setScheduleConfig({
        starts_at: sample.starts_at.substring(0, 5),
        ends_at: sample.ends_at.substring(0, 5),
        slot_duration_minutes: sample.slot_duration_minutes || 30,
        active_days: activeDays
      });
    } else {
      setScheduleConfig({ starts_at: '09:00', ends_at: '19:00', slot_duration_minutes: 30, active_days: [1, 2, 3, 4, 5, 6] });
    }

    // Load time offs
    const { data: offData } = await supabase.from('barber_time_offs').select('*').eq('barber_id', barberId).order('off_date');
    setTimeOffs(offData || []);
    setLoading(false);
  };

  const toggleDay = (dayId: number) => {
    setScheduleConfig(prev => {
      const active = prev.active_days.includes(dayId);
      return {
        ...prev,
        active_days: active ? prev.active_days.filter(d => d !== dayId) : [...prev.active_days, dayId]
      };
    });
  };

  const addTimeOff = async () => {
    if (!newTimeOffDate || !selectedBarberId) return;
    try {
      const { data, error } = await supabase.from('barber_time_offs').insert({
        barber_id: selectedBarberId,
        off_date: newTimeOffDate,
        reason: newTimeOffReason
      }).select().single();
      if (error) throw error;
      setTimeOffs(p => [...p, data]);
      setNewTimeOffDate('');
      setNewTimeOffReason('');
      showToast('Folga adicionada!');
    } catch(err) {
      alert('Erro ao adicionar folga.');
    }
  };

  const removeTimeOff = async (id: string) => {
    try {
      await supabase.from('barber_time_offs').delete().eq('id', id);
      setTimeOffs(p => p.filter(t => t.id !== id));
      showToast('Folga removida!');
    } catch(err) {}
  };

  const save = async () => {
    if (!selectedBarberId) return;
    setSaving(true);
    
    const payload = WEEK_DAYS.map(day => ({
      barber_id: selectedBarberId,
      day_of_week: day.id,
      starts_at: scheduleConfig.starts_at,
      ends_at: scheduleConfig.ends_at,
      slot_duration_minutes: scheduleConfig.slot_duration_minutes,
      is_active: scheduleConfig.active_days.includes(day.id)
    }));

    try {
      const { error } = await supabase.from('barber_schedules').upsert(payload, { onConflict: 'barber_id,day_of_week' });
      if (error) throw error;
      showToast('Horários salvos com sucesso!');
    } catch (err: any) {
      alert('Erro ao salvar horários: ' + err.message);
    }
    setSaving(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  if (loading && barbers.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 space-y-6">
      
      {/* Selecionar Barbeiro */}
      <div className="bg-dark border border-white/5 p-4 rounded-2xl space-y-3">
        <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider block">Selecione o Barbeiro</label>
        <select 
          value={selectedBarberId} 
          onChange={e => setSelectedBarberId(e.target.value)}
          className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-electric/50"
        >
          <option value="">Escolha um barbeiro...</option>
          {barbers.map(b => (
            <option key={b.id} value={b.id}>{b.display_name}</option>
          ))}
        </select>
        {barbers.length === 0 && (
          <p className="text-red-400 text-xs">Nenhum barbeiro ativo encontrado. Vá na aba "Barbeiros" ou "Visão Geral" para gerar dados.</p>
        )}
      </div>

      {/* Grade de Horários */}
      {selectedBarberId && (
        <div className="space-y-6">
          <div className="bg-dark border border-white/5 rounded-2xl p-5 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Horário de Trabalho Padrão</h2>
              <p className="text-sm text-zinc-500">Defina a jornada diária e intervalo de tempo.</p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block mb-1">Início</label>
                <input type="time" value={scheduleConfig.starts_at} onChange={e => setScheduleConfig(p => ({ ...p, starts_at: e.target.value }))} className="w-full bg-dark border border-border rounded-xl px-3 py-2 text-white text-sm focus:border-electric focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block mb-1">Fim</label>
                <input type="time" value={scheduleConfig.ends_at} onChange={e => setScheduleConfig(p => ({ ...p, ends_at: e.target.value }))} className="w-full bg-dark border border-border rounded-xl px-3 py-2 text-white text-sm focus:border-electric focus:outline-none" />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block mb-1">Intervalo (min)</label>
                <input type="number" value={scheduleConfig.slot_duration_minutes} onChange={e => setScheduleConfig(p => ({ ...p, slot_duration_minutes: Number(e.target.value) }))} className="w-full bg-dark border border-border rounded-xl px-3 py-2 text-white text-sm focus:border-electric focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block mb-3">Dias de Atendimento</label>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map(day => {
                  const active = scheduleConfig.active_days.includes(day.id);
                  return (
                    <button key={day.id} onClick={() => toggleDay(day.id)} className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${active ? 'bg-electric/10 text-electric text-electric border-electric/30' : 'bg-dark text-zinc-500 border-border'}`}>
                      {day.label.split('-')[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={save} disabled={saving} className="w-full py-4 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50">
              {saving ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5" />}
              Salvar Configuração Padrão
            </button>
          </div>

          <div className="bg-dark border border-white/5 rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white mb-1">Folgas e Bloqueios</h2>
              <p className="text-sm text-zinc-500">Dias específicos em que o barbeiro não atende.</p>
            </div>
            
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block mb-1">Data</label>
                <input type="date" value={newTimeOffDate} onChange={e => setNewTimeOffDate(e.target.value)} className="w-full bg-dark border border-border rounded-xl px-3 py-2 text-white text-sm focus:border-electric focus:outline-none" />
              </div>
              <div className="flex-[2]">
                <label className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider block mb-1">Motivo (Opcional)</label>
                <input type="text" placeholder="Ex: Feriado, Férias" value={newTimeOffReason} onChange={e => setNewTimeOffReason(e.target.value)} className="w-full bg-dark border border-border rounded-xl px-3 py-2 text-white text-sm focus:border-electric focus:outline-none" />
              </div>
              <button onClick={addTimeOff} className="bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl px-4 py-2 text-sm transition-colors mb-[1px]">Adicionar</button>
            </div>

            {timeOffs.length > 0 && (
              <div className="mt-4 space-y-2">
                {timeOffs.map(off => (
                  <div key={off.id} className="flex items-center justify-between bg-dark p-3 rounded-xl border border-white/5">
                    <div>
                      <div className="text-white font-medium text-sm">{off.off_date.split('-').reverse().join('/')}</div>
                      {off.reason && <div className="text-xs text-zinc-500">{off.reason}</div>}
                    </div>
                    <button onClick={() => off.id && removeTimeOff(off.id)} className="text-red-400 text-xs font-bold hover:underline">Remover</button>
                  </div>
                ))}
              </div>
            )}
            {timeOffs.length === 0 && <p className="text-xs text-zinc-600 italic">Nenhuma data bloqueada.</p>}
          </div>

        </div>
      )}

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-28 left-1/2 -translate-x-1/2 bg-surface border-border text-white text-sm px-5 py-3 rounded-full border border-white/10 shadow-xl z-50">
            ✅ {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
