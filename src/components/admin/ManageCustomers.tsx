'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { UserIcon, PhoneIcon, CalendarDaysIcon, ClockIcon, ArrowLeftIcon, TicketIcon, TagIcon, PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

const fmtCurrency = (n: number) => `R$ ${Number(n).toFixed(2)}`;

const tiers = [
  { id: 'standard', label: 'Standard', color: 'text-zinc-400 bg-zinc-400/10' },
  { id: 'bronze', label: 'Bronze', color: 'text-orange-400 bg-orange-400/10' },
  { id: 'silver', label: 'Prata', color: 'text-gray-300 bg-gray-300/10' },
  { id: 'gold', label: 'Ouro', color: 'text-electric bg-electric/10' },
  { id: 'vip', label: 'VIP', color: 'text-purple-400 bg-purple-400/10' },
];

type ViewState = 'list' | 'detail';

export default function ManageCustomers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState<ViewState>('list');
  const [selected, setSelected] = useState<any>(null);
  
  // Detail State
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [toast, setToast] = useState('');
  const [tier, setTier] = useState('standard');
  const [savingTier, setSavingTier] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('customers_view').select('*').order('total_spent', { ascending: false });
    
    if (error) {
      console.warn('View customers_view not found, falling back to profiles', error);
      const { data: profs } = await supabase.from('profiles').select('*').eq('role', 'client');
      setCustomers(profs || []);
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  };

  const openDetail = async (c: any) => {
    setSelected(c);
    setTier(c.tier || 'standard');
    setView('detail');
    setLoadingDetail(true);

    const { data } = await supabase
      .from('bookings')
      .select('*, barber:barbers(display_name), service:services(name, price)')
      .eq('client_id', c.id)
      .order('scheduled_date', { ascending: false })
      .order('scheduled_time', { ascending: false });

    setBookings(data || []);
    setLoadingDetail(false);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const saveTier = async () => {
    if (!selected) return;
    setSavingTier(true);
    await supabase.from('profiles').update({ tier }).eq('id', selected.id);
    setSelected({ ...selected, tier });
    setCustomers(customers.map(c => c.id === selected.id ? { ...c, tier } : c));
    showToast('Nível atualizado!');
    setSavingTier(false);
  };

  const createCoupon = async () => {
    if (!couponCode || !discountValue || !selected) return;
    setCreatingCoupon(true);

    const { error } = await supabase.from('coupons').insert({
      code: couponCode.toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      client_id: selected.id
    });

    if (error) {
      alert('Erro ao criar cupom. Verifique se o código já existe.');
    } else {
      showToast('Cupom criado com sucesso!');
      setCouponCode('');
      setDiscountValue('');
    }
    setCreatingCoupon(false);
  };

  if (loading) return <div className="text-zinc-400 p-4 text-center">Carregando clientes...</div>;

  // ─── TELA DE DETALHES ──────────────────────────────────────────────────────────
  if (view === 'detail' && selected) {
    // Calculando preferências
    const barberCounts: Record<string, number> = {};
    const serviceCounts: Record<string, number> = {};
    bookings.forEach(b => {
      const bName = b.barber?.display_name;
      const sName = b.service?.name;
      if (bName) barberCounts[bName] = (barberCounts[bName] || 0) + 1;
      if (sName) serviceCounts[sName] = (serviceCounts[sName] || 0) + 1;
    });
    const topBarber = Object.keys(barberCounts).sort((a, b) => barberCounts[b] - barberCounts[a])[0];
    const topService = Object.keys(serviceCounts).sort((a, b) => serviceCounts[b] - serviceCounts[a])[0];

    return (
      <div className="p-4 max-w-5xl mx-auto space-y-6 pb-12">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => setView('list')} className="p-2 bg-surface border-border hover:bg-zinc-700 rounded-xl transition-colors">
            <ArrowLeftIcon className="w-5 h-5 text-zinc-400" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Detalhes do Cliente
              {selected.tier && (
                <span className={`text-xs px-2 py-0.5 rounded-md font-bold uppercase ${tiers.find(t => t.id === selected.tier)?.color || 'text-zinc-400 bg-zinc-400/10'}`}>
                  {selected.tier}
                </span>
              )}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Perfil e Nível */}
          <div className="bg-dark border border-white/5 rounded-3xl p-5 space-y-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-surface border-border border border-white/10 flex items-center justify-center overflow-hidden">
                {selected.avatar_url ? (
                  <img src={selected.avatar_url} className="w-full h-full object-cover" alt={selected.full_name} />
                ) : (
                  <UserIcon className="w-8 h-8 text-zinc-500" />
                )}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white">{selected.full_name}</h2>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-zinc-400 text-sm flex items-center gap-1">
                    <PhoneIcon className="w-4 h-4" /> {selected.phone || 'Sem telefone'}
                  </p>
                  {selected.phone && (
                    <a 
                      href={`https://wa.me/55${selected.phone.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold bg-green-500/20 text-green-400 px-2 py-1 rounded-md hover:bg-green-500/30 transition-colors"
                    >
                      WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5">
              <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2 block">Nível de Fidelidade</label>
              <div className="flex gap-2">
                <select value={tier} onChange={e => setTier(e.target.value)} className="flex-1 bg-dark border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:border-electric focus:outline-none">
                  {tiers.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <button onClick={saveTier} disabled={savingTier || tier === selected.tier} className="px-4 py-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold rounded-xl disabled:opacity-50 text-sm">
                  Salvar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-dark border border-white/5 rounded-2xl p-5">
                <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Cortes Realizados</p>
                <h3 className="text-white font-black text-2xl">{selected.cuts_count || selected.total_bookings || 0}</h3>
              </div>
              <div className="bg-dark border border-white/5 rounded-2xl p-5">
                <p className="text-zinc-500 text-xs font-bold uppercase mb-1">Total Gasto</p>
                <h3 className="text-white font-black text-2xl">{fmtCurrency(selected.total_spent || 0)}</h3>
              </div>
            </div>

            <div className="pt-4 border-t border-white/5 text-sm space-y-2 text-zinc-400">
              <p><strong className="text-white">Barbeiro Favorito:</strong> {topBarber || 'Nenhum'}</p>
              <p><strong className="text-white">Serviço Favorito:</strong> {topService || 'Nenhum'}</p>
            </div>
          </div>

          {/* Histórico */}
          <div className="md:col-span-2 bg-dark border border-white/5 rounded-3xl p-5 flex flex-col h-full">
            <h3 className="text-white font-bold flex items-center gap-2 mb-4">
              <ClockIcon className="w-5 h-5 text-electric" /> Histórico de Agendamentos
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 max-h-[400px] scrollbar-hide">
              {loadingDetail ? (
                <div className="text-center text-zinc-500 py-10">Carregando...</div>
              ) : bookings.length === 0 ? (
                <div className="text-center text-zinc-500 py-10">Nenhum agendamento encontrado.</div>
              ) : (
                bookings.map(b => (
                  <div key={b.id} className="bg-dark/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-sm">{b.service?.name || 'Serviço'}</p>
                      <p className="text-zinc-500 text-xs mt-0.5">{b.scheduled_date} às {b.scheduled_time.substring(0,5)} • com {b.barber?.display_name}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded-md font-semibold ${
                        b.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                        b.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                        'bg-electric/10 text-electric text-electric'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Criar Cupom */}
        <div className="bg-gradient-to-r from-dark to-electric/10 border border-electric/30 rounded-3xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TicketIcon className="w-6 h-6 text-electric" />
            <h3 className="text-white font-bold text-lg">Criar Oferta / Cupom Exclusivo</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-6">Crie um desconto válido apenas para este cliente usá-lo na hora do agendamento.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase mb-1.5 block">Código do Cupom</label>
              <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.replace(/\s+/g, ''))} placeholder="Ex: VOLTA10" className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-electric uppercase outline-none" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase mb-1.5 block">Tipo de Desconto</label>
              <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none">
                <option value="percent">Porcentagem (%)</option>
                <option value="fixed">Valor Fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-500 font-medium uppercase mb-1.5 block">Valor do Desconto</label>
              <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="Ex: 15" className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
            </div>
            <button onClick={createCoupon} disabled={creatingCoupon || !couponCode || !discountValue} className="w-full bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-50">
              <PlusIcon className="w-5 h-5" /> Criar Cupom
            </button>
          </div>
        </div>

        <AnimatePresence>
          {toast && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-surface border-border text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 z-50 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-electric" /> {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ─── TELA DE LISTA ────────────────────────────────────────────────────────────
  return (
    <div className="p-4 max-w-7xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Clientes Cadastrados</h2>
          <p className="text-sm text-zinc-400">Gerencie sua carteira de clientes, histórico e fidelização.</p>
        </div>
        <div className="bg-electric/10 text-electric text-electric px-4 py-2 rounded-xl font-bold border border-electric/30">
          Total: {customers.length}
        </div>
      </div>

      <div className="bg-dark border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-dark/50 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Nível</th>
                <th className="px-6 py-4 font-semibold">Contato</th>
                <th className="px-6 py-4 font-semibold">Último Agend.</th>
                <th className="px-6 py-4 font-semibold text-right">Total Gasto</th>
                <th className="px-6 py-4 font-semibold text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {customers.map((c, i) => (
                <motion.tr 
                  key={c.id} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="hover:bg-white/[0.02] transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-surface border-border border border-white/10 flex items-center justify-center overflow-hidden">
                        {c.avatar_url ? (
                          <img src={c.avatar_url} className="w-full h-full object-cover" alt={c.full_name} />
                        ) : (
                          <UserIcon className="w-5 h-5 text-zinc-500" />
                        )}
                      </div>
                      <div>
                        <div className="text-white font-bold text-sm">{c.full_name}</div>
                        <div className="text-xs text-zinc-500">ID: {c.id.split('-')[0]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {c.tier && c.tier !== 'standard' ? (
                      <span className={`flex items-center gap-1 text-xs font-bold uppercase ${tiers.find(t => t.id === c.tier)?.color || 'text-zinc-400 bg-zinc-400/10'} px-2 py-1 rounded-md w-fit`}>
                        <SparklesIcon className="w-3 h-3" /> {c.tier}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500 uppercase font-medium">Standard</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-300 text-sm">
                      <PhoneIcon className="w-4 h-4 text-zinc-500" />
                      {c.phone || 'S/N'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-300 text-sm">
                      <CalendarDaysIcon className="w-4 h-4 text-zinc-500" />
                      {c.last_visit ? new Date(c.last_visit).toLocaleDateString('pt-BR') : 'Nunca agendou'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-electric font-bold">
                      {fmtCurrency(c.total_spent || 0)}
                    </div>
                    {c.total_bookings > 0 && (
                      <div className="text-[10px] text-zinc-500">{c.total_bookings} cortes</div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openDetail(c)}
                        className="px-3 py-1.5 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all text-xs font-bold rounded-lg hover:scale-105 transition-transform"
                      >
                        Ver Perfil
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                    Nenhum cliente cadastrado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
