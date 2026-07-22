'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import {
  PencilSquareIcon, TrashIcon, PlusIcon, XMarkIcon,
  ArrowPathIcon, ChevronRightIcon, PhotoIcon
} from '@heroicons/react/24/outline';
import { CheckIcon, StarIcon } from '@heroicons/react/24/solid';

interface Service { id: string; name: string; price: number; }
interface BarberService { service_id: string; custom_price: number | null; photos: string[]; service?: Service; }
interface Barber {
  id: string; display_name: string; specialties: string[]; experience_years: number;
  avatar_url: string | null; bio: string | null; is_active: boolean; rating: number;
  commission_percentage?: number; monthly_goal?: number; whatsapp?: string; status?: string;
  barber_services?: BarberService[];
  profile?: { avatar_url?: string };
}

const isMocked = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('SEU_PROJETO');

export default function ManageBarbers() {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<'list' | 'detail' | 'edit'>('list');
  const [selected, setSelected] = useState<Barber | null>(null);
  const [toast, setToast] = useState('');
  const [profiles, setProfiles] = useState<any[]>([]);
  const [form, setForm] = useState({ 
    display_name: '', specialties: '', experience_years: '', bio: '', is_active: true,
    commission_percentage: '50', monthly_goal: '5000', whatsapp: '', status: 'online', profile_id: ''
  });
  // Para gerenciar serviços do barbeiro selecionado
  const [barberServices, setBarberServices] = useState<BarberService[]>([]);
  const [addServiceId, setAddServiceId] = useState('');
  const [addPhotos, setAddPhotos] = useState('');
  const [addingService, setAddingService] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    if (isMocked()) {
      setBarbers([
        { id: '1', display_name: 'João Carlos', specialties: ['Degradê', 'Barba'], experience_years: 8, avatar_url: null, bio: 'Especialista em degradê', is_active: true, rating: 4.9 },
        { id: '2', display_name: 'Marcos Silva', specialties: ['Social', 'Navalhado'], experience_years: 5, avatar_url: null, bio: null, is_active: true, rating: 4.8 },
      ]);
      setAllServices([{ id: 's1', name: 'Corte Masculino', price: 35 }, { id: 's2', name: 'Degradê', price: 45 }, { id: 's3', name: 'Barba', price: 30 }]);
      setProfiles([{ id: 'mock-uuid', full_name: 'Usuario Teste' }]);
      setLoading(false); return;
    }
    const [barbersRes, servicesRes, profilesRes] = await Promise.all([
      supabase.from('barbers').select('*, profile:profiles(avatar_url), barber_services(service_id, custom_price, photos, service:services(id, name, price))').order('created_at', { ascending: false }),
      supabase.from('services').select('id, name, price').eq('is_active', true),
      supabase.from('profiles').select('id, full_name, role').order('full_name'),
    ]);
    setBarbers(barbersRes.data || []);
    setAllServices(servicesRes.data || []);
    setProfiles(profilesRes.data || []);
    setLoading(false);
  };

  const getImageUrl = (path: string | null | undefined, bucket: string = 'avatars') => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl;
  };

  const openDetail = (b: Barber) => {
    setSelected(b);
    setBarberServices(b.barber_services || []);
    setView('detail');
  };

  const openEdit = (b?: Barber) => {
    if (b) {
      setSelected(b);
      setForm({ 
        display_name: b.display_name, specialties: b.specialties.join(', '), experience_years: String(b.experience_years), bio: b.bio || '', is_active: b.is_active,
        commission_percentage: String(b.commission_percentage || 50), monthly_goal: String(b.monthly_goal || 5000), whatsapp: b.whatsapp || '', status: b.status || 'online', profile_id: (b as any).profile_id || ''
      });
    } else {
      setSelected(null);
      setForm({ display_name: '', specialties: '', experience_years: '', bio: '', is_active: true, commission_percentage: '50', monthly_goal: '5000', whatsapp: '', status: 'online', profile_id: '' });
    }
    setView('edit');
  };

  const save = async () => {
    if (!form.display_name.trim()) return;
    setSaving(true);
    const payload = {
      display_name: form.display_name,
      specialties: form.specialties.split(',').map(s => s.trim()).filter(Boolean),
      experience_years: Number(form.experience_years) || 0,
      bio: form.bio,
      is_active: form.is_active,
      commission_percentage: Number(form.commission_percentage) || 50,
      monthly_goal: Number(form.monthly_goal) || 5000,
      whatsapp: form.whatsapp,
      status: form.status,
      profile_id: form.profile_id || null,
    };
    if (isMocked()) {
      if (selected) setBarbers(p => p.map(b => b.id === selected.id ? { ...b, ...payload } : b));
      else setBarbers(p => [{ ...payload, id: Date.now().toString(), avatar_url: null, rating: 5.0 }, ...p]);
      setSaving(false); setView('list'); showToast(selected ? 'Barbeiro atualizado!' : 'Barbeiro criado!'); return;
    }
    if (selected) {
      await supabase.from('barbers').update(payload).eq('id', selected.id);
      if (payload.profile_id) {
        await supabase.from('profiles').update({ role: 'barber' }).eq('id', payload.profile_id);
      }
    } else {
      const { data: unit } = await supabase.from('units').select('id').limit(1).single();
      await supabase.from('barbers').insert({ ...payload, unit_id: unit?.id });
      if (payload.profile_id) {
        await supabase.from('profiles').update({ role: 'barber' }).eq('id', payload.profile_id);
      }
    }
    setSaving(false); setView('list'); showToast(selected ? 'Barbeiro atualizado!' : 'Barbeiro criado!'); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover este barbeiro?')) return;
    if (isMocked()) { setBarbers(p => p.filter(b => b.id !== id)); setView('list'); return; }
    await supabase.from('barbers').delete().eq('id', id);
    setBarbers(p => p.filter(b => b.id !== id)); setView('list');
  };

  const linkService = async () => {
    if (!addServiceId || !selected) return;
    setAddingService(true);
    const photos = addPhotos.split('\n').map(s => s.trim()).filter(Boolean);
    if (isMocked()) {
      const svc = allServices.find(s => s.id === addServiceId);
      setBarberServices(p => [...p, { service_id: addServiceId, custom_price: null, photos, service: svc }]);
      setAddServiceId(''); setAddPhotos(''); setAddingService(false); showToast('Serviço vinculado!'); return;
    }
    await supabase.from('barber_services').upsert({ barber_id: selected.id, service_id: addServiceId, photos }, { onConflict: 'barber_id,service_id' });
    setAddServiceId(''); setAddPhotos(''); setAddingService(false); showToast('Serviço vinculado!');
    const { data } = await supabase.from('barbers').select('*, barber_services(service_id, custom_price, photos, service:services(id, name, price))').eq('id', selected.id).single();
    if (data) { setSelected(data); setBarberServices(data.barber_services || []); }
  };

  const unlinkService = async (serviceId: string) => {
    if (!selected) return;
    if (isMocked()) { setBarberServices(p => p.filter(s => s.service_id !== serviceId)); return; }
    await supabase.from('barber_services').delete().eq('barber_id', selected.id).eq('service_id', serviceId);
    setBarberServices(p => p.filter(s => s.service_id !== serviceId));
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };
  const fmt = (n: number) => `R$ ${n.toFixed(2)}`;

  // ── DETAIL VIEW ───────────────────────────────────────────────
  if (view === 'detail' && selected) return (
    <div className="p-4 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => setView('list')} className="p-2 bg-surface border-border rounded-xl"><XMarkIcon className="w-5 h-5 text-zinc-400" /></button>
        <h2 className="text-lg font-bold text-white flex-1">{selected.display_name}</h2>
        <button onClick={() => openEdit(selected)} className="p-2 bg-surface border-border rounded-xl"><PencilSquareIcon className="w-5 h-5 text-zinc-400" /></button>
      </div>

      {/* Perfil */}
      <div className="bg-dark/60 rounded-2xl p-4 border border-white/5 space-y-3">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-electric/10 text-electric flex items-center justify-center text-electric font-bold text-2xl overflow-hidden">
            {getImageUrl(selected.profile?.avatar_url || selected.avatar_url) ? (
              <img src={getImageUrl(selected.profile?.avatar_url || selected.avatar_url)!} className="w-full h-full object-cover" alt={selected.display_name} />
            ) : selected.display_name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-white">{selected.display_name}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <StarIcon className="w-3.5 h-3.5 text-electric" />
              <span className="text-electric text-sm font-semibold">{selected.rating}</span>
              <span className="text-zinc-600 text-xs">• {selected.experience_years} anos de exp.</span>
            </div>
          </div>
        </div>
        {selected.bio && <p className="text-zinc-400 text-sm">{selected.bio}</p>}
        <div className="grid grid-cols-2 gap-2 text-sm text-zinc-400 bg-dark/40 p-3 rounded-xl">
          <div><span className="text-zinc-500">Comissão:</span> <span className="text-electric font-bold">{selected.commission_percentage}%</span></div>
          <div><span className="text-zinc-500">Meta:</span> <span className="text-white font-bold">{fmt(selected.monthly_goal || 0)}</span></div>
          <div className="col-span-2"><span className="text-zinc-500">Contato:</span> {selected.whatsapp || 'Não informado'}</div>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.specialties.map(s => <span key={s} className="text-xs text-electric bg-electric/10 text-electric px-2 py-0.5 rounded-md">{s}</span>)}
        </div>
      </div>

      {/* Serviços vinculados */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
          Serviços e Fotos
          <span className="text-xs text-zinc-600 font-normal">({barberServices.length})</span>
        </h3>
        <div className="space-y-3">
          {barberServices.map(bs => (
            <div key={bs.service_id} className="bg-dark/60 rounded-2xl border border-white/5 overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <p className="font-medium text-white text-sm">{bs.service?.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-electric text-sm font-bold">{fmt(bs.custom_price ?? bs.service?.price ?? 0)}</span>
                  <button onClick={() => unlinkService(bs.service_id)} className="p-1.5 bg-red-500/10 rounded-lg"><TrashIcon className="w-4 h-4 text-red-400" /></button>
                </div>
              </div>
              {bs.photos?.length > 0 && (
                <div className="flex gap-2 overflow-x-auto px-3 pb-3 scrollbar-hide">
                  {bs.photos.map((p, i) => (
                    <img key={i} src={getImageUrl(p, 'portfolio') || p} alt="Trabalho" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Adicionar serviço */}
        <div className="mt-4 bg-dark/40 rounded-2xl p-4 border border-dashed border-zinc-700 space-y-3">
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Vincular serviço</p>
          <select value={addServiceId} onChange={e => setAddServiceId(e.target.value)}
            className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-electric/50">
            <option value="">Selecione um serviço...</option>
            {allServices.filter(s => !barberServices.find(bs => bs.service_id === s.id)).map(s => (
              <option key={s.id} value={s.id}>{s.name} — {fmt(s.price)}</option>
            ))}
          </select>
          {addServiceId && (
            <>
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">URLs das fotos (uma por linha)</label>
                <textarea rows={3} value={addPhotos} onChange={e => setAddPhotos(e.target.value)} placeholder={"https://imagem1.jpg\nhttps://imagem2.jpg"}
                  className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 resize-none" />
              </div>
              <button onClick={linkService} disabled={addingService} className="w-full py-3 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold rounded-xl flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                {addingService ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                Vincular
              </button>
            </>
          )}
        </div>
      </div>

      <button onClick={() => remove(selected.id)} className="w-full py-3 bg-red-500/10 text-red-400 font-semibold rounded-xl text-sm border border-red-500/20">
        Remover Barbeiro
      </button>

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

  // ── EDIT VIEW ─────────────────────────────────────────────────
  if (view === 'edit') return (
    <div className="p-4 pb-8 space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => setView(selected ? 'detail' : 'list')} className="p-2 bg-surface border-border rounded-xl"><XMarkIcon className="w-5 h-5 text-zinc-400" /></button>
        <h2 className="text-lg font-bold text-white">{selected ? 'Editar Barbeiro' : 'Novo Barbeiro'}</h2>
      </div>
      <div className="space-y-4">
        {[
          { label: 'Nome de Exibição *', key: 'display_name', placeholder: 'Ex: João Carlos' },
          { label: 'Especialidades (vírgula)', key: 'specialties', placeholder: 'Degradê, Barba, Social' },
          { label: 'Anos de Experiência', key: 'experience_years', placeholder: '0', type: 'number' },
          { label: 'Comissão (%)', key: 'commission_percentage', placeholder: '50', type: 'number' },
          { label: 'Meta Mensal (R$)', key: 'monthly_goal', placeholder: '5000', type: 'number' },
          { label: 'WhatsApp', key: 'whatsapp', placeholder: '11999999999' },
          { label: 'Bio (opcional)', key: 'bio', placeholder: 'Breve descrição...' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">{f.label}</label>
            <input type={f.type || 'text'} placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 transition-colors" />
          </div>
        ))}
        
        {/* Vínculo de Usuário */}
        <div>
          <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">Vincular a Usuário do App (Opcional)</label>
          <select value={form.profile_id} onChange={e => setForm(p => ({ ...p, profile_id: e.target.value }))}
            className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-electric/50">
            <option value="">Nenhum usuário vinculado</option>
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.full_name} ({p.role})</option>
            ))}
          </select>
          <p className="text-xs text-zinc-600 mt-1">Ao vincular, o usuário ganhará acesso ao Painel do Barbeiro.</p>
        </div>

        <div className="flex items-center justify-between bg-dark/60 rounded-xl p-3 border border-border">
          <label className="text-sm text-zinc-400">Aceita agendamentos online</label>
          <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
            className={`w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-electric' : 'bg-zinc-700'} relative`}>
            <div className={`w-5 h-5 bg-white rounded-full mx-0.5 absolute top-0.5 transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
          </button>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => setView(selected ? 'detail' : 'list')} className="flex-1 py-3.5 bg-surface border-border text-white rounded-2xl font-semibold">Cancelar</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3.5 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── LIST VIEW ─────────────────────────────────────────────────
  return (
    <div className="p-4 pb-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Equipe</h2>
          <p className="text-zinc-500 text-sm">{barbers.length} barbeiro{barbers.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => openEdit()} className="flex items-center gap-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all text-sm font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform">
          <PlusIcon className="w-4 h-4" /> Novo
        </button>
      </div>
      {loading ? (
        <div className="flex justify-center pt-10"><div className="w-7 h-7 border-2 border-electric border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {barbers.map(b => (
            <motion.button key={b.id} onClick={() => openDetail(b)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="w-full bg-dark/60 rounded-2xl p-4 border border-white/5 flex items-center gap-4 text-left active:scale-[0.99] transition-transform">
              <div className="w-12 h-12 rounded-full bg-electric/10 text-electric flex items-center justify-center flex-shrink-0 text-electric font-bold text-lg overflow-hidden">
                {getImageUrl(b.profile?.avatar_url || b.avatar_url) ? (
                  <img src={getImageUrl(b.profile?.avatar_url || b.avatar_url)!} className="w-full h-full object-cover" alt={b.display_name} />
                ) : b.display_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">{b.display_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <StarIcon className="w-3 h-3 text-electric" />
                  <span className="text-electric text-xs">{b.rating}</span>
                  <span className="text-zinc-600 text-xs">• {(b.barber_services || []).length} serviços</span>
                </div>
              </div>
              <ChevronRightIcon className="w-4 h-4 text-zinc-600 flex-shrink-0" />
            </motion.button>
          ))}
          {barbers.length === 0 && <p className="text-center text-zinc-600 py-10">Nenhum barbeiro cadastrado</p>}
        </div>
      )}
    </div>
  );
}
