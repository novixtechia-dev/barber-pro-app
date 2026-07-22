import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { motion } from 'framer-motion';

interface Props {
  recurringRevenue: number;
  newRevenue: number;
}

const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export function RevenueCompositionChart({ recurringRevenue, newRevenue }: Props) {
  const total = recurringRevenue + newRevenue;
  
  const data = [
    { name: 'Clientes Recorrentes', value: recurringRevenue, color: '#006BFF' },
    { name: 'Novos Clientes', value: newRevenue, color: '#10b981' }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 sm:p-6 w-full max-w-full overflow-hidden hover:border-white/[0.15] transition-colors flex flex-col h-full"
    >
      <div className="flex justify-between items-start mb-2 sm:mb-6">
        <h2 className="text-[11px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">Composição da Receita</h2>
        <div className="text-right">
          <p className="text-[9px] sm:text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total</p>
          <p className="text-sm sm:text-base font-bold text-white">{fmt(total)}</p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
        <div className="w-[150px] h-[150px] sm:w-[200px] sm:h-[200px] flex-shrink-0 relative">
          {total === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-zinc-600 text-xs font-bold">Sem Dados</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius="70%"
                  outerRadius="100%"
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => fmt(value)}
                  contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full sm:w-auto">
          {data.map(d => {
            const perc = total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0';
            return (
              <div key={d.name} className="flex items-center justify-between sm:justify-start gap-4 p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-xs font-medium text-white">{d.name}</span>
                </div>
                <div className="text-right sm:text-left">
                  <span className="text-xs font-bold text-zinc-400">({perc}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
