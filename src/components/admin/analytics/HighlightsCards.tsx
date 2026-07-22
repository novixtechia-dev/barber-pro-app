import React from 'react';
import { ShoppingCartIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon, ClockIcon, CurrencyDollarIcon, StarIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface Props {
  totalSales: number;
  totalRevenue: number;
  bestDay: string;
  worstDay: string;
  bestTime: string;
  worstTime: string;
}

const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export function HighlightsCards({ totalSales, totalRevenue, bestDay, worstDay, bestTime, worstTime }: Props) {
  const cards = [
    {
      title: 'Total de Vendas',
      value: totalSales.toString(),
      sub: 'Total de agendamentos no período',
      Icon: ShoppingCartIcon,
      color: 'text-zinc-100',
    },
    {
      title: 'Receita Total',
      value: fmt(totalRevenue),
      sub: 'Faturamento do período',
      Icon: CurrencyDollarIcon,
      color: 'text-zinc-100',
    },
    {
      title: 'Melhor Dia',
      value: bestDay,
      sub: 'Maior volume de clientes',
      Icon: ArrowTrendingUpIcon,
      color: 'text-emerald-400',
    },
    {
      title: 'Melhor Horário',
      value: bestTime,
      sub: 'Horário de pico',
      Icon: StarIcon,
      color: 'text-electric',
    },
    {
      title: 'Pior Dia',
      value: worstDay,
      sub: 'Menor fluxo na semana',
      Icon: ArrowTrendingDownIcon,
      color: 'text-red-400',
    },
    {
      title: 'Pior Horário',
      value: worstTime,
      sub: 'Maior ociosidade',
      Icon: ClockIcon,
      color: 'text-red-400',
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((c, i) => (
        <motion.div 
          key={i} 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="bg-dark/20 border border-white/5 rounded-2xl p-4 flex flex-col justify-between hover:bg-white/[0.02] hover:border-white/10 transition-all"
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-zinc-400 text-[10px] sm:text-xs font-medium uppercase tracking-wider">{c.title}</h3>
            <c.Icon className={`w-4 h-4 sm:w-4 sm:h-4 opacity-80 ${c.color}`} />
          </div>
          <div>
            <p className={`text-lg sm:text-2xl font-semibold tracking-tight ${c.color === 'text-zinc-100' ? 'text-white' : c.color} capitalize`}>{c.value}</p>
            <p className="text-zinc-600 text-[10px] mt-1">{c.sub}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
