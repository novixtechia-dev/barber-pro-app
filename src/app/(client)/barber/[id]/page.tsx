'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HeartIcon, 
  ChevronLeftIcon, 
  StarIcon, 
  UserCircleIcon,
  PlayIcon,
  ClockIcon,
  XMarkIcon,
  ScissorsIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon, StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getAvailableSlots } from '@/services/booking.service';
import { QuickBookSheet } from '@/components/booking/QuickBookSheet';

export default function BarberProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [barber, setBarber] = useState<any>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('services'); // 'services', 'certificates', 'reviews'
  
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [slots, setSlots] = useState<{ date: string, times: any[] }[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<any>(null);
  // viewer de imagem/video
  const [mediaViewer, setMediaViewer] = useState<string | null>(null);
  const [activeStory, setActiveStory] = useState<any>(null);

  // Quickbook state
  const [quickBookBarber, setQuickBookBarber] = useState<any>(null);
  const [quickBookService, setQuickBookService] = useState<any>(null);
  const [quickBookDate, setQuickBookDate] = useState<string | null>(null);
  const [quickBookTime, setQuickBookTime] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadBarber(id as string);
  }, [id, user]);

  useEffect(() => {
    const originalUrl = window.location.pathname;
    if (mediaViewer) {
      // Evita acumular /story/story/story se clicar várias vezes
      if (!originalUrl.endsWith('/story')) {
        window.history.pushState(null, '', `${originalUrl}/story`);
      }
    } else {
      if (originalUrl.endsWith('/story')) {
        window.history.pushState(null, '', originalUrl.replace('/story', ''));
      }
    }
  }, [mediaViewer]);

  const getImageUrl = (path: string | null | undefined, bucket: string = 'avatars') => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (bucket === 'uploads' && !path.startsWith('services/')) bucket = 'portfolio';
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl;
  };

  const loadBarber = async (barberId: string) => {
    setLoading(true);
    // Info do Barbeiro
    const { data: b } = await supabase.from('barbers')
      .select('*, profile:profiles(avatar_url, bio, full_name)')
      .eq('id', barberId)
      .single();
      
    if (b) setBarber(b);

    // Se logado, checa se é favorito
    if (user?.id) {
      const { data: fav } = await supabase.from('favorite_barbers')
        .select('*')
        .eq('client_id', user.id)
        .eq('barber_id', barberId)
        .maybeSingle();
      if (fav) setIsFavorite(true);
    }

    // Carrega Portfolio, Serviços, Reviews e Stories
    const [pfRes, revRes, stRes, bsRes, csRes] = await Promise.all([
      supabase.from('portfolio_items').select('*').eq('barber_id', barberId).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*, client:profiles(full_name, avatar_url)').eq('barber_id', barberId).order('created_at', { ascending: false }),
      supabase.from('stories').select('*').eq('barber_id', barberId).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: false }),
      supabase.from('barber_services').select('custom_price, service:services(*)').eq('barber_id', barberId),
      supabase.from('services').select('*').eq('barber_id', barberId).eq('is_active', true)
    ]);

    let finalServices: any[] = [];
    if (bsRes.data) {
      bsRes.data.forEach((bs: any) => {
        if (bs.service && bs.service.is_active) {
          finalServices.push({
            ...bs.service,
            price: bs.custom_price !== null ? bs.custom_price : bs.service.price
          });
        }
      });
    }
    if (csRes.data) {
      finalServices = [...finalServices, ...csRes.data];
    }

    if (pfRes.data) setPortfolio(pfRes.data);
    setServices(finalServices);
    if (revRes.data) setReviews(revRes.data);
    if (stRes.data) setStories(stRes.data);

    // Carrega slots dos próximos 3 dias
    const today = new Date();
    const dates = [0, 1, 2].map(d => {
      const date = new Date(today);
      date.setDate(date.getDate() + d);
      return date.toISOString().split('T')[0];
    });

    const slotsMap = [];
    for (const date of dates) {
      const available = await getAvailableSlots(barberId, date, 30); // Usando 30min como padrão
      slotsMap.push({
        date,
        times: available.filter(s => s.available).slice(0, 4) // só mostra os 4 primeiros
      });
    }
    setSlots(slotsMap);

    setLoading(false);
  };

  const toggleFavorite = async () => {
    if (!user) return alert('Faça login para favoritar.');
    if (isFavorite) {
      await supabase.from('favorite_barbers').delete().eq('client_id', user.id).eq('barber_id', barber.id);
      setIsFavorite(false);
    } else {
      await supabase.from('favorite_barbers').insert({ client_id: user.id, barber_id: barber.id });
      setIsFavorite(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!barber) return <div className="p-8 text-center text-white">Barbeiro não encontrado.</div>;

  return (
    <div className="pb-24">
      {/* Header Imagem Grande (Capa estilo Facebook) */}
      <div className="relative w-full h-[35vh] bg-dark overflow-hidden">
        {/* Cover Carousel (usando portfolio como capa se houver) */}
        {portfolio.length > 0 ? (
          <div className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {portfolio.map(p => (
              <img key={p.id} src={getImageUrl(p.media_url, 'portfolio')!} className="w-full h-full object-cover flex-shrink-0 snap-center" />
            ))}
          </div>
        ) : getImageUrl(barber.profile?.avatar_url || barber.avatar_url) ? (
          <img src={getImageUrl(barber.profile?.avatar_url || barber.avatar_url)!} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-surface border-border" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent pointer-events-none" />
        
        {/* Top Actions */}
        <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10">
          <button onClick={() => router.back()} className="w-10 h-10 bg-dark/40 backdrop-blur rounded-full flex items-center justify-center text-white">
            <ChevronLeftIcon className="w-6 h-6" />
          </button>
          <button onClick={toggleFavorite} className="w-10 h-10 bg-dark/40 backdrop-blur rounded-full flex items-center justify-center text-white transition-colors">
            {isFavorite ? <HeartSolidIcon className="w-6 h-6 text-red-500" /> : <HeartIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Info Profile (Avatar sobreposto estilo Facebook) */}
      <div className="px-6 relative -mt-16 mb-4">
        <div className="flex justify-between items-end mb-3">
          <div 
            onClick={() => stories.length > 0 && setActiveStory(stories[0])}
            className={`w-28 h-28 rounded-full border-4 border-zinc-950 bg-surface border-border overflow-hidden relative z-10 shadow-xl ${stories.length > 0 ? 'p-[3px] bg-gradient-to-tr from-electric to-red-500 cursor-pointer' : ''}`}
          >
            <div className="w-full h-full rounded-full border-2 border-zinc-950 bg-surface border-border overflow-hidden">
              {getImageUrl(barber.profile?.avatar_url || barber.avatar_url) ? (
                <img src={getImageUrl(barber.profile?.avatar_url || barber.avatar_url)!} className="w-full h-full object-cover" />
              ) : (
                <UserCircleIcon className="w-full h-full text-zinc-600" />
              )}
            </div>
          </div>
          
          <div className="flex flex-col items-end pb-2">
            <div className="flex items-center gap-1 bg-electric/20 text-electric px-2 py-1 rounded-lg text-electric font-bold mb-1">
              <StarSolidIcon className="w-4 h-4" />
              {Number(barber.rating || 5).toFixed(1)}
            </div>
            <div className="text-zinc-400 text-xs font-medium">
              {barber.experience_years} anos exp.
            </div>
          </div>
        </div>
        
        <h1 className="text-2xl font-black text-white leading-none mb-1">
          {barber.display_name}
        </h1>
        {barber.specialties && barber.specialties.length > 0 && (
          <p className="text-zinc-400 text-sm">{barber.specialties.join(' • ')}</p>
        )}
      </div>

      {/* Biografia */}
      {(barber.profile?.bio || barber.bio) && (
        <div className="px-6 pb-6 border-b border-white/5">
          <p className="text-zinc-400 text-sm leading-relaxed">
            {barber.profile?.bio || barber.bio}
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 flex gap-6 border-b border-white/5 pt-4 overflow-x-auto scrollbar-hide">
        {[
          { id: 'services', label: 'Serviços/Horários' },
          { id: 'certificates', label: 'Storys/Certificados' },
          { id: 'reviews', label: 'Avaliações' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-4 text-sm font-bold uppercase tracking-wider relative transition-colors whitespace-nowrap ${
              activeTab === tab.id ? 'text-electric' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="barber-tab" className="absolute bottom-0 inset-x-0 h-0.5 bg-electric rounded-t-full" />
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo das Tabs */}
      <div className="px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* SERVICES & SCHEDULES TAB */}
            {activeTab === 'services' && (
              <div className="flex flex-col gap-8">
                {/* Horários Livres Movido para dentro da Tab */}
                <div>
                  <h3 className="text-white font-bold mb-4">Próximos horários livres</h3>
                  <div className="flex flex-col gap-4 pb-4">
                    {slots.map(day => (
                      <div key={day.date} className="bg-dark border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                        <div className="text-center w-14 flex-shrink-0 border-r border-white/10 pr-4">
                          <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                            {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                          </div>
                          <div className="text-electric font-black text-2xl leading-none mt-1">
                            {day.date.split('-')[2]}
                          </div>
                        </div>
                        <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
                          {day.times.length === 0 ? (
                            <div className="text-xs text-zinc-500 font-medium py-2">Lotado neste dia</div>
                          ) : (
                            day.times.map(t => (
                              <button 
                                key={t.time} 
                                onClick={() => {
                                  setQuickBookDate(day.date);
                                  setQuickBookTime(t.time);
                                  setQuickBookService(selectedService); // Pass the selected service if any
                                  setQuickBookBarber(barber);
                                }}
                                className="flex-shrink-0 px-4 py-2 text-sm font-bold text-white bg-dark hover:bg-electric/20 text-electric hover:text-electric rounded-xl border border-white/5 transition-colors"
                              >
                                {t.time}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-4">Serviços</h3>
                  <div className="w-full relative">
                    <div className="flex gap-4 w-full overflow-x-auto pb-4 scrollbar-hide snap-x">
                      {services.map(s => {
                        const isSelected = selectedService?.id === s.id;
                        return (
                          <div 
                            key={s.id} 
                            onClick={() => setSelectedService(isSelected ? null : s)}
                            className={`flex-shrink-0 w-[200px] cursor-pointer transition-all duration-300 rounded-3xl overflow-hidden flex flex-col relative border-2 bg-dark snap-center ${isSelected ? 'border-electric scale-[1.02] ' : 'border-white/5 hover:border-white/20'}`}
                          >
                            <div className="w-full h-32 bg-surface border-border relative flex items-center justify-center">
                              {s.image_url ? (
                                <img src={getImageUrl(s.image_url, 'uploads')!} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                                  <ScissorsIcon className="w-8 h-8 opacity-50 mb-1" />
                                </div>
                              )}
                            </div>
                            <div className="p-3 flex flex-col flex-1 bg-dark">
                              <h4 className="text-white font-bold text-[13px] leading-tight line-clamp-2 min-h-[32px]">{s.name}</h4>
                              <div className="mt-auto pt-2 flex items-center justify-between">
                                <div className="flex items-center gap-1 text-zinc-500 text-[10px] font-bold">
                                <ClockIcon className="w-3 h-3 text-electric" />
                                <span>{s.duration_minutes}m</span>
                              </div>
                              <p className="text-electric font-black text-sm">R$ {s.price.toFixed(0)}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>

                  <AnimatePresence>
                    {selectedService && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }} 
                        animate={{ opacity: 1, height: 'auto' }} 
                        exit={{ opacity: 0, height: 0 }}
                        className="bg-dark border border-electric/30 rounded-3xl p-5 overflow-hidden shadow-xl mt-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-white font-black text-lg leading-tight">{selectedService.name}</h4>
                            <div className="text-zinc-400 text-xs mt-1 flex items-center gap-2 font-bold uppercase tracking-widest">
                              <span className="flex items-center gap-1 text-electric"><ClockIcon className="w-3.5 h-3.5" /> {selectedService.duration_minutes} min</span>
                            </div>
                          </div>
                          <div className="text-electric font-black text-2xl">R$ {selectedService.price.toFixed(0)}</div>
                        </div>
                        
                        {selectedService.description && (
                          <p className="text-zinc-400 text-sm leading-relaxed mb-5">
                            {selectedService.description}
                          </p>
                        )}
                        
                        <button 
                          onClick={() => { setQuickBookService(selectedService); setQuickBookBarber(barber); }}
                          className="w-full py-4 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black rounded-xl  active:scale-[0.98] transition-transform flex justify-center items-center gap-2"
                        >
                          Agendar Serviço
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* STORIES & CERTIFICADOS TAB */}
            {activeTab === 'certificates' && (
              <div className="flex flex-col gap-8">
                {/* Stories Movido para cá */}
                {stories.length > 0 && (
                  <div>
                    <h3 className="text-white font-bold mb-4">Stories</h3>
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                      {stories.map(s => (
                        <div key={s.id} onClick={() => setMediaViewer(getImageUrl(s.media_url, 'stories'))} className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-electric to-primary flex-shrink-0 cursor-pointer">
                          <div className="w-full h-full rounded-full overflow-hidden border-2 border-black">
                            <img src={getImageUrl(s.media_url, 'stories')!} className="w-full h-full object-cover" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-white font-bold mb-4">Certificados</h3>
                  {portfolio.length === 0 ? (
                    <div className="text-zinc-500 text-center py-8 text-sm bg-dark rounded-2xl border border-white/5">Nenhum certificado publicado ainda.</div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {portfolio.map(p => (
                        <div key={p.id} onClick={() => setMediaViewer(getImageUrl(p.media_url, 'portfolio'))} className="aspect-[4/3] bg-dark rounded-2xl overflow-hidden relative cursor-pointer group border border-white/5">
                          <img src={getImageUrl(p.media_url, 'portfolio')!} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                          {p.media_type === 'video' && (
                            <div className="absolute inset-0 bg-dark/20 flex items-center justify-center">
                              <PlayIcon className="w-8 h-8 text-white drop-shadow-md" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* REVIEWS TAB */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-zinc-500 text-center py-8 text-sm bg-dark rounded-2xl border border-white/5">Ainda não há avaliações.</div>
                ) : (
                  reviews.map(r => (
                    <div key={r.id} className="bg-dark border border-white/5 rounded-2xl p-4">
                      <div className="flex gap-3 mb-3">
                        <div className="w-10 h-10 bg-surface border-border rounded-full overflow-hidden">
                          {r.client?.avatar_url ? (
                            <img src={getImageUrl(r.client.avatar_url)!} className="w-full h-full object-cover" />
                          ) : (
                            <UserCircleIcon className="w-10 h-10 text-zinc-600" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-bold text-sm">{r.client?.full_name || 'Anônimo'}</div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <StarSolidIcon key={star} className={`w-3 h-3 ${star <= r.rating ? 'text-electric' : 'text-zinc-700'}`} />
                            ))}
                          </div>
                        </div>
                      </div>
                      {r.comment && <p className="text-zinc-400 text-sm leading-relaxed">{r.comment}</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent z-40">
        <button 
          onClick={() => setQuickBookBarber(barber)}
          className="w-full bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black py-4 rounded-2xl  active:scale-95 transition-transform"
        >
          Agendar com este barbeiro
        </button>
      </div>

      {/* Media Viewer Modal */}
      <AnimatePresence>
        {mediaViewer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-dark/95 backdrop-blur-md flex flex-col justify-center items-center">
            <button onClick={() => setMediaViewer(null)} className="absolute top-6 right-6 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white z-50">
              <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="relative w-full h-full sm:w-auto sm:aspect-[9/16] sm:h-[85vh] sm:max-h-[800px] sm:rounded-[2rem] overflow-hidden bg-dark shadow-2xl sm:border sm:border-white/10 mx-auto">
              <img src={mediaViewer} className="w-full h-full object-cover" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QuickBook Modal */}
      <QuickBookSheet 
        barber={quickBookBarber} 
        initialService={quickBookService}
        initialDate={quickBookDate}
        initialTime={quickBookTime}
        onClose={() => { 
          setQuickBookBarber(null); 
          setQuickBookService(null); 
          setQuickBookDate(null);
          setQuickBookTime(null);
        }} 
      />

    </div>
  );
}
