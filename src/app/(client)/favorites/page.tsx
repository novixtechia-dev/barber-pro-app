'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserCircleIcon, StarIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function FavoritesPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) loadFavorites(user.id);
  }, [user]);

  const loadFavorites = async (clientId: string) => {
    const { data } = await supabase
      .from('favorite_barbers')
      .select('barber:barbers(id, display_name, avatar_url, rating, experience_years, profile:profiles(avatar_url))')
      .eq('client_id', clientId);
    
    setFavorites(data || []);
    setLoading(false);
  };

  const getImageUrl = (path: string | null | undefined) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data?.publicUrl;
  };

  return (
    <div className="p-4 pb-20">
      <h1 className="text-2xl font-bold text-white mb-6">Barbeiros Favoritos</h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
        </div>
      ) : favorites.length === 0 ? (
        <div className="text-center py-20 text-zinc-500">
          <UserCircleIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p>Você ainda não tem barbeiros favoritos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {favorites.map((fav) => {
            const b = fav.barber;
            if (!b) return null;
            return (
              <Link key={b.id} href={`/barber/${b.id}`}>
                <div className="bg-dark border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:border-electric/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-surface border-border rounded-full overflow-hidden flex-shrink-0">
                      {getImageUrl(b.profile?.avatar_url || b.avatar_url) ? (
                        <img src={getImageUrl(b.profile?.avatar_url || b.avatar_url)!} className="w-full h-full object-cover" />
                      ) : (
                        <UserCircleIcon className="w-14 h-14 text-zinc-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-bold">{b.display_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1 text-electric text-xs font-bold bg-electric/10 text-electric px-2 py-0.5 rounded-md">
                          <StarIcon className="w-3 h-3" /> {Number(b.rating || 5).toFixed(1)}
                        </span>
                        <span className="text-zinc-500 text-xs">{b.experience_years} anos exp.</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRightIcon className="w-5 h-5 text-zinc-600" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
