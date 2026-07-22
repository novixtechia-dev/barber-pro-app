'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { ClockIcon, ScissorsIcon, UserIcon } from '@heroicons/react/24/outline';
import { XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { QuickBookSheet } from '@/components/booking/QuickBookSheet';

const isMocked = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('SEU_PROJETO');

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([]);
  const [barbers, setBarbers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedService, setSelectedService] = useState<any>(null);
  const [pickingBarber, setPickingBarber] = useState(false);
  
  // Final flow state
  const [quickBookBarber, setQuickBookBarber] = useState<any>(null);
  const [quickBookService, setQuickBookService] = useState<any>(null);

  useEffect(() => {
    if (isMocked()) return;
    const load = async () => {
      const [srvs, barbs] = await Promise.all([
        supabase.from('services').select('*').eq('is_active', true).order('name'),
        supabase.from('barbers').select('*, profile:profiles(avatar_url)').eq('is_active', true).neq('display_name', 'Novo Barbeiro')
      ]);
      if (srvs.data) setServices(srvs.data);
      if (barbs.data) setBarbers(barbs.data);
      setLoading(false);
    };
    load();
  }, []);

  const getImageUrl = (path: string | null | undefined, bucket: string = 'avatars') => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (bucket === 'uploads' && !path.startsWith('services/')) bucket = 'portfolio';
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl;
  };

  const categories = Array.from(new Set(services.map(s => s.category || 'Outros')));

  const handleBarberSelect = (barber: any) => {
    const service = selectedService;
    setPickingBarber(false);
    setSelectedService(null);
    setQuickBookService(service);
    // Slight delay to allow modal close animation before opening the next
    setTimeout(() => {
      setQuickBookBarber(barber);
    }, 300);
  };

  return (
    <div className="flex flex-col pb-24 gap-6 min-h-screen pt-6 px-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white mb-2">Serviços</h1>
        <p className="text-zinc-400 text-sm">Navegue pelas categorias e escolha o que deseja.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="w-8 h-8 border-4 border-electric border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col gap-8 pt-4">
          {categories.map(category => {
            const catServices = services.filter(s => (s.category || 'Outros') === category);
            if (catServices.length === 0) return null;
            
            return (
              <div key={category}>
                <h2 className="text-lg font-bold text-electric mb-4 flex items-center gap-2">
                  <ScissorsIcon className="w-5 h-5" />
                  {category}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {catServices.map((s, i) => (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => setSelectedService(s)}
                      className="bg-dark border border-white/5 rounded-2xl overflow-hidden text-left hover:border-electric/40 transition-all active:scale-95 flex flex-col h-full group"
                    >
                      <div className="w-full aspect-[4/3] bg-surface border-border relative flex items-center justify-center">
                        {getImageUrl(s.image_url, 'uploads') ? (
                          <img src={getImageUrl(s.image_url, 'uploads')!} alt={s.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <ScissorsIcon className="w-8 h-8 text-zinc-600 opacity-50" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent opacity-80" />
                      </div>
                      <div className="p-3 flex flex-col flex-1">
                        <h3 className="font-bold text-white text-sm line-clamp-2">{s.name}</h3>
                        <div className="mt-auto pt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 text-zinc-500 text-xs font-medium">
                            <ClockIcon className="w-3 h-3" />
                            <span>{s.duration_minutes}m</span>
                          </div>
                          <span className="text-electric font-bold text-sm">
                            R$ {s.price.toFixed(0)}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Service Details Modal */}
      <AnimatePresence>
        {selectedService && !pickingBarber && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-dark/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6"
            onClick={() => setSelectedService(null)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              className="bg-dark border border-white/10 w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="relative w-full h-48 bg-dark flex-shrink-0">
                {getImageUrl(selectedService.image_url, 'uploads') ? (
                  <img src={getImageUrl(selectedService.image_url, 'uploads')!} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                    <ScissorsIcon className="w-12 h-12 opacity-50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
                <button onClick={() => setSelectedService(null)} className="absolute top-4 right-4 p-2 bg-dark/40 backdrop-blur rounded-full text-white hover:bg-dark/60 transition-colors">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 flex-1 overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-2xl font-black text-white leading-tight pr-4">{selectedService.name}</h2>
                  <div className="text-electric font-black text-xl whitespace-nowrap">R$ {selectedService.price.toFixed(0)}</div>
                </div>
                
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex items-center gap-1.5 text-zinc-400 font-medium bg-white/5 px-3 py-1.5 rounded-lg text-sm">
                    <ClockIcon className="w-4 h-4 text-electric" />
                    {selectedService.duration_minutes} minutos
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-2">Descrição</h3>
                  <p className="text-zinc-300 text-sm leading-relaxed">
                    {selectedService.description || 'Nenhuma descrição fornecida para este serviço.'}
                  </p>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    onClick={() => setPickingBarber(true)}
                    className="w-full py-4 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black text-lg rounded-2xl hover:brightness-110 transition-colors  active:scale-[0.98]"
                  >
                    ESCOLHER BARBEIRO
                  </button>
                  <button 
                    onClick={() => setSelectedService(null)}
                    className="w-full py-3 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Choose Barber Modal */}
      <AnimatePresence>
        {pickingBarber && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-dark/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 sm:p-6"
            onClick={() => setPickingBarber(false)}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={e => e.stopPropagation()}
              className="bg-dark border border-white/10 w-full max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-dark/50">
                <h2 className="text-lg font-bold text-white px-2">Quem vai te atender?</h2>
                <button onClick={() => setPickingBarber(false)} className="p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-3">
                {barbers.map(b => (
                  <button
                    key={b.id}
                    onClick={() => handleBarberSelect(b)}
                    className="w-full bg-dark border border-white/5 hover:border-electric/30 p-3 rounded-2xl flex items-center justify-between transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden bg-surface border-border flex items-center justify-center">
                        {getImageUrl(b.profile?.avatar_url) ? (
                          <img src={getImageUrl(b.profile?.avatar_url)!} className="w-full h-full object-cover" />
                        ) : (
                          <UserIcon className="w-6 h-6 text-zinc-500" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-white font-bold">{b.display_name}</p>
                        <p className="text-zinc-500 text-xs font-medium">Ver horários</p>
                      </div>
                    </div>
                    <ChevronRightIcon className="w-5 h-5 text-zinc-600 group-hover:text-electric transition-colors" />
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickBookSheet 
        barber={quickBookBarber} 
        initialService={quickBookService}
        onClose={() => { setQuickBookBarber(null); setQuickBookService(null); }} 
      />
    </div>
  );
}
