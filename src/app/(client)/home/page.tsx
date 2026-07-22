'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  BoltIcon,
  CalendarDaysIcon,
  ChevronRightIcon,
  StarIcon,
  ClockIcon,
  XMarkIcon,
} from '@heroicons/react/24/solid';
import {
  ScissorsIcon,
  SparklesIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QuickBookSheet } from '@/components/booking/QuickBookSheet';

const isMocked = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('SEU_PROJETO');
const fmt = (n: number) => `R$ ${n.toFixed(0)}`;

const ServiceIcon = ({ icon }: { icon: string }) => {
  if (icon === 'wave') return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M4 8C6 6 8 10 10 8C12 6 14 10 16 8C18 6 20 8 20 8" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 14C6 12 8 16 10 14C12 12 14 16 16 14C18 12 20 14 20 14" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
  if (icon === 'sparkles') return <SparklesIcon className="w-4.5 h-4.5 text-electric" />;
  if (icon === 'star') return <StarIcon className="w-4.5 h-4.5 text-electric" />;
  return <ScissorsIcon className="w-4.5 h-4.5 text-electric" />;
};

const greet = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia 👋';
  if (h < 18) return 'Boa tarde 👋';
  return 'Boa noite 👋';
};

export default function HomePage() {
  const { user, profile } = useAuth();
  const [barbers, setBarbers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [promo, setPromo] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [nextBooking, setNextBooking] = useState<any>(null);
  
  // Viewer state
  const [activeStory, setActiveStory] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [quickBookBarber, setQuickBookBarber] = useState<any>(null);
  
  const controls = useAnimation();
  const router = useRouter();
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    controls.start({ opacity: 1, y: 0 });
  }, [controls]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el) return;

    let isPaused = false;
    let scrollInterval: any;

    const startAutoScroll = () => {
      scrollInterval = setInterval(() => {
        if (!isPaused && el) {
          el.scrollLeft += 1;
          if (el.scrollLeft >= el.scrollWidth / 2) {
            el.scrollLeft = 0;
          }
        }
      }, 30);
    };

    startAutoScroll();

    const pause = () => { isPaused = true; };
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      if (el && !el.contains(e.target as Node)) {
        isPaused = false;
      }
    };

    el.addEventListener('mouseenter', pause);
    el.addEventListener('touchstart', pause, { passive: true });
    el.addEventListener('wheel', pause, { passive: true });
    
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('touchstart', handleGlobalClick, { passive: true });

    return () => {
      clearInterval(scrollInterval);
      el.removeEventListener('mouseenter', pause);
      el.removeEventListener('touchstart', pause);
      el.removeEventListener('wheel', pause);
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('touchstart', handleGlobalClick);
    };
  }, [services]);

  useEffect(() => {
    if (isMocked()) return;
    const load = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const nowStr = new Date().toTimeString().split(' ')[0];

      const queries = [
        supabase.from('barbers').select('*, profile:profiles(avatar_url, phone)').eq('is_active', true).neq('display_name', 'Novo Barbeiro').limit(6),
        supabase.from('services').select('*').eq('is_active', true).limit(8),
        supabase.from('promotions').select('*').eq('is_active', true).limit(1).maybeSingle(),
        supabase.from('stories').select('*, barber:barbers(display_name, profile:profiles(avatar_url))').gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(10),
      ];

      if (user?.id) {
        queries.push(
          supabase.from('bookings').select('*, barber:barbers(display_name, profile:profiles(avatar_url)), service:services(name)')
            .eq('client_id', user.id)
            .in('status', ['confirmed', 'pending'])
            .gte('scheduled_date', todayStr)
            .order('scheduled_date', { ascending: true })
            .order('scheduled_time', { ascending: true })
            .limit(1)
            .maybeSingle()
        );
      }

      const results = await Promise.all(queries);
      
      if (results[0].data) setBarbers(results[0].data);
      if (results[1].data) setServices(results[1].data);
      if (results[2].data) setPromo(results[2].data);
      if (results[3].data) setStories(results[3].data);
      if (results[4] && results[4].data) setNextBooking(results[4].data);
    };
    load();
  }, []);

  const firstName = profile?.full_name?.split(' ')[0] || 'visitante';

  const getImageUrl = (path: string | null | undefined, bucket: string = 'avatars') => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (bucket === 'uploads' && !path.startsWith('services/')) bucket = 'portfolio';
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl;
  };

  const viewStory = async (story: any) => {
    setActiveStory(story);
    // Increment view count
    if (story.id) {
      const { error } = await supabase.rpc('increment_story_views', { story_id: story.id });
      if (error) console.warn('Failed to increment views', error);
    }
  };

  return (
    <div className="flex flex-col pb-24 gap-8 min-h-screen">
      
      {/* ── Header Premium ─────────────────────────────────────────── */}
      <div className="px-4 pt-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <p className="text-zinc-400 text-sm font-medium">{greet()}</p>
            <h1 className="text-3xl font-black mt-1 tracking-tight text-white">
              {firstName}
            </h1>
          </div>
          {profile?.avatar_url ? (
            <div className="w-14 h-14 rounded-full border border-electric/30 overflow-hidden ">
              <img src={getImageUrl(profile.avatar_url)} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-full bg-dark border border-white/10 flex items-center justify-center">
              <UserCircleIcon className="w-8 h-8 text-zinc-500" />
            </div>
          )}
        </div>

        {/* Gamification Clean */}
        {profile && (
          <div className="bg-dark/80 border border-white/5 rounded-2xl p-4 shadow-md">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Nível Atual</p>
                <p className="text-electric text-sm font-black tracking-wide">{profile.tier || 'STANDARD'}</p>
              </div>
              <div className="text-right">
                <span className="text-white font-black text-lg">{(profile.cuts_count || 0) % 10}</span>
                <span className="text-zinc-500 text-xs font-bold">/10 cortes</span>
              </div>
            </div>
            
            <div className="w-full h-1.5 bg-dark/50 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(((profile.cuts_count || 0) % 10) / 10) * 100}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-electric rounded-full shadow-[0_0_10px_rgba(45,212,255,0.5)]"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Stories Bar ─────────────────────────────────────────── */}
      {stories.length > 0 && (
        <div className="px-4">
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
            {stories.map((story) => (
              <div key={story.id} onClick={() => viewStory(story)} className="flex flex-col items-center gap-1 cursor-pointer flex-shrink-0">
                <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-electric to-red-500">
                  <div className="w-full h-full rounded-full border-2 border-zinc-950 bg-surface border-border overflow-hidden">
                    {getImageUrl(story.barber?.profile?.avatar_url, 'avatars') ? (
                      <img src={getImageUrl(story.barber?.profile?.avatar_url, 'avatars')!} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircleIcon className="w-full h-full text-zinc-600" />
                    )}
                  </div>
                </div>
                <p className="text-white text-[10px] font-medium truncate w-16 text-center">{story.barber?.display_name?.split(' ')[0]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Main CTA ────────────────────────────────────────── */}
      <div className="px-4">
        <Link href="/booking" className="block w-full">
          <motion.button 
            whileTap={{ scale: 0.98 }}
            className="w-full bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all py-5 rounded-2xl flex flex-col items-center justify-center gap-1  relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-glow to-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            <CalendarDaysIcon className="w-8 h-8 relative z-10 mb-1" />
            <span className="font-black text-lg tracking-wide relative z-10">AGENDAR HORÁRIO</span>
          </motion.button>
        </Link>
      </div>

      {/* ── Horários Disponíveis ─────────────────── */}
      {barbers.length > 0 && (
        <section>
          <div className="px-4 mb-3">
            <h2 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
              <ClockIcon className="w-4 h-4 text-electric" /> Horários Disponíveis
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x">
            {barbers.map((b, i) => (
              <motion.div 
                key={b.id} 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: i * 0.05 }}
                className="bg-surface border border-border/50 rounded-2xl p-3 min-w-[180px] snap-start flex items-center justify-between shadow-sm"
              >
                <div>
                  <p className="text-white font-bold text-sm truncate max-w-[100px]">{b.display_name.split(' ')[0]}</p>
                  <p className="text-zinc-400 text-[10px] font-medium mt-0.5">Barbeiro</p>
                </div>
                <button onClick={() => setQuickBookBarber(b)} className="bg-electric/10 text-electric hover:bg-electric hover:text-black transition-colors text-[10px] font-black uppercase px-3 py-1.5 rounded-lg">
                  Ver Horários
                </button>
              </motion.div>
            ))}
          </div>
        </section>
      )}


      {/* ── Stories Modal ────────────────────────────────────── */}
      <AnimatePresence>
        {activeStory && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-dark flex flex-col"
          >
            {/* Progress bar fake pra dar o feel de story */}
            <div className="absolute top-4 inset-x-2 flex gap-1 z-20">
              <motion.div 
                initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 5, ease: 'linear' }}
                onAnimationComplete={() => setActiveStory(null)}
                className="h-1 bg-white rounded-full flex-1"
              />
            </div>

            <div className="absolute top-8 inset-x-4 flex items-center justify-between z-20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full border border-white/20 overflow-hidden bg-dark">
                  {activeStory.barber?.profile?.avatar_url ? (
                    <img src={activeStory.barber.profile.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-electric font-bold flex items-center justify-center h-full text-xs">
                      {activeStory.barber?.display_name?.charAt(0) || 'B'}
                    </span>
                  )}
                </div>
                <span className="text-white font-bold text-sm shadow-black drop-shadow-md">{activeStory.barber?.display_name || 'Barbearia'}</span>
              </div>
              <button onClick={() => setActiveStory(null)} className="p-2 bg-dark/40 backdrop-blur rounded-full text-white">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 bg-dark relative">
              <img src={activeStory.media_url} alt="Story" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 pointer-events-none" />
              
              {activeStory.caption && (
                <div className="absolute bottom-8 inset-x-6 text-center">
                  <p className="text-white text-lg font-bold shadow-black drop-shadow-lg">{activeStory.caption}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ── Serviços (Carrossel Contínuo) ────────────────────────────── */}
      {services.length > 0 && (
        <section className="mb-8 overflow-hidden">
          <div className="px-4 mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white tracking-tight">Serviços</h2>
            <Link href="/services">
              <button className="bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest hover:brightness-110 transition-colors  active:scale-95">
                Ver Todos
              </button>
            </Link>
          </div>
          <div className="w-full relative group">
            {/* Fade edges */}
            <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-dark to-transparent z-10 pointer-events-none" />
            <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-dark to-transparent z-10 pointer-events-none" />
            
            {/* Contêiner com scroll manual (mobile e desktop) */}
            <div ref={carouselRef} className="flex gap-4 w-full overflow-x-auto px-4 pb-4 scrollbar-hide snap-x">
              {[...services, ...services].map((s, i) => (
                <motion.div 
                  key={`${s.id}-${i}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.92, rotate: -1 }}
                  onClick={() => setSelectedService(s)}
                  className="bg-surface border border-border/50 rounded-3xl overflow-hidden w-[200px] flex-shrink-0 flex flex-col cursor-pointer hover:border-electric/30 transition-all snap-center shadow-md relative"
                >
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-electric/0 hover:bg-electric/10 text-electric transition-colors duration-300 z-10 pointer-events-none" />
                  
                  <div className="w-full h-32 bg-surface border-border relative flex items-center justify-center">
                    {getImageUrl(s.image_url, 'uploads') ? (
                      <img src={getImageUrl(s.image_url, 'uploads')!} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                        <ScissorsIcon className="w-8 h-8 opacity-50" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />
                  </div>
                  <div className="p-4 flex flex-col flex-1 bg-surface relative">
                    <h3 className="font-bold text-white text-sm leading-tight mb-1">{s.name}</h3>
                    {s.description && (
                      <p className="text-zinc-400 text-[10px] line-clamp-2 leading-relaxed mb-3">{s.description}</p>
                    )}
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold">
                        <ClockIcon className="w-3 h-3 text-electric" />
                        <span>{s.duration_minutes}m</span>
                      </div>
                      <p className="text-electric font-black text-sm">R$ {s.price.toFixed(0)}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Modal de Detalhes do Serviço ────────────────────────────── */}
      <AnimatePresence>
        {selectedService && (
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
                <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-90" />
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
                    onClick={() => router.push(`/booking?service_id=${selectedService.id}`)}
                    className="w-full py-4 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black text-lg rounded-2xl hover:brightness-110 transition-colors  active:scale-[0.98]"
                  >
                    AGENDAR AGORA
                  </button>
                  <button 
                    onClick={() => setSelectedService(null)}
                    className="w-full py-3 bg-white/5 text-white font-bold rounded-2xl hover:bg-white/10 transition-colors"
                  >
                    Voltar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <QuickBookSheet barber={quickBookBarber} onClose={() => setQuickBookBarber(null)} />
    </div>
  );
}
