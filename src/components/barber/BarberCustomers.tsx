'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MagnifyingGlassIcon, UserCircleIcon, ChatBubbleLeftEllipsisIcon, TicketIcon, PlusIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { SparklesIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { motion, AnimatePresence } from 'framer-motion';

interface Customer {
  id: string;
  full_name: string;
  phone: string;
  avatar_url?: string;
  tier?: string;
  last_visit?: string;
  total_visits: number;
}

export default function BarberCustomers() {
  const { user } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [barberId, setBarberId] = useState<string | null>(null);

  const [selectedForCoupon, setSelectedForCoupon] = useState<Customer | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [discountType, setDiscountType] = useState('percent');
  const [creatingCoupon, setCreatingCoupon] = useState(false);
  const [banningUser, setBanningUser] = useState<Customer | null>(null);
  const [deletingUser, setDeletingUser] = useState<Customer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (user?.id) {
      loadCustomers(user.id);
    }
  }, [user]);

  const loadCustomers = async (barberUserId: string) => {
    setLoading(true);
    const { data: barber } = await supabase.from('barbers').select('id').eq('profile_id', barberUserId).single();
    if (!barber) return setLoading(false);
    setBarberId(barber.id);

    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        client_id,
        scheduled_date,
        client:profiles(id, full_name, phone, avatar_url, tier)
      `)
      .eq('barber_id', barber.id)
      .neq('status', 'cancelled')
      .order('scheduled_date', { ascending: false });

    if (bookings) {
      const clientMap = new Map<string, Customer>();
      
      bookings.forEach((b: any) => {
        if (!b.client) return;
        const cId = b.client.id;
        if (!clientMap.has(cId)) {
          clientMap.set(cId, {
            id: cId,
            full_name: b.client.full_name,
            phone: b.client.phone || '',
            avatar_url: b.client.avatar_url,
            tier: b.client.tier || 'standard',
            last_visit: b.scheduled_date,
            total_visits: 1
          });
        } else {
          const c = clientMap.get(cId)!;
          c.total_visits += 1;
        }
      });

      setCustomers(Array.from(clientMap.values()));
    }
    setLoading(false);
  };

  const filtered = customers.filter(c => 
    (c.full_name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.phone || '').includes(search)
  );

  const openWhatsApp = (phone: string) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, '');
    window.open(`https://wa.me/55${clean}`, '_blank');
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleBanUser = async () => {
    if (!banningUser) return;
    try {
      await supabase.from('profiles').update({ role: 'banned' }).eq('id', banningUser.id);
      showToast('Usuário banido com sucesso! 🚫');
      setCustomers(customers.filter(c => c.id !== banningUser.id));
    } catch (e) {
      console.error(e);
      alert('Erro ao banir usuário.');
    } finally {
      setBanningUser(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser || !user) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deletingUser.id, adminId: user.id })
      });
      if (!res.ok) throw new Error('Falha ao excluir usuário');
      
      showToast('Usuário excluído permanentemente! 🗑️');
      setCustomers(customers.filter(c => c.id !== deletingUser.id));
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir usuário.');
    } finally {
      setIsDeleting(false);
      setDeletingUser(null);
    }
  };

  const createCoupon = async () => {
    if (!couponCode || !discountValue || !selectedForCoupon || !barberId) return;
    setCreatingCoupon(true);

    const { error } = await supabase.from('coupons').insert({
      code: couponCode.toUpperCase(),
      discount_type: discountType,
      discount_value: parseFloat(discountValue),
      client_id: selectedForCoupon.id,
      barber_id: barberId
    });

    if (error) {
      alert('Erro ao criar cupom. Verifique se o código já existe.');
    } else {
      showToast('Cupom criado com sucesso!');
      setCouponCode('');
      setDiscountValue('');
      setSelectedForCoupon(null);
    }
    setCreatingCoupon(false);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Meus Clientes</h2>
          <p className="text-zinc-400 text-sm">Acompanhe seus clientes e histórico.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou celular..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-dark border border-white/5 rounded-full pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-electric"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-dark/50 border border-white/5 rounded-2xl p-8 text-center">
          <UserCircleIcon className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <p className="text-zinc-400 font-medium">Nenhum cliente encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(client => (
            <div key={client.id} className="bg-dark border border-white/5 rounded-2xl p-4 flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-surface border-border overflow-hidden flex-shrink-0 flex items-center justify-center">
                {client.avatar_url ? (
                  <img src={client.avatar_url} alt={client.full_name} className="w-full h-full object-cover" />
                ) : (
                  <UserCircleIcon className="w-8 h-8 text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white truncate text-sm">{client.full_name}</h3>
                  {client.tier && client.tier !== 'standard' && (
                    <SparklesIcon className={`w-3.5 h-3.5 ${
                      client.tier === 'vip' ? 'text-purple-400' :
                      client.tier === 'gold' ? 'text-electric' :
                      client.tier === 'bronze' ? 'text-orange-400' : 'text-gray-300'
                    }`} />
                  )}
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">{client.phone || 'Sem número'}</p>
                <div className="flex items-center gap-3 mt-3">
                  <div className="text-[10px] uppercase text-zinc-500 font-medium">
                    <span className="text-electric font-bold text-xs mr-1">{client.total_visits}</span> Cortes
                  </div>
                  {client.last_visit && (
                    <div className="text-[10px] uppercase text-zinc-500 font-medium">
                      Último: <span className="text-white text-xs ml-1">{client.last_visit.split('-').reverse().join('/')}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                {client.phone && (
                  <button 
                    onClick={() => openWhatsApp(client.phone)}
                    className="w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors tooltip"
                    title="WhatsApp"
                  >
                    <ChatBubbleLeftEllipsisIcon className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => setSelectedForCoupon(client)}
                  className="w-8 h-8 rounded-full bg-electric/10 text-electric text-electric flex items-center justify-center hover:bg-electric hover:text-black transition-colors tooltip"
                  title="Dar Desconto"
                >
                  <TicketIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setBanningUser(client)}
                  className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors tooltip"
                  title="Banir Usuário"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setDeletingUser(client)}
                  className="w-8 h-8 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center hover:bg-red-900/60 transition-colors tooltip"
                  title="Excluir Usuário (Permanente)"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Criar Cupom */}
      <AnimatePresence>
        {selectedForCoupon && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedForCoupon(null)} className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-dark border border-white/10 rounded-3xl p-6 z-[70] shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TicketIcon className="w-5 h-5 text-electric" />
                    Gerar Cupom
                  </h3>
                  <p className="text-zinc-500 text-xs mt-1">Para {selectedForCoupon.full_name}</p>
                </div>
                <button onClick={() => setSelectedForCoupon(null)} className="p-2 bg-surface border-border hover:bg-zinc-700 rounded-full text-zinc-400 transition-colors">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-zinc-500 font-medium uppercase mb-1.5 block">Código do Cupom</label>
                  <input type="text" value={couponCode} onChange={e => setCouponCode(e.target.value.replace(/\s+/g, ''))} placeholder="Ex: CORTEM10" className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-electric uppercase outline-none" />
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 font-medium uppercase mb-1.5 block">Tipo</label>
                    <select value={discountType} onChange={e => setDiscountType(e.target.value)} className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none">
                      <option value="percent">Porcentagem (%)</option>
                      <option value="fixed">Valor Fixo (R$)</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-zinc-500 font-medium uppercase mb-1.5 block">Valor</label>
                    <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder="Ex: 15" className="w-full bg-dark border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none" />
                  </div>
                </div>

                <button onClick={createCoupon} disabled={creatingCoupon || !couponCode || !discountValue} className="w-full mt-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110 transition-colors">
                  {creatingCoupon ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <PlusIcon className="w-5 h-5" />}
                  Gerar e Salvar Cupom
                </button>
              </div>
            </motion.div>
          </>
        )}

        {banningUser && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setBanningUser(null)} className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-dark border border-white/10 rounded-3xl p-6 z-[70] shadow-2xl">
              <XMarkIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white text-center mb-2">Banir Usuário</h3>
              <p className="text-zinc-400 text-sm text-center mb-6">
                Tem certeza que deseja banir <span className="text-white font-semibold">{banningUser.full_name}</span> do aplicativo?
              </p>
              <div className="flex gap-3">
                <button onClick={() => setBanningUser(null)} className="flex-1 py-3 rounded-xl bg-surface border-border text-zinc-400 font-semibold hover:bg-zinc-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleBanUser} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors">
                  Sim, Banir
                </button>
              </div>
            </motion.div>
          </>
        )}

        {deletingUser && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeletingUser(null)} className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-[60]" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-dark border border-red-500/20 rounded-3xl p-6 z-[70] shadow-2xl">
              <TrashIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white text-center mb-2">Excluir permanentemente?</h3>
              <p className="text-zinc-400 text-sm text-center mb-6">
                A exclusão de <span className="text-white font-semibold">{deletingUser.full_name}</span> é irreversível e apagará toda a sua conta.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeletingUser(null)} className="flex-1 py-3 rounded-xl bg-surface border-border text-zinc-400 font-semibold hover:bg-zinc-700 transition-colors">
                  Cancelar
                </button>
                <button onClick={handleDeleteUser} disabled={isDeleting} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center">
                  {isDeleting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-surface border-border text-white px-6 py-3 rounded-full shadow-2xl border border-white/10 z-[80] flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-electric" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
