'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

/**
 * Componente de guarda de rota no lado do cliente.
 * Complementa a proteção do middleware — garante que
 * usuários com role errado não vejam o conteúdo mesmo
 * se o JS já carregou.
 */
export default function RoleGuard({ children, allowedRoles, redirectTo }: RoleGuardProps) {
  const { profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!profile) { router.replace('/login'); return; }
    if (!allowedRoles.includes(profile.role)) {
      const fallback = redirectTo ?? (
        profile.role === 'admin' ? '/admin/dashboard' :
        profile.role === 'barber' ? '/barber/dashboard' :
        '/home'
      );
      router.replace(fallback);
    }
  }, [profile, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile || !allowedRoles.includes(profile.role)) return null;

  return <>{children}</>;
}
