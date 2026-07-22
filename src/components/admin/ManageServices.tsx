'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { PencilSquareIcon, TrashIcon, PlusIcon, XMarkIcon, ArrowPathIcon, ClockIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  image_url: string | null;
  barber_id?: string | null;
  barber?: { display_name: string } | null;
}

const MOCK: Service[] = [
  { id: '1', name: 'Corte Masculino', description: null, duration_minutes: 30, price: 35, is_active: true, image_url: null },
  { id: '2', name: 'Degradê', description: null, duration_minutes: 40, price: 45, is_active: true, image_url: null },
  { id: '3', name: 'Corte + Barba', description: null, duration_minutes: 50, price: 55, is_active: true, image_url: null },
  { id: '4', name: 'Navalhado', description: null, duration_minutes: 45, price: 50, is_active: true, image_url: null },
];

const isMocked = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('SEU_PROJETO');
const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export default function ManageServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ name: '', description: '', duration_minutes: '', price: '', is_active: true, image_url: '' as string | null });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    if (isMocked()) { setServices(MOCK); setLoading(false); return; }
    const { data } = await supabase.from('services').select('*, barber:barbers(display_name)').order('created_at', { ascending: false });
    setServices(data || []);
    setLoading(false);
  };

  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('uploads').getPublicUrl(path);
    return data?.publicUrl;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isMocked()) {
      setForm(p => ({ ...p, image_url: URL.createObjectURL(file) }));
      return;
    }

    setUploadingImage(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from('uploads').upload(`services/${filePath}`, file);

    if (uploadError) {
      console.error(uploadError);
      showToast('Erro ao enviar imagem');
    } else {
      setForm(p => ({ ...p, image_url: `services/${filePath}` }));
    }
    setUploadingImage(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ name: '', description: '', duration_minutes: '', price: '', is_active: true, image_url: null });
    setIsOpen(true);
  };

  const openEdit = (s: Service) => {
    setEditingId(s.id);
    setForm({ name: s.name, description: s.description || '', duration_minutes: String(s.duration_minutes), price: String(s.price), is_active: s.is_active, image_url: s.image_url });
    setIsOpen(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.price) return;
    setSaving(true);
    const payload = { 
      name: form.name, 
      description: form.description, 
      duration_minutes: Number(form.duration_minutes) || 30, 
      price: Number(form.price), 
      is_active: form.is_active,
      image_url: form.image_url
    };

    if (isMocked()) {
      if (editingId) setServices(p => p.map(s => s.id === editingId ? { ...s, ...payload } : s));
      else setServices(p => [{ ...payload, id: Date.now().toString() }, ...p]);
      setSaving(false); setIsOpen(false); showToast(editingId ? 'Serviço atualizado!' : 'Serviço criado!'); return;
    }

    if (editingId) await supabase.from('services').update(payload).eq('id', editingId);
    else {
      const { data: unit } = await supabase.from('units').select('id').limit(1).single();
      await supabase.from('services').insert({ ...payload, unit_id: unit?.id, barber_id: null });
    }
    setSaving(false); setIsOpen(false); showToast(editingId ? 'Serviço atualizado!' : 'Serviço criado!'); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover este serviço?')) return;
    if (isMocked()) { setServices(p => p.filter(s => s.id !== id)); return; }
    
    const s = services.find(x => x.id === id);
    if (s?.image_url && s.image_url.startsWith('services/')) {
      await supabase.storage.from('uploads').remove([s.image_url]);
    }

    await supabase.from('services').delete().eq('id', id);
    setServices(p => p.filter(s => s.id !== id));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === services.length && services.length > 0) setSelectedIds([]);
    else setSelectedIds(services.map(s => s.id));
  };

  const removeSelected = async () => {
    if (!confirm(`Remover ${selectedIds.length} serviços selecionados?`)) return;
    
    if (isMocked()) {
      setServices(p => p.filter(s => !selectedIds.includes(s.id)));
      setSelectedIds([]);
      return;
    }

    const servicesToRemove = services.filter(s => selectedIds.includes(s.id));
    const imagesToRemove = servicesToRemove
      .filter(s => s.image_url && s.image_url.startsWith('services/'))
      .map(s => s.image_url as string);

    if (imagesToRemove.length > 0) {
      await supabase.storage.from('uploads').remove(imagesToRemove);
    }

    await supabase.from('services').delete().in('id', selectedIds);
    setServices(p => p.filter(s => !selectedIds.includes(s.id)));
    setSelectedIds([]);
    showToast(`${selectedIds.length} serviços removidos!`);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="p-4 pb-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Serviços</h2>
          <p className="text-zinc-500 text-sm">{services.length} serviço{services.length !== 1 ? 's' : ''} no catálogo</p>
        </div>
        <div className="flex items-center gap-3">
          <AnimatePresence>
            {selectedIds.length > 0 && (
              <motion.button 
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                onClick={removeSelected} 
                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
              >
                <TrashIcon className="w-4 h-4" /> Excluir ({selectedIds.length})
              </motion.button>
            )}
          </AnimatePresence>
          <button onClick={openNew} className="flex items-center gap-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all text-sm font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform">
            <PlusIcon className="w-4 h-4" /> Novo
          </button>
        </div>
      </div>

      {!loading && services.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2 bg-dark/40 rounded-xl border border-white/5">
          <button onClick={toggleAll} className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedIds.length === services.length ? 'bg-electric border-electric' : 'border-zinc-600 bg-dark/50'}`}>
            {selectedIds.length === services.length && <CheckIcon className="w-3.5 h-3.5 text-black" />}
          </button>
          <span className="text-sm text-zinc-400">Selecionar Todos</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center pt-10"><div className="w-7 h-7 border-2 border-electric border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {services.map(s => (
            <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl p-4 border flex items-center gap-4 transition-colors ${selectedIds.includes(s.id) ? 'bg-electric/5 border-electric/30' : 'bg-dark/60 border-white/5'}`}>
              
              <button onClick={() => toggleSelection(s.id)} className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border transition-colors ${selectedIds.includes(s.id) ? 'bg-electric border-electric' : 'border-zinc-600 bg-dark/50'}`}>
                {selectedIds.includes(s.id) && <CheckIcon className="w-3.5 h-3.5 text-black" />}
              </button>

              <div className="w-16 h-16 rounded-xl bg-electric/10 text-electric flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/5">
                {s.image_url ? (
                  <img src={getImageUrl(s.image_url) || ''} alt={s.name} className="w-full h-full object-cover" />
                ) : (
                  <PhotoIcon className="w-6 h-6 text-electric/50" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{s.name}</p>
                {s.barber_id && <p className="text-[10px] text-electric font-bold uppercase tracking-widest mt-0.5">De: {s.barber?.display_name || 'Barbeiro'}</p>}
                {s.description && <p className="text-zinc-500 text-xs truncate max-w-xs">{s.description}</p>}
                <div className="flex items-center gap-2 mt-1">
                  <ClockIcon className="w-3 h-3 text-zinc-600" />
                  <span className="text-zinc-500 text-xs">{s.duration_minutes} min</span>
                  {!s.is_active && <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">Inativo</span>}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <span className="text-electric font-bold">{fmt(s.price)}</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(s)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                    <PencilSquareIcon className="w-4 h-4 text-zinc-400" />
                  </button>
                  <button onClick={() => remove(s.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors">
                    <TrashIcon className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {services.length === 0 && <p className="text-center text-zinc-600 py-10">Nenhum serviço cadastrado</p>}
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark/80 backdrop-blur-sm flex items-end justify-center p-4 z-50">
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="bg-dark w-full max-w-md rounded-3xl border border-border overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <h3 className="font-bold text-white">{editingId ? 'Editar Serviço' : 'Novo Serviço'}</h3>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-surface border-border rounded-lg"><XMarkIcon className="w-5 h-5 text-zinc-400" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-24 h-24 rounded-2xl bg-dark border border-border flex items-center justify-center overflow-hidden relative group">
                    {form.image_url ? (
                      <>
                        <img src={getImageUrl(form.image_url) || ''} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-dark/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <PencilSquareIcon className="w-6 h-6 text-white" />
                        </div>
                      </>
                    ) : (
                      <PhotoIcon className="w-8 h-8 text-zinc-600 group-hover:text-electric transition-colors" />
                    )}
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                    {uploadingImage && (
                      <div className="absolute inset-0 bg-dark/70 flex items-center justify-center">
                        <ArrowPathIcon className="w-5 h-5 text-electric animate-spin" />
                      </div>
                    )}
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} type="button" className="text-xs text-electric font-medium hover:underline">
                    {form.image_url ? 'Trocar Imagem' : 'Adicionar Imagem'}
                  </button>
                  <input
                    type="url"
                    placeholder="Ou cole um link de imagem (http...)"
                    value={form.image_url && form.image_url.startsWith('http') ? form.image_url : ''}
                    onChange={e => setForm(p => ({ ...p, image_url: e.target.value }))}
                    className="w-full max-w-[200px] text-center bg-transparent border-b border-border text-xs text-zinc-400 focus:outline-none focus:border-electric/50 pb-1"
                  />
                </div>

                {[
                  { label: 'Nome do Serviço *', key: 'name', placeholder: 'Ex: Corte Degradê' },
                  { label: 'Descrição (opcional)', key: 'description', placeholder: 'Breve descrição...' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">{f.label}</label>
                    <input placeholder={f.placeholder} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 transition-colors" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">Preço (R$) *</label>
                    <input type="number" placeholder="45.00" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
                      className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">Duração (min)</label>
                    <input type="number" placeholder="30" value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))}
                      className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 transition-colors" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-zinc-400">Ativo no catálogo</label>
                  <button onClick={() => setForm(p => ({ ...p, is_active: !p.is_active }))}
                    className={`w-12 h-6 rounded-full transition-colors ${form.is_active ? 'bg-electric' : 'bg-zinc-700'}`}>
                    <div className={`w-5 h-5 bg-white rounded-full mx-0.5 transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
              <div className="p-5 pt-0 flex gap-3">
                <button onClick={() => setIsOpen(false)} className="flex-1 py-3 bg-surface border-border text-white rounded-xl font-semibold text-sm">Cancelar</button>
                <button onClick={save} disabled={saving} className="flex-1 py-3 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                  {saving ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
