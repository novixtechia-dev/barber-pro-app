'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bars3Icon, XMarkIcon, HomeIcon, CurrencyDollarIcon, UsersIcon, 
  UserGroupIcon, CalendarDaysIcon, ScissorsIcon, TagIcon, 
  PlayIcon, BellAlertIcon, UserCircleIcon, ArrowLeftIcon, ArrowRightOnRectangleIcon, BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import AdminOverview from './AdminOverview';
import ManageBarbers from './ManageBarbers';
import ManageServices from './ManageServices';
import ManagePromotions from './ManagePromotions';
import ManageStories from './ManageStories';
import ManageNotifications from './ManageNotifications';
import ManageSchedules from './ManageSchedules';
import ManageCustomers from './ManageCustomers';
import ManageFinance from './ManageFinance';
import ManageUsers from './ManageUsers';
import ManageSettings from './ManageSettings';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

type Tab = 'overview' | 'finance' | 'customers' | 'users' | 'barbers' | 'schedules' | 'services' | 'promotions' | 'stories' | 'notifications' | 'settings';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  const tabs: { id: Tab; label: string; icon: any }[] = [
    { id: 'overview', label: 'Visão Geral', icon: HomeIcon },
    { id: 'finance', label: 'Financeiro', icon: CurrencyDollarIcon },
    { id: 'customers', label: 'Clientes', icon: UsersIcon },
    { id: 'users', label: 'Usuários', icon: UserCircleIcon },
    { id: 'barbers', label: 'Barbeiros', icon: UserGroupIcon },
    { id: 'schedules', label: 'Horários', icon: CalendarDaysIcon },
    { id: 'services', label: 'Serviços', icon: ScissorsIcon },
    { id: 'promotions', label: 'Promoções', icon: TagIcon },
    { id: 'stories', label: 'Stories', icon: PlayIcon },
    { id: 'notifications', label: 'Notificações', icon: BellAlertIcon },
    { id: 'settings', label: 'Configurações', icon: BuildingStorefrontIcon },
  ];

  const handleTabChange = (id: Tab) => {
    setActiveTab(id);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-dark overflow-hidden">
      
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-dark/80 z-40 lg:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside 
        initial={{ x: '-100%' }} animate={{ x: isSidebarOpen ? 0 : '-100%' }} transition={{ type: 'tween' }}
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-dark border-r border-white/5 flex flex-col lg:static lg:translate-x-0 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:!translate-x-0`}
      >
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <h1 className="text-xl font-black text-electric tracking-tight">Painel<span className="text-white">Gestor</span></h1>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/home')} title="Voltar ao App" className="p-2 text-zinc-400 hover:text-electric rounded-xl hover:bg-electric/10 text-electric transition-colors">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-zinc-400 hover:text-white">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium transition-colors ${
                  isActive ? 'bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all ' : 'text-zinc-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-black' : 'text-zinc-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-4 border-t border-white/5 space-y-2">
          <button
            onClick={() => router.push('/home')}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-zinc-400 hover:bg-white/5 hover:text-white transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-zinc-500" />
            Voltar ao App
          </button>
          <button
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl font-medium text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-400" />
            Sair
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-white/5 bg-dark">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-white bg-dark rounded-xl">
              <Bars3Icon className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-bold text-white">{tabs.find(t => t.id === activeTab)?.label}</h1>
          </div>
          <button onClick={() => router.push('/home')} className="p-2 text-zinc-400 hover:text-electric rounded-full transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
        </header>

        {/* Scrollable Area */}
        <main className="flex-1 overflow-y-auto pb-24 lg:pb-8">
          <div className="hidden lg:block p-6 pb-0">
            <h1 className="text-2xl font-bold text-white">{tabs.find(t => t.id === activeTab)?.label}</h1>
          </div>
          
          <div className="animate-fade-in">
            {activeTab === 'overview' && <AdminOverview />}
            {activeTab === 'finance' && <ManageFinance />}
            {activeTab === 'customers' && <ManageCustomers />}
            {activeTab === 'users' && <ManageUsers />}
            {activeTab === 'barbers' && <ManageBarbers />}
            {activeTab === 'schedules' && <ManageSchedules />}
            {activeTab === 'services' && <ManageServices />}
            {activeTab === 'promotions' && <ManagePromotions />}
            {activeTab === 'stories' && <ManageStories />}
            {activeTab === 'notifications' && <ManageNotifications />}
            {activeTab === 'settings' && <ManageSettings />}
          </div>
        </main>
      </div>
    </div>
  );
}
