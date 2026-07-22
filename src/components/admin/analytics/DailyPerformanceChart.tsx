import React from 'react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line } from 'recharts';
import { motion } from 'framer-motion';

interface Props {
  data: any[];
}

export function DailyPerformanceChart({ data }: Props) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 sm:p-6 w-full max-w-full overflow-hidden hover:border-white/[0.15] transition-colors"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[11px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">Desempenho Diário</h2>
        <span className="text-[9px] sm:text-[10px] font-bold bg-white/[0.03] text-zinc-400 px-2 py-1 rounded border border-white/[0.05]">FAT. VS QTD</span>
      </div>
      
      <div className="h-[250px] sm:h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
            <XAxis dataKey="date" stroke="rgba(255,255,255,0.2)" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" stroke="rgba(255,255,255,0.2)" fontSize={10} tickFormatter={(val) => Math.round(val).toString()} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.2)" fontSize={10} tickFormatter={(val) => `R$${val}`} axisLine={false} tickLine={false} />
            
            <Tooltip 
              contentStyle={{ backgroundColor: '#050505', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.5)' }}
              itemStyle={{ color: '#fff', fontWeight: 'bold' }}
            />
            
            <Bar yAxisId="left" dataKey="count" fill="rgba(255,255,255,0.15)" radius={[4, 4, 0, 0]} barSize={12} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#2DD4FF" strokeWidth={3} dot={{ r: 4, fill: '#2DD4FF', strokeWidth: 2, stroke: '#000' }} activeDot={{ r: 6, fill: '#2DD4FF' }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4 sm:mt-6">
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-electric" />
          <span className="text-[11px] sm:text-xs text-white font-medium">Faturamento (R$)</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="w-2 sm:w-3 h-2 sm:h-3 rounded-full bg-white/20" />
          <span className="text-[11px] sm:text-xs text-zinc-400">Vendas (Qtd)</span>
        </div>
      </div>
    </motion.div>
  );
}
