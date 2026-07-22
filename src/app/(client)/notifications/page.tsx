'use client';

import { useState, useEffect } from 'react';
import { BellIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { InformationCircleIcon, DevicePhoneMobileIcon, CheckIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialOS, setTutorialOS] = useState<'ios' | 'android'>('ios');
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'default'>('default');

  useEffect(() => {
    fetchNotifications();
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const fetchNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (data) setNotifications(data);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    setNotifications(n => n.map(notif => notif.id === id ? { ...notif, is_read: true } : notif));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllAsRead = async () => {
    setNotifications(n => n.map(notif => ({ ...notif, is_read: true })));
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', session.user.id).eq('is_read', false);
    }
  };

  return (
    <div className="p-4 pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Notificações</h1>
        {notifications.some(n => !n.is_read) && (
          <button onClick={markAllAsRead} className="text-electric text-sm font-bold bg-electric/10 text-electric px-3 py-1.5 rounded-lg">
            Marcar todas como lidas
          </button>
        )}
      </div>

      {permissionStatus !== 'granted' && (
        <>
          {/* Botão de Ativar Notificações Manual */}
          <div className="mb-4">
            <button 
              onClick={async () => {
                try {
                  const w = window as any;
                  
                  // Verifica se já negou antes no navegador
                  if (typeof window !== 'undefined' && 'Notification' in window) {
                    if (Notification.permission === 'denied') {
                      alert("⚠️ Você bloqueou as notificações anteriormente. Por favor, clique no cadeado 🔒 na barra de endereço lá em cima e altere 'Notificações' para 'Permitir'.");
                      return;
                    }
                  }

                  if (w.OneSignal && w.OneSignal.Notifications) {
                    // Força o pedido de permissão direto (sem depender de slide)
                    await w.OneSignal.Notifications.requestPermission();
                    if (Notification.permission === 'granted') setPermissionStatus('granted');
                  } else if (typeof window !== 'undefined' && 'Notification' in window) {
                    const permission = await Notification.requestPermission();
                    setPermissionStatus(permission);
                    if (permission === 'granted') {
                      new Notification('Barber Pro 🔔', { body: 'Notificações ativadas com sucesso!' });
                    }
                  } else {
                    alert("As notificações só funcionam se você Adicionar à Tela de Início primeiro! Siga o tutorial abaixo.");
                  }
                } catch (e) {
                  console.warn('Push error:', e);
                  alert("Erro ao solicitar permissão. Tente Adicionar à Tela de Início primeiro.");
                }
              }}
              className="w-full bg-gradient-to-r from-electric to-primary text-black font-black rounded-2xl p-4  active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
            >
              <BellIcon className="w-6 h-6" />
              Ativar Notificações no Dispositivo
            </button>
          </div>

          {/* Tutorial de Notificações */}
          <div className="mb-6">
            <button 
              onClick={() => setShowTutorial(!showTutorial)}
              className="w-full bg-dark border border-white/5 rounded-2xl p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-electric/10 text-electric rounded-full flex items-center justify-center text-electric">
                  <InformationCircleIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Não recebe notificações?</h3>
                  <p className="text-zinc-400 text-xs mt-0.5">Veja como ativar no seu celular</p>
                </div>
              </div>
              <ChevronDownIcon className={`w-5 h-5 text-zinc-500 transition-transform ${showTutorial ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showTutorial && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-dark/50 border border-t-0 border-white/5 rounded-b-2xl p-4 -mt-2 pt-6">
                    <div className="flex gap-2 mb-4 bg-dark p-1 rounded-xl">
                      <button 
                        onClick={() => setTutorialOS('ios')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tutorialOS === 'ios' ? 'bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Apple (iPhone/iPad)
                      </button>
                      <button 
                        onClick={() => setTutorialOS('android')}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${tutorialOS === 'android' ? 'bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all' : 'text-zinc-400 hover:text-white'}`}
                      >
                        Android
                      </button>
                    </div>

                    <div className="space-y-3">
                      {tutorialOS === 'ios' ? (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-dark rounded-full flex items-center justify-center text-xs font-bold text-electric border border-white/10 flex-shrink-0">1</div>
                            <p className="text-sm text-zinc-300">Abra o site no navegador <strong className="text-white">Safari</strong>.</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-dark rounded-full flex items-center justify-center text-xs font-bold text-electric border border-white/10 flex-shrink-0">2</div>
                            <p className="text-sm text-zinc-300">Toque no ícone de <strong className="text-white">Compartilhar</strong> (quadrado com seta para cima) na barra inferior.</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-dark rounded-full flex items-center justify-center text-xs font-bold text-electric border border-white/10 flex-shrink-0">3</div>
                            <p className="text-sm text-zinc-300">Role para baixo e selecione <strong className="text-white">Adicionar à Tela de Início</strong>.</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-dark rounded-full flex items-center justify-center text-xs font-bold text-electric border border-white/10 flex-shrink-0">4</div>
                            <p className="text-sm text-zinc-300">Abra o App pela sua Tela de Início e clique no sino de notificações para <strong className="text-white">Permitir</strong>.</p>
                          </div>
                          <div className="mt-4 p-3 bg-electric/10 text-electric rounded-xl border border-electric/30">
                            <p className="text-xs text-electric/90 text-center leading-relaxed">
                              A Apple exige que o aplicativo seja adicionado à tela inicial para poder receber notificações push.
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-dark rounded-full flex items-center justify-center text-xs font-bold text-electric border border-white/10 flex-shrink-0">1</div>
                            <p className="text-sm text-zinc-300">Abra o site no navegador <strong className="text-white">Chrome</strong>.</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-dark rounded-full flex items-center justify-center text-xs font-bold text-electric border border-white/10 flex-shrink-0">2</div>
                            <p className="text-sm text-zinc-300">Toque nos <strong className="text-white">três pontinhos</strong> no canto superior direito.</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-dark rounded-full flex items-center justify-center text-xs font-bold text-electric border border-white/10 flex-shrink-0">3</div>
                            <p className="text-sm text-zinc-300">Selecione <strong className="text-white">Instalar Aplicativo</strong> ou <strong className="text-white">Adicionar à tela inicial</strong>.</p>
                          </div>
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 bg-dark rounded-full flex items-center justify-center text-xs font-bold text-electric border border-white/10 flex-shrink-0">4</div>
                            <p className="text-sm text-zinc-300">Quando for solicitado, selecione <strong className="text-white">Permitir notificações</strong>.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      )}

      <div className="space-y-3">

        {notifications.length === 0 && !loading && (
          <p className="text-zinc-500 text-center py-10">Nenhuma notificação encontrada.</p>
        )}
        {notifications.map(notification => (
          <div 
            key={notification.id} 
            onClick={() => markAsRead(notification.id)}
            className={`bg-dark border ${notification.is_read ? 'border-white/5' : 'border-electric/30'} rounded-2xl p-4 cursor-pointer transition-colors flex gap-4`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${notification.is_read ? 'bg-surface border-border text-zinc-500' : 'bg-electric/20 text-electric text-electric'}`}>
              <BellIcon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-bold ${notification.is_read ? 'text-zinc-300' : 'text-white'}`}>{notification.title}</h3>
                <span className="text-xs text-zinc-500 font-medium whitespace-nowrap ml-2">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </div>
              <p className="text-sm text-zinc-400 leading-snug">{notification.message}</p>
            </div>
            {!notification.is_read && (
              <div className="flex items-center justify-center w-6">
                <div className="w-2.5 h-2.5 bg-electric rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
