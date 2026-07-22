'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  XMarkIcon,
  HomeIcon,
  CalendarDaysIcon,
  ScissorsIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ClipboardDocumentListIcon,
  ClockIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut, user } = useAuth();

  const nav = [
    { href: '/home', label: 'Início', icon: HomeIcon },
    { href: '/booking', label: 'Agendar', icon: CalendarDaysIcon },
    { href: '/services', label: 'Serviços', icon: ScissorsIcon },
    { href: '/bookings', label: 'Meus Agendamentos', icon: ClipboardDocumentListIcon },
    { href: '/barbers', label: 'Barbeiros', icon: ScissorsIcon },
    { href: '/favorites', label: 'Favoritos', icon: StarIcon },
    { href: '/profile', label: 'Meu Perfil', icon: UserIcon },
  ];

  if (profile?.role === 'admin') {
    nav.unshift({ href: '/admin/dashboard', label: 'Painel Gestor', icon: Cog6ToothIcon });
  } else if (profile?.role === 'barber') {
    nav.unshift({ href: '/barber/dashboard', label: 'Meu Painel', icon: Cog6ToothIcon });
  }

  const roleLabel: Record<string, string> = {
    admin: 'Administrador',
    barber: 'Barbeiro',
    client: 'Cliente',
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
    router.push('/login');
  };

  return (
    <>
      {/* Overlay Escuro */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="md:hidden fixed inset-0 z-[60] bg-dark/60 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Drawer Lateral */}
      <motion.div
        initial={false}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 left-0 z-[70] w-3/4 max-w-sm md:w-[280px] md:max-w-none md:!translate-x-0 bg-dark border-r border-white/10 shadow-2xl flex flex-col"
      >
            {/* Header Sidebar */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-electric to-primary rounded-xl flex items-center justify-center">
                  <span className="text-black font-bold text-sm">BP</span>
                </div>
                <div>
                  <h2 className="text-white font-bold tracking-wider">BARBER PRO</h2>
                  <p className="text-electric text-xs font-medium uppercase tracking-widest">
                    {roleLabel[profile?.role ?? 'client'] ?? profile?.role}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="md:hidden p-2 bg-dark rounded-full text-zinc-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* User Info */}
            <div className="px-6 py-4 border-b border-white/5 bg-dark/30">
              <p className="text-white font-semibold text-base truncate">Olá, {profile?.full_name?.split(' ')[0]}</p>
              {user?.email && <p className="text-zinc-500 text-xs truncate mt-0.5">{user.email}</p>}
            </div>

            {/* Links */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              {nav.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all ${
                      isActive
                        ? 'bg-electric/10 text-electric font-bold'
                        : 'text-zinc-400 hover:bg-dark hover:text-white font-medium'
                    }`}
                  >
                    <item.icon className={`w-6 h-6 ${isActive ? 'text-electric' : 'text-zinc-500'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Footer / Sair */}
            <div className="p-4 border-t border-white/5">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-4 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-2xl transition-colors font-medium"
              >
                <ArrowRightOnRectangleIcon className="w-6 h-6" />
                Sair da conta
              </button>
            </div>
          </motion.div>
    </>
  );
}
