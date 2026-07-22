'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { StarIcon, ShieldCheckIcon } from '@heroicons/react/24/solid';
import { ScissorsIcon, UserIcon } from '@heroicons/react/24/outline';
import { QuickBookSheet } from '@/components/booking/QuickBookSheet';
import Link from 'next/link';

const isMocked = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('SEU_PROJETO');

export default function BarbersPage() {
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [quickBookBarber, setQuickBookBarber] = useState<any>(null);

  useEffect(() => {
    if (isMocked()) return;
    const loadBarbers = async () => {
      const { data } = await supabase
        .from('barbers')
        .select('*, profile:profiles(avatar_url, phone)')
        .eq('is_active', true)
        .neq('display_name', 'Novo Barbeiro')
        .order('display_name', { ascending: true });
      
      if (data) setBarbers(data);
      setLoading(false);
    };
    loadBarbers();
  }, []);

  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl;
  };

  return (
    <div className="flex flex-col pb-24 gap-6 min-h-screen pt-6 px-4">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">Barbeiros</h1>
        <p className="text-zinc-400 text-sm">Escolha seu especialista e agende seu horário.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-electric border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {barbers.map((b, i) => (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={b.id}
              className="relative w-full max-w-[320px] mx-auto aspect-[3/4] rounded-[2rem] overflow-hidden group"
            >
              {/* FIFA Card Background styling */}
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black border-2 border-electric/30 rounded-[2rem] shadow-[0_0_30px_rgba(251,191,36,0.1)] group-hover:border-electric/80 group-hover:shadow-[0_0_40px_rgba(251,191,36,0.2)] transition-all duration-500" />
              
              {/* Pattern Overlay */}
              <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:10px_10px]" />

              {/* Top Stats */}
              <div className="absolute top-6 left-6 z-20 flex flex-col items-center">
                <span className="text-3xl font-black text-electric drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  99
                </span>
                <span className="text-[10px] font-black uppercase text-electric/80 tracking-widest">
                  OVR
                </span>
                <div className="w-8 h-[1px] bg-electric/30 my-2" />
                <ScissorsIcon className="w-5 h-5 text-zinc-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              </div>

              {/* Top Right Icon */}
              <div className="absolute top-6 right-6 z-20">
                <ShieldCheckIcon className="w-8 h-8 text-electric drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              </div>

              {/* Photo Area */}
              <div className="absolute top-0 inset-x-0 h-[65%] flex items-end justify-center">
                {getImageUrl(b.profile?.avatar_url) ? (
                  <img 
                    src={getImageUrl(b.profile?.avatar_url)!} 
                    alt={b.display_name} 
                    className="h-full object-cover object-bottom drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]"
                    style={{ maskImage: 'linear-gradient(to top, transparent 0%, black 20%)', WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 20%)' }}
                  />
                ) : (
                  <div className="w-40 h-40 mb-10 rounded-full bg-surface border-border/50 flex items-center justify-center border-4 border-electric/30 shadow-2xl">
                    <UserIcon className="w-20 h-20 text-zinc-600" />
                  </div>
                )}
              </div>

              {/* Content Bottom Area */}
              <div className="absolute bottom-0 inset-x-0 h-[45%] bg-gradient-to-t from-black via-zinc-950/95 to-transparent flex flex-col items-center justify-end pb-6 px-6 z-20">
                
                {/* Name */}
                <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-md">
                  {b.display_name}
                </h2>
                
                {/* Micro Stats Row */}
                <div className="flex items-center gap-4 text-[10px] font-black text-electric uppercase tracking-widest mb-4">
                  <div className="flex items-center gap-1">
                    <StarIcon className="w-3.5 h-3.5" />
                    5.0
                  </div>
                  <div className="w-1 h-1 bg-white/20 rounded-full" />
                  <span>MASTER</span>
                </div>

                {/* Divider */}
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-electric/30 to-transparent mb-5" />

                {/* Action Buttons */}
                <div className="w-full flex gap-3">
                  <Link href={`/barber/${b.id}`} className="flex-1">
                    <button className="w-full py-3 px-2 bg-dark border border-white/10 rounded-xl text-white text-xs font-bold uppercase tracking-wider hover:bg-surface border-border transition-colors">
                      Ver Perfil
                    </button>
                  </Link>
                  <button 
                    onClick={() => setQuickBookBarber(b)}
                    className="flex-1 py-3 px-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all rounded-xl text-xs font-black uppercase tracking-wider  hover:brightness-110 transition-colors"
                  >
                    Agendar
                  </button>
                </div>

              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Modals */}
      <QuickBookSheet 
        barber={quickBookBarber} 
        onClose={() => setQuickBookBarber(null)} 
      />
      
    </div>
  );
}
