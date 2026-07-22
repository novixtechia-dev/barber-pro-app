import React from 'react';
import { motion } from 'framer-motion';
import { TrophyIcon, SparklesIcon, HeartIcon, ExclamationTriangleIcon, UserMinusIcon, UserIcon, StarIcon, CurrencyDollarIcon } from '@heroicons/react/24/solid';
import { ClientAnalytics, RFVMetrics } from '@/lib/analytics';

interface Props {
  clients: ClientAnalytics[];
}

export function RFVAnalysis({ clients }: Props) {
  const segments: Record<string, { label: string; count: number; color: string; icon: any }> = {
    'campeão': { label: 'Campeão', count: 0, color: 'text-electric', icon: TrophyIcon },
    'gastador': { label: 'Gastador', count: 0, color: 'text-blue-500', icon: CurrencyDollarIcon },
    'promissor': { label: 'Promissor', count: 0, color: 'text-purple-400', icon: SparklesIcon },
    'fiel': { label: 'Fiel', count: 0, color: 'text-pink-400', icon: HeartIcon },
    'em risco': { label: 'Em Risco', count: 0, color: 'text-orange-400', icon: ExclamationTriangleIcon },
    'perdido': { label: 'Perdido', count: 0, color: 'text-red-400', icon: UserMinusIcon },
    'cliente regular': { label: 'Regular', count: 0, color: 'text-zinc-400', icon: UserIcon },
    'cliente novo': { label: 'Novo', count: 0, color: 'text-emerald-400', icon: StarIcon }
  };

  clients.forEach(c => {
    if (segments[c.category]) {
      segments[c.category].count++;
    }
  });

  const total = clients.length;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-4 sm:p-6 w-full max-w-full overflow-hidden hover:border-white/[0.15] transition-colors flex flex-col h-full"
    >
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-[11px] sm:text-xs font-bold text-zinc-500 uppercase tracking-widest">Análise RFV</h2>
        <span className="text-[9px] sm:text-[10px] font-bold bg-white/[0.03] text-zinc-400 px-2 py-1 rounded border border-white/[0.05]">IA SEGMENTS</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 flex-1">
        {Object.entries(segments).map(([key, data], idx) => {
          if (data.count === 0 && key !== 'campeao' && key !== 'risco') return null; // Show at least a few even if empty
          const perc = total > 0 ? ((data.count / total) * 100).toFixed(1) : '0.0';
          
          return (
            <div key={key} className="bg-white/[0.02] border border-white/[0.05] rounded-xl p-4 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
              <div className="flex justify-between items-start mb-3">
                <span className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-wider">{data.label}</span>
                <data.icon className={`w-3 h-3 sm:w-4 sm:h-4 opacity-80 ${data.color}`} />
              </div>
              <div>
                <p className={`text-2xl sm:text-3xl font-bold tracking-tight ${data.color}`}>{data.count}</p>
                <p className="text-[9px] sm:text-[10px] text-zinc-500 mt-1">{perc}% da base</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
