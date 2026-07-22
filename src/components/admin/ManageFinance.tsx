'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { CurrencyDollarIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, CalendarDaysIcon, UserIcon, ScissorsIcon } from '@heroicons/react/24/outline';

const fmtCurrency = (n: number) => `R$ ${Number(n).toFixed(2)}`;

export default function ManageFinance() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ hoje: 0, semana: 0, mes: 0, ano: 0 });

  useEffect(() => {
    fetchFinances();
  }, []);

  const fetchFinances = async () => {
    setLoading(true);
    // Busca últimos 100 pagamentos
    const { data: payData } = await supabase
      .from('payments')
      .select('*, booking:bookings(scheduled_date, service:services(name), client:profiles(full_name))')
      .eq('status', 'paid')
      .order('paid_at', { ascending: false })
      .limit(100);

    if (payData) {
      setPayments(payData);
      
      // Calcula estatísticas locais simplificadas pros dados carregados (o certo num SaaS gigante é RPC)
      let h = 0, s = 0, m = 0, a = 0;
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      
      // Semana
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekStartStr = weekStart.toISOString().split('T')[0];

      // Mes
      const monthStartStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`;

      // Ano
      const yearStartStr = `${now.getFullYear()}-01-01`;

      payData.forEach(p => {
        const d = p.booking?.scheduled_date || p.paid_at?.split('T')[0];
        if (!d) return;
        const val = Number(p.amount);
        if (d === todayStr) h += val;
        if (d >= weekStartStr) s += val;
        if (d >= monthStartStr) m += val;
        if (d >= yearStartStr) a += val;
      });

      setStats({ hoje: h, semana: s, mes: m, ano: a });
    }
    setLoading(false);
  };

  if (loading) return <div className="text-zinc-400 p-4 text-center">Carregando financeiro...</div>;

  return (
    <div className="p-4 max-w-7xl mx-auto pb-24">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white">Financeiro</h2>
        <p className="text-sm text-zinc-400">Acompanhe seu faturamento em tempo real.</p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-dark border border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CurrencyDollarIcon className="w-16 h-16 text-electric" /></div>
          <h3 className="text-zinc-400 text-sm font-medium mb-1 relative z-10">Receita Hoje</h3>
          <p className="text-white text-2xl font-black relative z-10">{fmtCurrency(stats.hoje)}</p>
        </div>
        
        <div className="bg-dark border border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowTrendingUpIcon className="w-16 h-16 text-electric" /></div>
          <h3 className="text-zinc-400 text-sm font-medium mb-1 relative z-10">Receita Semana</h3>
          <p className="text-white text-2xl font-black relative z-10">{fmtCurrency(stats.semana)}</p>
        </div>

        <div className="bg-dark border border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><CalendarDaysIcon className="w-16 h-16 text-electric" /></div>
          <h3 className="text-zinc-400 text-sm font-medium mb-1 relative z-10">Receita Mês</h3>
          <p className="text-white text-2xl font-black relative z-10">{fmtCurrency(stats.mes)}</p>
        </div>

        <div className="bg-dark border border-white/5 rounded-2xl p-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><ArrowTrendingUpIcon className="w-16 h-16 text-green-500" /></div>
          <h3 className="text-zinc-400 text-sm font-medium mb-1 relative z-10">Receita Ano</h3>
          <p className="text-white text-2xl font-black relative z-10">{fmtCurrency(stats.ano)}</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-white">Últimas Transações</h3>
      </div>

      <div className="bg-dark border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-dark/50 text-zinc-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Data</th>
                <th className="px-6 py-4 font-semibold">Cliente</th>
                <th className="px-6 py-4 font-semibold">Serviço</th>
                <th className="px-6 py-4 font-semibold">Método</th>
                <th className="px-6 py-4 font-semibold text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payments.map((p, i) => (
                <motion.tr 
                  key={p.id} 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="text-white text-sm font-medium">
                      {p.booking?.scheduled_date ? new Date(p.booking.scheduled_date).toLocaleDateString('pt-BR') : '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-300 text-sm">
                      <UserIcon className="w-4 h-4 text-zinc-500" />
                      {p.booking?.client?.full_name || 'Cliente Avulso'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-300 text-sm">
                      <ScissorsIcon className="w-4 h-4 text-zinc-500" />
                      {p.booking?.service?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-surface border-border text-zinc-300 px-2 py-1 rounded text-xs font-semibold uppercase">
                      {p.method}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="text-green-400 font-bold">
                      +{fmtCurrency(p.amount)}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Nenhuma transação financeira encontrada.
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
