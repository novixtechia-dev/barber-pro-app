'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { PencilSquareIcon, TrashIcon, PlusIcon, XMarkIcon, ArrowPathIcon, BoltIcon } from '@heroicons/react/24/outline';
import { CheckIcon } from '@heroicons/react/24/solid';

interface Promotion {
  id: string;
  title: string;
  description: string | null;
  original_price: number | null;
  promotional_price: number;
  image_url: string | null;
  valid_until: string | null;
  is_active: boolean;
}

const MOCK: Promotion[] = [
  { id: '1', title: 'Corte + Barba', description: 'Combo especial', original_price: 80, promotional_price: 65, image_url: null, valid_until: null, is_active: true },
];

const isMocked = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('SEU_PROJETO');
const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export default function ManagePromotions() {
  const [promos, setPromos] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [form, setForm] = useState({ title: '', description: '', original_price: '', promotional_price: '', valid_until: '', is_active: true });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    if (isMocked()) { setPromos(MOCK); setLoading(false); return; }
    const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
    setPromos(data || []);
    setLoading(false);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ title: '', description: '', original_price: '', promotional_price: '', valid_until: '', is_active: true });
    setIsOpen(true);
  };

  const openEdit = (p: Promotion) => {
    setEditingId(p.id);
    setForm({ title: p.title, description: p.description || '', original_price: String(p.original_price || ''), promotional_price: String(p.promotional_price), valid_until: p.valid_until?.slice(0, 16) || '', is_active: p.is_active });
    setIsOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.promotional_price) return;
    setSaving(true);
    const payload = { title: form.title, description: form.description, original_price: form.original_price ? Number(form.original_price) : null, promotional_price: Number(form.promotional_price), valid_until: form.valid_until || null, is_active: form.is_active };

    if (isMocked()) {
      if (editingId) setPromos(p => p.map(x => x.id === editingId ? { ...x, ...payload, image_url: null } : x));
      else setPromos(p => [{ ...payload, id: Date.now().toString(), image_url: null }, ...p]);
      setSaving(false); setIsOpen(false); showToast(editingId ? 'Promoção atualizada!' : 'Promoção criada!'); return;
    }

    if (editingId) await supabase.from('promotions').update(payload).eq('id', editingId);
    else {
      const { data: unit } = await supabase.from('units').select('id').limit(1).single();
      await supabase.from('promotions').insert({ ...payload, unit_id: unit?.id });
    }
    setSaving(false); setIsOpen(false); showToast(editingId ? 'Promoção atualizada!' : 'Promoção criada!'); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remover promoção?')) return;
    if (isMocked()) { setPromos(p => p.filter(x => x.id !== id)); return; }
    await supabase.from('promotions').delete().eq('id', id);
    setPromos(p => p.filter(x => x.id !== id));
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  return (
    <div className="p-4 pb-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Promoções</h2>
          <p className="text-zinc-500 text-sm">{promos.length} promoção{promos.length !== 1 ? 'ões' : ''} ativa{promos.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all text-sm font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform">
          <PlusIcon className="w-4 h-4" /> Nova
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center pt-10"><div className="w-7 h-7 border-2 border-electric border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {promos.map(p => (
            <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-dark/60 rounded-2xl p-4 border border-white/5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-electric/10 text-electric flex items-center justify-center flex-shrink-0">
                <BoltIcon className="w-6 h-6 text-electric" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">{p.title}</p>
                {p.original_price && <p className="text-zinc-600 text-xs line-through">{fmt(p.original_price)}</p>}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-electric font-bold text-lg">{fmt(p.promotional_price)}</span>
                <button onClick={() => openEdit(p)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-colors">
                  <PencilSquareIcon className="w-4 h-4 text-zinc-400" />
                </button>
                <button onClick={() => remove(p.id)} className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition-colors">
                  <TrashIcon className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))}
          {promos.length === 0 && <p className="text-center text-zinc-600 py-10">Nenhuma promoção ativa</p>}
        </div>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-dark/80 backdrop-blur-sm flex items-end justify-center p-4 z-50">
            <motion.div initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
              className="bg-dark w-full max-w-md rounded-3xl border border-border overflow-hidden">
              <div className="flex items-center justify-between p-5 border-b border-border/50">
                <h3 className="font-bold text-white">{editingId ? 'Editar Promoção' : 'Nova Promoção'}</h3>
                <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-surface border-border rounded-lg"><XMarkIcon className="w-5 h-5 text-zinc-400" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">Título *</label>
                  <input placeholder="Ex: Combo Dia dos Pais" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 transition-colors" />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">Descrição</label>
                  <input placeholder="Descrição da promoção..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 transition-colors" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">Preço Original</label>
                    <input type="number" placeholder="80.00" value={form.original_price} onChange={e => setForm(p => ({ ...p, original_price: e.target.value }))}
                      className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 transition-colors" />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">Preço Promo *</label>
                    <input type="number" placeholder="65.00" value={form.promotional_price} onChange={e => setForm(p => ({ ...p, promotional_price: e.target.value }))}
                      className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 transition-colors" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-1.5 block">Válida até</label>
                  <input type="datetime-local" value={form.valid_until} onChange={e => setForm(p => ({ ...p, valid_until: e.target.value }))}
                    className="w-full bg-dark border border-border rounded-xl px-4 py-3 text-white text-sm placeholder-zinc-600 focus:outline-none focus:border-electric/50 transition-colors" />
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
