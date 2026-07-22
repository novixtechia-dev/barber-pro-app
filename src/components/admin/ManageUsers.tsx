'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { UserCircleIcon, MagnifyingGlassIcon, ArrowPathIcon, ShieldCheckIcon, ScissorsIcon, XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CheckBadgeIcon, StarIcon } from '@heroicons/react/24/solid';

const ROLE_COLORS: Record<string, string> = {
  client: 'text-zinc-400 bg-surface border-border border-zinc-700',
  frequent: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  barber: 'text-electric bg-electric/10 text-electric border-electric/30',
  admin: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
};

export default function ManageUsers() {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [promoting, setPromoting] = useState<string | null>(null);
  const [confirmUser, setConfirmUser] = useState<any | null>(null);
  const [targetRole, setTargetRole] = useState<string>('barber');
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => { if (profile) fetchUsers(); }, [profile]);
  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(users.filter(u =>
      (u.full_name || '').toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone || '').toLowerCase().includes(q) ||
      u.barbers?.some((b: any) => (b.display_name || '').toLowerCase().includes(q))
    ));
  }, [search, users]);

  const fetchUsers = async () => {
    setLoading(true);

    // Busca todos os perfis
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, avatar_url, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching profiles:", error);
    }

    if (!profiles) { setLoading(false); return; }

    let targetProfiles = profiles;

    if (profile?.role === 'barber') {
      const { data: barberProfile } = await supabase.from('barbers').select('id').eq('profile_id', profile.id).single();
      if (barberProfile) {
        const { data: bookings } = await supabase.from('bookings').select('client_id').eq('barber_id', barberProfile.id);
        const bookedIds = new Set((bookings || []).map(b => b.client_id));
        
        const { data: favs } = await supabase.from('favorite_barbers').select('client_id').eq('barber_id', barberProfile.id);
        const favIds = new Set((favs || []).map(f => f.client_id));
        
        targetProfiles = profiles.filter(p => bookedIds.has(p.id) || favIds.has(p.id));
      } else {
        targetProfiles = [];
      }
    }

    // Para cada usuário, busca os barbeiros vinculados via bookings (completed)
    const enriched = await Promise.all(targetProfiles.map(async (p) => {
      if (p.role === 'client') {
        // Busca barbeiros únicos com quem o cliente já teve booking
        const { data: bookings } = await supabase
          .from('bookings')
          .select('barber_id, barber:barbers(id, display_name)')
          .eq('client_id', p.id)
          .in('status', ['completed', 'confirmed']);

        const uniqueBarbers: Record<string, any> = {};
        (bookings || []).forEach((b: any) => {
          if (b.barber_id && b.barber) {
            uniqueBarbers[b.barber_id] = b.barber;
          }
        });

        return {
          ...p,
          barbers: Object.values(uniqueBarbers),
          total_cuts: bookings?.filter(b => b.barber_id).length || 0,
        };
      }
      return { ...p, barbers: [], total_cuts: 0 };
    }));

    setUsers(enriched);
    setFiltered(enriched);
    setLoading(false);
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const promoteUser = async () => {
    if (!confirmUser) return;
    setPromoting(confirmUser.id);
    setConfirmUser(null);

    if (targetRole === 'barber') {
      const { data: existing } = await supabase.from('barbers').select('id').eq('profile_id', confirmUser.id).maybeSingle();
      if (!existing) {
        // Obter uma unidade padrão (a primeira que existir)
        const { data: unit } = await supabase.from('units').select('id').limit(1).maybeSingle();
        
        const { error: barberError } = await supabase.from('barbers').insert({
          profile_id: confirmUser.id,
          display_name: confirmUser.full_name,
          is_active: true,
          experience_years: 1,
          specialties: [],
          unit_id: unit?.id
        });

        if (barberError) {
          console.error('Erro ao criar perfil de barbeiro:', barberError);
          showToast('Erro ao criar perfil de barbeiro. Verifique o console.');
          setPromoting(null);
          return;
        }
      }
    }

    await supabase.from('profiles').update({ role: targetRole }).eq('id', confirmUser.id);
    setUsers(u => u.map(x => x.id === confirmUser.id ? { ...x, role: targetRole } : x));
    const ROLE_LABELS: Record<string, string> = { client: 'Cliente', barber: 'Barbeiro', admin: 'Admin', banned: 'Banido' };
    showToast(`${confirmUser.full_name} agora é ${ROLE_LABELS[targetRole] ?? targetRole}! ✅`);
    setPromoting(null);
  };

  const deleteUser = async () => {
    if (!deletingUser || !profile) return;
    setIsDeleting(true);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: deletingUser.id, adminId: profile.id })
      });
      if (!res.ok) throw new Error('Falha ao excluir usuário');
      
      setUsers(u => u.filter(x => x.id !== deletingUser.id));
      showToast(`${deletingUser.full_name} foi excluído permanentemente. 🗑️`);
    } catch (e) {
      console.error(e);
      alert('Erro ao excluir usuário.');
    } finally {
      setIsDeleting(false);
      setDeletingUser(null);
    }
  };

  // Rótulo visual do usuário
  const getUserLabel = (user: any) => {
    if (user.role === 'banned') return { label: 'Banido', color: 'bg-red-500/10 text-red-500 border-red-500/30' };
    if (user.role === 'admin') return { label: 'Admin', color: ROLE_COLORS.admin };
    if (user.role === 'barber') return { label: 'Barbeiro', color: ROLE_COLORS.barber };
    if (user.total_cuts >= 2) return { label: `Cliente · ${user.total_cuts} cortes`, color: ROLE_COLORS.frequent };
    return { label: user.total_cuts === 1 ? 'Novo · 1 corte' : 'Cadastrado', color: ROLE_COLORS.client };
  };

  // Estatísticas
  const totalClients = users.filter(u => u.role === 'client').length;
  const totalFrequent = users.filter(u => u.role === 'client' && u.total_cuts >= 2).length;
  const totalBarbers = users.filter(u => u.role === 'barber').length;
  const totalAdmins = users.filter(u => u.role === 'admin').length;

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-white">Gestão de Usuários</h2>
          <p className="text-zinc-500 text-sm mt-0.5">{users.length} usuários cadastrados</p>
        </div>
        <button onClick={fetchUsers} className="p-2 rounded-xl bg-dark border border-white/5 text-zinc-400 hover:text-white transition-colors">
          <ArrowPathIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, telefone ou barbeiro..."
          className="w-full pl-10 pr-4 py-3 bg-dark border border-white/5 rounded-xl text-white placeholder-zinc-600 focus:outline-none focus:border-electric/30 text-sm"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-700 bg-surface border-border p-3 text-center">
          <div className="text-2xl font-black text-zinc-300">{totalClients}</div>
          <div className="text-xs font-medium text-zinc-500 mt-0.5">Cadastrados</div>
        </div>
        <div className="rounded-xl border border-blue-400/30 bg-blue-400/10 p-3 text-center">
          <div className="text-2xl font-black text-blue-400">{totalFrequent}</div>
          <div className="text-xs font-medium text-blue-400/70 mt-0.5">Clientes (2+ cortes)</div>
        </div>
        <div className="rounded-xl border border-electric/30 bg-electric/10 text-electric p-3 text-center">
          <div className="text-2xl font-black text-electric">{totalBarbers}</div>
          <div className="text-xs font-medium text-electric/70 mt-0.5">Barbeiros</div>
        </div>
        <div className="rounded-xl border border-purple-400/30 bg-purple-400/10 p-3 text-center">
          <div className="text-2xl font-black text-purple-400">{totalAdmins}</div>
          <div className="text-xs font-medium text-purple-400/70 mt-0.5">Admins</div>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => {
            const { label, color } = getUserLabel(user);
            return (
              <div key={user.id} className="bg-dark border border-white/5 rounded-2xl p-4 flex items-start gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-surface border-border flex-shrink-0 overflow-hidden flex items-center justify-center mt-0.5">
                  {user.avatar_url
                    ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <UserCircleIcon className="w-8 h-8 text-zinc-600" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-white truncate">{user.full_name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${color}`}>
                      {label}
                    </span>
                  </div>
                  {user.email && <p className="text-xs text-zinc-500 mt-0.5">{user.email}</p>}
                  <p className="text-xs text-zinc-500 mt-0.5">{user.phone || 'Sem telefone'}</p>

                  {/* Barbeiros vinculados */}
                  {user.barbers && user.barbers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {user.barbers.map((b: any) => (
                        <span key={b.id} className="inline-flex items-center gap-1 text-xs text-electric/80 bg-electric/5 border border-electric/15 px-2 py-0.5 rounded-full">
                          <ScissorsIcon className="w-3 h-3" />
                          {b.display_name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
                  {user.role === 'client' && (
                    <button
                      onClick={() => { setConfirmUser(user); setTargetRole('barber'); }}
                      disabled={promoting === user.id}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-electric/10 text-electric border border-electric/30 text-electric rounded-xl hover:bg-electric/20 text-electric transition-colors disabled:opacity-50"
                    >
                      <ScissorsIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Barbeiro</span>
                    </button>
                  )}
                  {profile?.role === 'admin' && user.role !== 'admin' && (
                    <button
                      onClick={() => { setConfirmUser(user); setTargetRole('admin'); }}
                      disabled={promoting === user.id}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-purple-400/10 border border-purple-400/30 text-purple-400 rounded-xl hover:bg-purple-400/20 transition-colors disabled:opacity-50"
                    >
                      <ShieldCheckIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </button>
                  )}
                  {user.role !== 'client' && user.role !== 'banned' && (
                    <button
                      onClick={() => { setConfirmUser(user); setTargetRole('client'); }}
                      disabled={promoting === user.id}
                      className="text-xs font-bold px-3 py-2 bg-surface border-border border border-zinc-700 text-zinc-400 rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
                    >
                      ↩ Cliente
                    </button>
                  )}
                  {profile?.role === 'admin' && user.role !== 'admin' && user.role !== 'banned' && (
                    <button
                      onClick={() => { setConfirmUser(user); setTargetRole('banned'); }}
                      disabled={promoting === user.id}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors disabled:opacity-50"
                    >
                      <XMarkIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Banir</span>
                    </button>
                  )}
                  {profile?.role === 'admin' && user.role !== 'admin' && (
                    <button
                      onClick={() => setDeletingUser(user)}
                      disabled={promoting === user.id}
                      className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-red-900/40 border border-red-700/50 text-red-400 rounded-xl hover:bg-red-900/60 transition-colors disabled:opacity-50"
                    >
                      <TrashIcon className="w-4 h-4" />
                      <span className="hidden sm:inline">Excluir</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-12 text-zinc-600">
              <UserCircleIcon className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>Nenhum usuário encontrado</p>
            </div>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      {confirmUser && (
        <div className="fixed inset-0 z-50 bg-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark border border-white/10 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <CheckBadgeIcon className="w-12 h-12 text-electric mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white text-center mb-2">Confirmar alteração</h3>
            <p className="text-zinc-400 text-sm text-center mb-6">
              {targetRole === 'banned' ? (
                <>Banir o usuário <span className="text-white font-semibold">{confirmUser.full_name}</span> do aplicativo?</>
              ) : (
                <>
                  Tornar <span className="text-white font-semibold">{confirmUser.full_name}</span> em{' '}
                  <span className="font-bold" style={{ color: targetRole === 'barber' ? '#fbbf24' : targetRole === 'admin' ? '#a78bfa' : '#71717a' }}>
                    {{ client: 'Cliente', barber: 'Barbeiro', admin: 'Admin' }[targetRole as string]}
                  </span>?
                </>
              )}
              {targetRole === 'barber' && <span className="block mt-1 text-xs text-zinc-500">Um perfil de barbeiro será criado automaticamente.</span>}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmUser(null)} className="flex-1 py-3 rounded-xl bg-dark text-zinc-400 font-semibold hover:bg-surface border-border transition-colors">
                Cancelar
              </button>
              <button onClick={promoteUser} className="flex-1 py-3 rounded-xl bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold hover:brightness-110 transition-colors">
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-[60] bg-dark/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-dark border border-red-500/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <TrashIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white text-center mb-2">Excluir permanentemente?</h3>
            <p className="text-zinc-400 text-sm text-center mb-6">
              A exclusão do usuário <span className="text-white font-semibold">{deletingUser.full_name}</span> é <span className="text-red-400 font-bold">irreversível</span>. Todo o histórico, agendamentos e conta serão apagados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingUser(null)} className="flex-1 py-3 rounded-xl bg-dark text-zinc-400 font-semibold hover:bg-surface border-border transition-colors">
                Cancelar
              </button>
              <button onClick={deleteUser} disabled={isDeleting} className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center">
                {isDeleting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-dark border border-white/10 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
