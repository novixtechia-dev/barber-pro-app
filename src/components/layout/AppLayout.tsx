'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bars3Icon, BellIcon, ArrowLeftIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import Sidebar from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-dark text-white flex flex-col md:flex-row">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-[280px]">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-dark/80 backdrop-blur-xl border-b border-white/5 px-4 py-3">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-3">
              {pathname !== '/home' && (
                <button
                  onClick={() => router.back()}
                  className="p-2 -ml-2 hover:bg-dark rounded-full transition-colors"
                >
                  <ArrowLeftIcon className="w-6 h-6 text-white" />
                </button>
              )}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden p-2 -ml-2 hover:bg-dark rounded-full transition-colors"
              >
                <Bars3Icon className="w-6 h-6 text-white" />
              </button>
              {/* Oculto no desktop pois a Sidebar já tem a logo */}
              <div className="md:hidden flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-electric to-primary rounded-lg flex items-center justify-center">
                  <span className="text-black font-bold text-xs">BP</span>
                </div>
                <span className="font-bold text-white tracking-wider text-sm">BARBER PRO</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {(profile?.role === 'barber' || profile?.role === 'admin') && (
                <button 
                  onClick={() => router.push(profile.role === 'admin' ? '/admin/dashboard' : '/barber/dashboard')}
                  className="p-2 hover:bg-dark rounded-full transition-colors"
                >
                  <Cog6ToothIcon className="w-5 h-5 text-electric" />
                </button>
              )}
              <button onClick={() => {
                router.push('/notifications');
              }} className="relative p-2 hover:bg-dark rounded-full transition-colors">
                <BellIcon className="w-5 h-5 text-gray-400" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-electric rounded-full" />
              </button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="max-w-5xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
