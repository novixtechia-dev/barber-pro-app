import { Barber } from '@/types';
import { StarIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { ScissorsIcon, UserCircleIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { BottomSheet } from '../ui/BottomSheet';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface BarberProfilePreviewProps {
  barber: Barber | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function BarberProfilePreview({ barber, isOpen, onClose, onConfirm }: BarberProfilePreviewProps) {
  const [portfolio, setPortfolio] = useState<{ id: string; image_url: string }[]>([]);

  useEffect(() => {
    if (barber && isOpen) {
      supabase
        .from('portfolio_items')
        .select('id, image_url')
        .eq('barber_id', barber.id)
        .order('created_at', { ascending: false })
        .limit(6)
        .then(({ data, error }) => {
          if (!error && data) setPortfolio(data);
        });
    } else {
      setPortfolio([]);
    }
  }, [barber, isOpen]);

  if (!barber) return null;

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="relative p-6 pt-2 pb-8 flex flex-col gap-6">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-0 right-4 p-2 bg-dark rounded-full text-zinc-400 hover:text-white transition-colors z-20"
        >
          <XMarkIcon className="w-5 h-5" />
        </button>

        {/* Info Cabeçalho */}
        <div className="flex items-center gap-4 mt-2">
          <div className="w-20 h-20 bg-surface border-border rounded-full overflow-hidden flex-shrink-0 border-2 border-electric/30">
            {barber.profile?.avatar_url ? (
              <img src={barber.profile.avatar_url} alt={barber.display_name} className="w-full h-full object-cover" />
            ) : (
              <UserCircleIcon className="w-full h-full text-zinc-700" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{barber.display_name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <StarIcon className="w-4 h-4 text-electric" />
                <span className="text-electric font-bold">{barber.rating.toFixed(1)}</span>
                <span className="text-gray-500 text-sm">({barber.total_reviews})</span>
              </div>
              <span className="text-gray-600 text-sm">•</span>
              <span className="text-gray-400 text-sm">{barber.experience_years} anos exp.</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {barber.bio && (
          <div className="text-gray-300 text-sm leading-relaxed">
            {barber.bio}
          </div>
        )}

        {/* Especialidades */}
        {barber.specialties && barber.specialties.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
              <ScissorsIcon className="w-4 h-4 text-electric" /> Especialidades
            </h3>
            <div className="flex flex-wrap gap-2">
              {barber.specialties.map(spec => (
                <span key={spec} className="px-3 py-1 bg-electric/10 text-electric text-electric text-xs font-semibold rounded-full">
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Portfolio */}
        {portfolio.length > 0 && (
          <div>
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2 text-sm">
              <PhotoIcon className="w-4 h-4 text-electric" /> Portfólio
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {portfolio.map(item => (
                <div key={item.id} className="w-24 h-24 flex-shrink-0 bg-surface border-border rounded-xl overflow-hidden">
                  <img src={item.image_url} className="w-full h-full object-cover" alt="Portfolio" />
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onConfirm}
          className="w-full bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold py-4 rounded-2xl active:scale-95 transition-transform mt-2"
        >
          Agendar com {barber.display_name.split(' ')[0]}
        </button>
      </div>
    </BottomSheet>
  );
}
