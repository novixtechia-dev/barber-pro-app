'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CalendarIcon, ClockIcon, ScissorsIcon, UserIcon,
  PencilSquareIcon, CheckIcon, XMarkIcon, PhoneIcon,
  CameraIcon, TagIcon, PlusIcon, TrashIcon,
  Bars3Icon, ArrowLeftIcon, UserGroupIcon, ArrowRightOnRectangleIcon,
  PlayIcon, BellAlertIcon, ChartBarIcon, StarIcon
} from '@heroicons/react/24/outline';
import BarberCustomers from '@/components/barber/BarberCustomers';
import RoleGuard from '@/components/ui/RoleGuard';
import ManagePromotions from '@/components/admin/ManagePromotions';
import ManageStories from '@/components/admin/ManageStories';
import ManageNotifications from '@/components/admin/ManageNotifications';
import AdminOverview from '@/components/admin/AdminOverview';
import { useRouter } from 'next/navigation';

const STATUS_STYLES: Record<string, string> = {
  confirmed: 'text-green-400 bg-green-400/10',
  pending: 'text-electric bg-electric/10 text-electric',
  cancelled: 'text-red-400 bg-red-400/10',
  completed: 'text-blue-400 bg-blue-400/10',
};
const STATUS_LABELS: Record<string, string> = {
  confirmed: 'Confirmado', pending: 'Pendente',
  cancelled: 'Cancelado', completed: 'Concluído',
};

const DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function BarberDashboardPage() {
  const { profile, signOut } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'visao_geral' | 'agenda' | 'clientes' | 'perfil' | 'servicos' | 'horarios' | 'aprovacao' | 'promocoes' | 'stories' | 'disparos'>('visao_geral');
  const [activeAgendaTab, setActiveAgendaTab] = useState<'pending' | 'confirmed' | 'completed' | 'cancelled'>('pending');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();

  // --- Cancelamento ---
  const [cancelBookingId, setCancelBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const [barber, setBarber] = useState<any>(null);

  // --- Perfil ---
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ display_name: '', bio: '', whatsapp: '', specialties: '', experience_years: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileToast, setProfileToast] = useState('');

  // --- Serviços ---
  const [allServices, setAllServices] = useState<any[]>([]);
  const [barberServices, setBarberServices] = useState<any[]>([]);
  const [customServices, setCustomServices] = useState<any[]>([]);
  const [addServiceId, setAddServiceId] = useState('');
  const [addCustomPrice, setAddCustomPrice] = useState('');
  const [addingService, setAddingService] = useState(false);
  
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editCustomPrice, setEditCustomPrice] = useState('');

  const [showCreateService, setShowCreateService] = useState(false);
  const [newService, setNewService] = useState({ name: '', description: '', price: '', duration: '30' });
  const [newServiceImage, setNewServiceImage] = useState<File | null>(null);
  const [creatingService, setCreatingService] = useState(false);

  const createCustomService = async () => {
    if (!newService.name || !newService.price || !barber) return;
    setCreatingService(true);
    try {
      let imageUrl = null;
      if (newServiceImage) {
        const fileExt = newServiceImage.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${barber.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage.from('portfolio').upload(filePath, newServiceImage);
        if (uploadError) throw uploadError;
        imageUrl = filePath;
      }
      const { data: created, error } = await supabase.from('services').insert({
        name: newService.name,
        description: newService.description,
        price: parseFloat(newService.price),
        duration_minutes: parseInt(newService.duration),
        image_url: imageUrl,
        barber_id: barber.id,
        is_active: true
      }).select().single();
      if (error) throw error;
      setCustomServices([...customServices, created]);
      setNewService({ name: '', description: '', price: '', duration: '30' });
      setNewServiceImage(null);
      setShowCreateService(false);
      showToast('Serviço criado com sucesso!', setProfileToast);
    } catch (e) {
      console.error(e);
      alert('Erro ao criar serviço.');
    } finally {
      setCreatingService(false);
    }
  };

  const removeCustomService = async (serviceId: string) => {
    if (!confirm('Deseja realmente remover este serviço?')) return;
    try {
      await supabase.from('services').update({ is_active: false }).eq('id', serviceId);
      setCustomServices(customServices.filter(s => s.id !== serviceId));
      showToast('Serviço removido!', setProfileToast);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Horários ---
  const [workDays, setWorkDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('20:00');
  const [slotDuration, setSlotDuration] = useState(30);
  const [savingHorarios, setSavingHorarios] = useState(false);

  const showToast = (msg: string, setter: (v: string) => void) => {
    setter(msg); setTimeout(() => setter(''), 3000);
  };

  // --- Aprovação Automática ---
  const [autoApproveType, setAutoApproveType] = useState('none');
  const [autoApproveTime, setAutoApproveTime] = useState('');
  const [savingAutoApprove, setSavingAutoApprove] = useState(false);

  const saveAutoApprove = async () => {
    if (!barber) return;
    setSavingAutoApprove(true);
    await supabase.from('barbers').update({
      auto_approve_type: autoApproveType,
      auto_approve_time: autoApproveType === 'until_time' ? autoApproveTime : null
    }).eq('id', barber.id);
    setSavingAutoApprove(false);
    showToast('Regras de aprovação salvas! ✅', setProfileToast);
  };

  const loadBarber = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('barbers')
      .select('*, barber_services(*, service:services(id,name,price))')
      .eq('profile_id', profile.id)
      .maybeSingle();
    if (data) {
      setBarber(data);
      setBarberServices(data.barber_services || []);
      setProfileForm({
        display_name: data.display_name || '',
        bio: data.bio || '',
        whatsapp: data.whatsapp || '',
        specialties: (data.specialties || []).join(', '),
        experience_years: String(data.experience_years || ''),
      });
      setAutoApproveType(data.auto_approve_type || 'none');
      setAutoApproveTime(data.auto_approve_time || '');
      // Busca serviços personalizados do barbeiro
      const { data: customData } = await supabase
        .from('services')
        .select('*')
        .eq('barber_id', data.id)
        .eq('is_active', true);
      setCustomServices(customData || []);

      // load work hours from barber_schedule table if exists
      const { data: scheduleData } = await supabase
        .from('barber_schedules')
        .select('*')
        .eq('barber_id', data.id)
        .limit(7);
      if (scheduleData && scheduleData.length > 0) {
        const activeDays = scheduleData.filter((s: any) => s.is_active).map((s: any) => s.day_of_week);
        setWorkDays(activeDays);
        const firstActive = scheduleData.find((s: any) => s.is_active);
        if (firstActive) { setWorkStart(firstActive.starts_at || '09:00'); setWorkEnd(firstActive.ends_at || '20:00'); }
      }
    } else if (profile.role === 'barber' || profile.role === 'admin') {
      // Auto-create barber if missing (e.g., role changed in DB directly)
      const { data: unit } = await supabase.from('units').select('id').limit(1).maybeSingle();
      const { data: newBarber } = await supabase.from('barbers').insert({
        profile_id: profile.id,
        display_name: profile.full_name || 'Novo Barbeiro',
        is_active: true,
        experience_years: 1,
        specialties: [],
        unit_id: unit?.id
      }).select('*, barber_services(*, service:services(id,name,price))').single();

      if (newBarber) {
        setBarber(newBarber);
        setBarberServices([]);
        setProfileForm({
          display_name: newBarber.display_name,
          bio: '',
          whatsapp: '',
          specialties: '',
          experience_years: '1',
        });
      }
    }
  }, [profile]);

  const loadAgenda = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const { data: myBarber } = await supabase.from('barbers').select('id').eq('profile_id', profile.id).maybeSingle();
    if (!myBarber) { setLoading(false); return; }
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { data } = await supabase
      .from('bookings')
      .select('id,scheduled_date,scheduled_time,end_time,status,cancellation_reason,cancelled_by_role,client:profiles!client_id(id,full_name,phone),service:services(name,price,duration_minutes)')
      .eq('barber_id', myBarber.id)
      .eq('scheduled_date', todayStr)
      .order('scheduled_time', { ascending: true });
    setBookings(data || []);
    setLoading(false);
  }, [profile]);

  const [publishingVacancy, setPublishingVacancy] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('services').select('id,name,price').eq('is_active', true).then(({ data }) => setAllServices(data || []));
    loadBarber();
    loadAgenda();
  }, [profile]);

  const handleCancelBooking = async () => {
    if (!cancelBookingId || !barber) return;
    setCancelling(true);

    try {
      const booking = bookings.find(b => b.id === cancelBookingId);
      
      // 1. Atualizar banco de dados
      await supabase
        .from('bookings')
        .update({ status: 'cancelled', cancellation_reason: cancelReason, cancelled_by_role: 'barber' })
        .eq('id', cancelBookingId);

      // Se temos o cliente, enviamos push e app notification
      if (booking?.client?.id) {
        const barberFirstName = barber.display_name.split(' ')[0].toUpperCase();
        const msg = `${barberFirstName}: ${cancelReason || 'Sem descrição'}`;
        
        // App notification
        await supabase.from('notifications').insert({
          user_id: booking.client.id,
          title: 'CANCELAMENTO ❌',
          message: msg
        });

        // Push
        await fetch('/api/notify-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: booking.client.id,
            title: 'CANCELAMENTO ❌',
            message: msg
          })
        }).catch(console.error);
      }

      await loadAgenda();
      setCancelBookingId(null);
      setCancelReason('');
      showToast('Agendamento cancelado!', setProfileToast);
    } catch (error) {
      console.error(error);
      alert('Erro ao cancelar.');
    } finally {
      setCancelling(false);
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', bookingId);
      
      if (booking.client?.id) {
        const dateParts = booking.scheduled_date?.split('-') || [];
        const dateStr = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : booking.scheduled_date;
        const timeStr = booking.scheduled_time?.substring(0, 5);
        const msg = `Aprovado, ${dateStr} às ${timeStr}, ${booking.service?.name}`;
        
        // Push
        await fetch('/api/notify-client', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clientId: booking.client.id,
            title: 'AGENDAMENTO APROVADO! ✅',
            message: msg
          })
        }).catch(console.error);

        // Notificação in-app
        await supabase.from('notifications').insert({
          user_id: booking.client.id,
          title: 'AGENDAMENTO APROVADO! ✅',
          message: msg
        });
      }

      await loadAgenda();
      showToast('Agendamento aprovado!', setProfileToast);
    } catch (e) {
      console.error(e);
      alert('Erro ao aprovar.');
    }
  };

  const handleCompleteBooking = async (bookingId: string) => {
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) return;

      // Atualiza o status do agendamento para concluído
      await supabase.from('bookings').update({ status: 'completed' }).eq('id', bookingId);
      
      // Atualiza o status do pagamento para pago
      await supabase.from('payments').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('booking_id', bookingId);
      
      if (barber?.profile_id) {
        const priceStr = booking.service?.price ? `R$ ${Number(booking.service.price).toFixed(2).replace('.', ',')}` : 'Valor a definir';
        const msg = `${booking.service?.name || 'Serviço'}, ${priceStr}`;
        
        await fetch('/api/notify-barber', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            barberId: barber.profile_id,
            title: 'Novo pix recebido! 💰',
            message: msg
          })
        }).catch(console.error);
      }
      
      await loadAgenda();
      showToast('Corte finalizado com sucesso! ✅', setProfileToast);
    } catch (e) {
      console.error(e);
      alert('Erro ao concluir agendamento.');
    }
  };

  // --- Divulgação de Vaga ---
  const handleBroadcastVacancy = async (booking: any) => {
    setPublishingVacancy(booking.id);
    try {
      const { data: clients } = await supabase
        .from('bookings')
        .select('client_id')
        .eq('barber_id', barber?.id)
        .neq('status', 'cancelled');

      if (!clients || clients.length === 0) {
        alert('Você ainda não tem histórico de clientes para notificar.');
        setPublishingVacancy(null);
        return;
      }

      const uniqueClientIds = Array.from(new Set(clients.map((c: any) => c.client_id)));
      const { data: unit } = await supabase.from('units').select('logo_url').limit(1).single();
      const deepLink = `https://barberpro-nu.vercel.app/booking?barberId=${barber?.id}`;

      const dateObj = new Date(`${booking.scheduled_date}T${booking.scheduled_time}`);
      const formattedDate = format(dateObj, 'dd/MM', { locale: ptBR });
      const time = booking.scheduled_time.substring(0, 5);

      const res = await fetch('/api/notify-barber-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientIds: uniqueClientIds,
          title: 'VAGA DISPONÍVEL 🔥',
          message: `${time} - ${formattedDate}`,
          logoUrl: unit?.logo_url,
          deepLink
        })
      });

      if (!res.ok) throw new Error('Falha ao enviar push');
      
      alert('Vaga divulgada com sucesso para seus clientes! 🚀');
    } catch (e) {
      console.error(e);
      alert('Erro ao divulgar vaga.');
    } finally {
      setPublishingVacancy(null);
    }
  };

  // --- Save profile ---
  const saveProfile = async () => {
    if (!barber) return;
    setSavingProfile(true);
    const specialtiesArr = profileForm.specialties.split(',').map(s => s.trim()).filter(Boolean);
    await supabase.from('barbers').update({
      display_name: profileForm.display_name,
      bio: profileForm.bio,
      whatsapp: profileForm.whatsapp,
      specialties: specialtiesArr,
      experience_years: parseInt(profileForm.experience_years) || 0,
    }).eq('id', barber.id);
    await loadBarber();
    setEditingProfile(false);
    setSavingProfile(false);
    showToast('Perfil salvo! ✅', setProfileToast);
  };

  // --- Serviços ---
  const addService = async () => {
    if (!barber || !addServiceId) return;
    setAddingService(true);
    await supabase.from('barber_services').upsert({
      barber_id: barber.id,
      service_id: addServiceId,
      custom_price: addCustomPrice ? parseFloat(addCustomPrice) : null,
      photos: [],
    });
    await loadBarber();
    setAddServiceId('');
    setAddCustomPrice('');
    setAddingService(false);
  };

  const removeService = async (serviceId: string) => {
    if (!barber) return;
    await supabase.from('barber_services').delete().eq('barber_id', barber.id).eq('service_id', serviceId);
    setBarberServices(bs => bs.filter(b => b.service_id !== serviceId));
  };

  const saveEditedPrice = async (serviceId: string) => {
    if (!barber) return;
    try {
      await supabase.from('barber_services').update({ custom_price: editCustomPrice ? parseFloat(editCustomPrice) : null }).eq('barber_id', barber.id).eq('service_id', serviceId);
      await loadBarber();
      setEditingServiceId(null);
      setEditCustomPrice('');
      showToast('Preço salvo!', setProfileToast);
    } catch (e) {
      console.error(e);
    }
  };

  // --- Horários ---
  const saveHorarios = async () => {
    if (!barber) return;
    setSavingHorarios(true);
    const rows = DAYS.map((_, i) => ({
      barber_id: barber.id,
      day_of_week: i,
      is_active: workDays.includes(i),
      starts_at: workDays.includes(i) ? workStart : '09:00',
      ends_at: workDays.includes(i) ? workEnd : '20:00',
      slot_duration_minutes: slotDuration,
    }));
    for (const row of rows) {
      await supabase.from('barber_schedules').upsert(row, { onConflict: 'barber_id,day_of_week' });
    }
    setSavingHorarios(false);
    showToast('Horários salvos! ✅', setProfileToast);
  };

  const tabs: { id: 'visao_geral' | 'agenda' | 'clientes' | 'perfil' | 'servicos' | 'horarios' | 'aprovacao' | 'promocoes' | 'stories' | 'disparos', label: string, icon: any }[] = [
    { id: 'visao_geral', label: 'Visão Geral', icon: ChartBarIcon },
    { id: 'agenda', label: 'Agenda de Hoje', icon: CalendarIcon },
    { id: 'clientes', label: 'Meus Clientes', icon: UserGroupIcon },
    { id: 'perfil', label: 'Meu Perfil', icon: UserIcon },
    { id: 'servicos', label: 'Meus Serviços', icon: ScissorsIcon },
    { id: 'horarios', label: 'Horários', icon: ClockIcon },
    { id: 'aprovacao', label: 'Aprovação Auto', icon: CheckIcon },
    { id: 'promocoes', label: 'Promoções', icon: TagIcon },
    { id: 'stories', label: 'Stories', icon: PlayIcon },
    { id: 'disparos', label: 'Disparos Push', icon: BellAlertIcon },
  ];

  const handleTabChange = (id: 'visao_geral' | 'agenda' | 'clientes' | 'perfil' | 'servicos' | 'horarios' | 'aprovacao' | 'promocoes' | 'stories' | 'disparos') => {
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
          <h1 className="text-xl font-black text-electric tracking-tight">Painel<span className="text-white">Barbeiro</span></h1>
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
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
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
            <h1 className="text-lg font-black text-electric">Painel<span className="text-white">Barbeiro</span></h1>
          </div>
          <button onClick={() => router.push('/home')} className="p-2 text-zinc-400 hover:text-electric rounded-full transition-colors">
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">

        {/* ─── VISÃO GERAL ─── */}
        {activeTab === 'visao_geral' && (
          <div className="-mx-4 lg:-mx-8">
            <AdminOverview barberId={barber?.id} />
          </div>
        )}

        {/* ─── AGENDA ─── */}
        {activeTab === 'agenda' && (
          <div className="flex flex-col gap-4">
            {/* TABS DE AGENDA */}
            <div className="flex overflow-x-auto gap-2 scrollbar-hide pb-2">
              {[
                { id: 'pending', label: 'Pendentes' },
                { id: 'confirmed', label: 'Em andamento' },
                { id: 'completed', label: 'Concluídos' },
                { id: 'cancelled', label: 'Cancelados' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveAgendaTab(tab.id as any)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
                    activeAgendaTab === tab.id 
                      ? 'bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all ' 
                      : 'bg-dark text-zinc-400 border border-white/5 hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
              </div>
            ) : bookings.filter(b => activeAgendaTab === 'confirmed' ? (b.status === 'confirmed' || b.status === 'in_progress') : b.status === activeAgendaTab).length === 0 ? (
              <div className="text-center py-16 bg-dark border border-white/5 rounded-3xl">
                <CalendarIcon className="w-12 h-12 text-zinc-600 mx-auto mb-4" />
                <h3 className="text-white font-bold mb-1">Nada aqui</h3>
                <p className="text-zinc-500 text-sm">Nenhum agendamento nesta categoria hoje.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bookings.filter(b => activeAgendaTab === 'confirmed' ? (b.status === 'confirmed' || b.status === 'in_progress') : b.status === activeAgendaTab).map((booking, i) => (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-dark/60 border border-white/5 p-4 rounded-2xl flex flex-col gap-3 relative overflow-hidden"
                  >
                    {booking.status === 'pending' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-electric" />}
                    {booking.status === 'confirmed' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-400" />}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="bg-surface border-border p-2 rounded-lg">
                          <ClockIcon className="w-5 h-5 text-electric" />
                        </div>
                        <div>
                          <p className="text-white font-bold text-lg leading-none">{booking.scheduled_time?.substring(0, 5)}</p>
                          <p className="text-zinc-500 text-xs">Até {booking.end_time?.substring(0, 5)}</p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${STATUS_STYLES[booking.status] || 'text-zinc-400 bg-surface border-border'}`}>
                        {STATUS_LABELS[booking.status] || booking.status}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex items-center gap-2 text-white font-semibold">
                        <UserIcon className="w-4 h-4 text-zinc-500" />
                        {booking.client?.full_name || 'Cliente'}
                        {booking.client?.phone && (
                          <a
                            href={`https://wa.me/55${booking.client.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            className="ml-auto flex items-center gap-1 text-xs font-bold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-lg"
                            onClick={e => e.stopPropagation()}
                          >
                            <PhoneIcon className="w-3.5 h-3.5" /> WhatsApp
                          </a>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-400 text-sm bg-dark/30 p-2 rounded-xl">
                        <ScissorsIcon className="w-4 h-4 text-electric" />
                        {booking.service?.name || 'Serviço'}
                        {booking.service?.price && (
                          <span className="ml-auto text-electric font-bold">R$ {Number(booking.service.price).toFixed(2)}</span>
                        )}
                      </div>
                      
                      {booking.status === 'cancelled' && (
                        <div className="mt-2 bg-red-400/10 border border-red-400/20 p-3 rounded-xl flex flex-col gap-3">
                          <div>
                            <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider block mb-1">
                              {booking.cancelled_by_role === 'client' ? 'CANCELADO PELO CLIENTE' : 'CANCELADO POR VOCÊ'}
                            </span>
                            {booking.cancellation_reason && (
                              <span className="text-red-300 text-xs">{booking.cancellation_reason}</span>
                            )}
                          </div>
                          
                          <button
                            onClick={() => handleBroadcastVacancy(booking)}
                            disabled={publishingVacancy === booking.id}
                            className="bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all px-4 py-2 rounded-xl text-xs font-black  active:scale-95 transition-transform disabled:opacity-50"
                          >
                            {publishingVacancy === booking.id ? 'Divulgando...' : 'Divulgar Vaga 🚀'}
                          </button>
                        </div>
                      )}

                      {booking.status === 'pending' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleApproveBooking(booking.id)}
                            className="flex-1 py-2.5 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black text-sm rounded-xl hover:brightness-110 transition-colors  active:scale-95"
                          >
                            Aprovar
                          </button>
                          <button
                            onClick={() => setCancelBookingId(booking.id)}
                            className="px-4 py-2.5 bg-surface border-border text-red-400 font-bold text-sm rounded-xl hover:bg-zinc-700 transition-colors active:scale-95"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>
                      )}

                      {booking.status === 'confirmed' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleCompleteBooking(booking.id)}
                            className="flex-1 py-2 bg-green-400 text-black font-black text-xs rounded-xl hover:bg-green-300 transition-colors shadow-lg shadow-green-400/20 active:scale-95"
                          >
                            Marcar como Concluído
                          </button>
                          <button
                            onClick={() => setCancelBookingId(booking.id)}
                            className="px-3 py-2 bg-red-400/10 text-red-400 border border-red-400/20 rounded-xl text-xs font-bold hover:bg-red-400/20 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal Cancelamento */}
        <AnimatePresence>
          {cancelBookingId && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-dark border border-white/10 rounded-3xl p-6 w-full max-w-sm relative">
                <button onClick={() => setCancelBookingId(null)} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full">
                  <XMarkIcon className="w-5 h-5" />
                </button>
                <h3 className="text-xl font-bold text-white mb-2">Cancelar Agendamento</h3>
                <p className="text-sm text-zinc-400 mb-4">Tem certeza? O cliente será notificado sobre o cancelamento.</p>
                <textarea
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Motivo (ex: Imprevisto, Atraso...)"
                  className="w-full bg-dark border border-white/10 rounded-xl p-3 text-sm text-white mb-4 focus:outline-none focus:border-red-400"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button onClick={() => setCancelBookingId(null)} disabled={cancelling} className="flex-1 py-3 font-bold text-zinc-400 hover:text-white transition-colors disabled:opacity-50">
                    Voltar
                  </button>
                  <button onClick={handleCancelBooking} disabled={cancelling} className="flex-1 py-3 bg-red-400 text-black font-bold rounded-xl hover:bg-red-500 transition-colors disabled:opacity-50">
                    {cancelling ? 'Cancelando...' : 'Confirmar'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── CLIENTES ─── */}
        {activeTab === 'clientes' && <BarberCustomers />}

        {/* ─── MEU PERFIL ─── */}
        {activeTab === 'perfil' && (
          <div className="space-y-6">
            {profileToast && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-dark border border-white/10 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl z-50">
                {profileToast}
              </div>
            )}

            {!barber ? (
              <div className="text-center py-16 text-zinc-500">
                <ScissorsIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Perfil de barbeiro não encontrado.</p>
                <p className="text-xs mt-1">Peça ao administrador para criar seu perfil.</p>
              </div>
            ) : (
              <div className="bg-dark border border-white/5 rounded-3xl p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Informações do Perfil</h2>
                  {!editingProfile ? (
                    <button onClick={() => setEditingProfile(true)} className="flex items-center gap-1.5 text-sm font-semibold text-electric bg-electric/10 text-electric border border-electric/30 px-3 py-1.5 rounded-xl hover:bg-electric/20 text-electric transition-colors">
                      <PencilSquareIcon className="w-4 h-4" /> Editar
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => setEditingProfile(false)} className="p-2 text-zinc-400 hover:text-white bg-surface border-border rounded-xl">
                        <XMarkIcon className="w-4 h-4" />
                      </button>
                      <button onClick={saveProfile} disabled={savingProfile} className="flex items-center gap-1.5 text-sm font-bold text-black bg-electric px-4 py-2 rounded-xl hover:brightness-110 disabled:opacity-50 transition-colors">
                        {savingProfile ? <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <CheckIcon className="w-4 h-4" />}
                        Salvar
                      </button>
                    </div>
                  )}
                </div>

                <div className="bg-electric/10 text-electric border border-electric/30 rounded-2xl p-4 flex flex-col gap-2">
                  <h3 className="text-sm font-bold text-electric flex items-center gap-2">
                    <TagIcon className="w-4 h-4" /> Link de Divulgação (Indicação)
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Envie este link para seus clientes. Ao se cadastrarem, eles ficarão vinculados a você automaticamente!
                  </p>
                  <div className="flex gap-2 mt-1">
                    <input 
                      readOnly 
                      value={typeof window !== 'undefined' ? `${window.location.origin}/register?barber=${barber.id}` : ''} 
                      className="flex-1 bg-dark/50 border border-white/5 rounded-xl px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none" 
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/register?barber=${barber.id}`);
                        showToast('Link copiado! 📋', setProfileToast);
                      }}
                      className="px-3 py-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold text-xs rounded-xl hover:brightness-110 transition-colors shrink-0"
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Nome de Exibição</label>
                    {editingProfile ? (
                      <input value={profileForm.display_name} onChange={e => setProfileForm(p => ({ ...p, display_name: e.target.value }))} className="w-full bg-surface border-border border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-electric/30" />
                    ) : (
                      <p className="text-white font-semibold">{barber.display_name || '—'}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">WhatsApp (com DDD)</label>
                    {editingProfile ? (
                      <input value={profileForm.whatsapp} onChange={e => setProfileForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="(11) 99999-9999" className="w-full bg-surface border-border border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-electric/30" />
                    ) : barber.whatsapp ? (
                      <a href={`https://wa.me/55${barber.whatsapp.replace(/\D/g, '')}`} target="_blank" className="inline-flex items-center gap-1.5 text-green-400 font-semibold hover:underline">
                        <PhoneIcon className="w-4 h-4" /> {barber.whatsapp}
                      </a>
                    ) : <p className="text-zinc-500">—</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Anos de Experiência</label>
                    {editingProfile ? (
                      <input type="number" value={profileForm.experience_years} onChange={e => setProfileForm(p => ({ ...p, experience_years: e.target.value }))} className="w-full bg-surface border-border border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-electric/30" />
                    ) : (
                      <p className="text-white font-semibold">{barber.experience_years || 0} anos</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Especialidades (separadas por vírgula)</label>
                    {editingProfile ? (
                      <input value={profileForm.specialties} onChange={e => setProfileForm(p => ({ ...p, specialties: e.target.value }))} placeholder="Degradê, Barba, Navalhado" className="w-full bg-surface border-border border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-electric/30" />
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {(barber.specialties || []).map((s: string) => (
                          <span key={s} className="text-xs font-semibold text-electric bg-electric/10 text-electric border border-electric/30 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                        {!(barber.specialties || []).length && <p className="text-zinc-500">—</p>}
                      </div>
                    )}
                  </div>
                  <div className="col-span-full">
                    <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Bio (aparece no perfil público)</label>
                    {editingProfile ? (
                      <textarea value={profileForm.bio} onChange={e => setProfileForm(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Conte um pouco sobre você..." className="w-full bg-surface border-border border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-electric/30 resize-none" />
                    ) : (
                      <p className="text-zinc-300 text-sm leading-relaxed">{barber.bio || '—'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── MEUS SERVIÇOS ─── */}
        {activeTab === 'servicos' && (
          <div className="space-y-5">
            {!barber ? (
              <div className="text-center py-16 text-zinc-500">
                <ScissorsIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Perfil de barbeiro não encontrado.</p>
              </div>
            ) : (
              <>
                {/* ─── SERVIÇOS EXCLUSIVOS DO BARBEIRO ─── */}
                <div className="bg-dark border border-electric/30 rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-electric font-bold flex items-center gap-2">
                        <StarIcon className="w-5 h-5" /> Serviços Exclusivos
                      </h3>
                      <p className="text-xs text-zinc-400 mt-1">Serviços que você criou.</p>
                    </div>
                    <button onClick={() => setShowCreateService(true)} className="flex items-center gap-1.5 px-3 py-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all text-sm font-bold rounded-xl hover:brightness-110 transition-colors">
                      <PlusIcon className="w-4 h-4" /> Novo
                    </button>
                  </div>

                  {customServices.length === 0 ? (
                    <div className="text-center py-6 text-zinc-600 bg-dark/20 rounded-xl border border-white/5">
                      <p className="text-sm">Você ainda não criou serviços exclusivos.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customServices.map(s => (
                        <div key={s.id} className="bg-dark/50 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-surface border-border flex items-center justify-center flex-shrink-0 overflow-hidden border border-white/10">
                            {s.image_url ? (
                              <img src={s.image_url.startsWith('http') ? s.image_url : supabase.storage.from('portfolio').getPublicUrl(s.image_url).data.publicUrl} className="w-full h-full object-cover" />
                            ) : (
                              <ScissorsIcon className="w-5 h-5 text-zinc-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-bold text-sm">{s.name}</p>
                            <p className="text-electric font-bold text-xs">R$ {Number(s.price).toFixed(2)} <span className="text-zinc-500 font-normal">· {s.duration_minutes} min</span></p>
                          </div>
                          <button onClick={() => removeCustomService(s.id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── SERVIÇOS DA BARBEARIA ─── */}
                <div className="bg-dark border border-white/5 rounded-2xl p-5 space-y-3 mt-4">
                  <h3 className="text-white font-bold">Serviços da Barbearia (Globais)</h3>
                  <p className="text-xs text-zinc-400 mb-2">Vincule serviços padronizados da barbearia à sua agenda.</p>
                  <div className="flex gap-3 flex-wrap">
                    <select
                      value={addServiceId}
                      onChange={e => setAddServiceId(e.target.value)}
                      className="flex-1 min-w-0 bg-surface border-border border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                    >
                      <option value="">Selecione um serviço...</option>
                      {allServices.filter(s => !barberServices.some(bs => bs.service_id === s.id)).map(s => (
                        <option key={s.id} value={s.id}>{s.name} — R$ {Number(s.price).toFixed(2)}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={addCustomPrice}
                      onChange={e => setAddCustomPrice(e.target.value)}
                      placeholder="Preço próprio (opcional)"
                      className="w-44 bg-surface border-border border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none"
                    />
                    <button onClick={addService} disabled={!addServiceId || addingService} className="flex items-center gap-1.5 px-4 py-2.5 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all text-sm font-bold rounded-xl hover:brightness-110 disabled:opacity-40 transition-colors">
                      <PlusIcon className="w-4 h-4" /> Adicionar
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {barberServices.length === 0 ? (
                    <div className="text-center py-10 text-zinc-600">
                      <TagIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Nenhum serviço adicionado ainda.</p>
                    </div>
                  ) : barberServices.map(bs => (
                    <div key={bs.service_id} className="bg-dark border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-electric/10 text-electric flex items-center justify-center flex-shrink-0">
                        <ScissorsIcon className="w-5 h-5 text-electric" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-semibold">{bs.service?.name || 'Serviço'}</p>
                        
                        {editingServiceId === bs.service_id ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="number"
                              value={editCustomPrice}
                              onChange={e => setEditCustomPrice(e.target.value)}
                              placeholder={bs.service?.price || '0'}
                              className="w-24 bg-surface border-border border border-white/10 rounded-md px-2 py-1 text-white text-xs focus:outline-none"
                            />
                            <button onClick={() => saveEditedPrice(bs.service_id)} className="text-xs bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all px-2 py-1 rounded-md font-bold">
                              Salvar
                            </button>
                            <button onClick={() => setEditingServiceId(null)} className="text-xs text-zinc-400 px-2 py-1 hover:text-white">
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <p className="text-zinc-500 text-xs">
                            {bs.custom_price
                              ? <><span className="text-electric font-bold">R$ {Number(bs.custom_price).toFixed(2)}</span> (preço personalizado)</>
                              : <>R$ {Number(bs.service?.price || 0).toFixed(2)} (preço padrão)</>
                            }
                          </p>
                        )}
                      </div>
                      
                      {editingServiceId !== bs.service_id && (
                        <div className="flex gap-1">
                          <button 
                            onClick={() => {
                              setEditingServiceId(bs.service_id);
                              setEditCustomPrice(bs.custom_price ? String(bs.custom_price) : '');
                            }} 
                            className="p-2 text-zinc-400 hover:bg-white/5 hover:text-white rounded-xl transition-colors"
                          >
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => removeService(bs.service_id)} className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
            
            {/* Modal Criar Serviço Customizado */}
            <AnimatePresence>
              {showCreateService && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-dark/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-dark border border-white/10 rounded-3xl p-6 w-full max-w-md relative max-h-[90vh] overflow-y-auto">
                    <button onClick={() => setShowCreateService(false)} className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white bg-white/5 rounded-full">
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                    <h3 className="text-xl font-bold text-white mb-6">Novo Serviço</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1.5">NOME DO SERVIÇO</label>
                        <input value={newService.name} onChange={e => setNewService(s => ({ ...s, name: e.target.value }))} placeholder="Ex: Platinado" className="w-full bg-dark border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-electric/30" />
                      </div>
                      
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-zinc-500 mb-1.5">PREÇO (R$)</label>
                          <input type="number" value={newService.price} onChange={e => setNewService(s => ({ ...s, price: e.target.value }))} placeholder="0.00" className="w-full bg-dark border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-electric/30" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-zinc-500 mb-1.5">DURAÇÃO (MIN)</label>
                          <select value={newService.duration} onChange={e => setNewService(s => ({ ...s, duration: e.target.value }))} className="w-full bg-dark border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-electric/30">
                            <option value="15">15 min</option>
                            <option value="30">30 min</option>
                            <option value="45">45 min</option>
                            <option value="60">1h</option>
                            <option value="90">1h 30m</option>
                            <option value="120">2h</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1.5">FOTO DO SERVIÇO (OPCIONAL)</label>
                        <label className="flex items-center gap-3 cursor-pointer group bg-dark border border-white/10 rounded-xl p-3">
                          <div className="w-12 h-12 bg-surface border-border rounded-lg flex items-center justify-center group-hover:bg-electric/10 text-electric transition-colors">
                            <CameraIcon className="w-5 h-5 text-zinc-400 group-hover:text-electric" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-semibold">{newServiceImage ? newServiceImage.name : 'Escolher Imagem'}</p>
                            <p className="text-zinc-500 text-xs">JPG ou PNG, max 5MB</p>
                          </div>
                          <input type="file" accept="image/*" onChange={e => e.target.files && setNewServiceImage(e.target.files[0])} className="hidden" />
                        </label>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1.5">DESCRIÇÃO (OPCIONAL)</label>
                        <textarea value={newService.description} onChange={e => setNewService(s => ({ ...s, description: e.target.value }))} rows={2} placeholder="Ex: Descoloração completa + matização" className="w-full bg-dark border border-white/10 rounded-xl px-3 py-3 text-white text-sm focus:outline-none focus:border-electric/30 resize-none" />
                      </div>

                      <button 
                        onClick={createCustomService} 
                        disabled={creatingService || !newService.name || !newService.price} 
                        className="w-full py-4 mt-2 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-black rounded-xl hover:brightness-110 disabled:opacity-50 transition-colors "
                      >
                        {creatingService ? 'Criando...' : 'Criar Serviço'}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

        )}

        {/* ─── HORÁRIOS ─── */}
        {activeTab === 'horarios' && (
          <div className="space-y-6">
            {profileToast && (
              <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-dark border border-white/10 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-2xl z-50">
                {profileToast}
              </div>
            )}
            <div className="bg-dark border border-white/5 rounded-3xl p-6 space-y-6">
              <div>
                <h3 className="text-white font-bold mb-1">Dias de Atendimento</h3>
                <p className="text-zinc-500 text-xs mb-4">Selecione quais dias você trabalha</p>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => setWorkDays(d => d.includes(i) ? d.filter(x => x !== i) : [...d, i].sort())}
                      className={`w-12 h-12 rounded-xl text-sm font-bold transition-all ${workDays.includes(i) ? 'bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all shadow-lg' : 'bg-surface border-border text-zinc-500 hover:bg-zinc-700'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Início do Atendimento</label>
                  <input type="time" value={workStart} onChange={e => setWorkStart(e.target.value)} className="w-full bg-surface border-border border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-electric/30" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Fim do Atendimento</label>
                  <input type="time" value={workEnd} onChange={e => setWorkEnd(e.target.value)} className="w-full bg-surface border-border border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-electric/30" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase tracking-wider">Duração do Slot (minutos)</label>
                <div className="flex gap-2">
                  {[15, 30, 45, 60].map(d => (
                    <button key={d} onClick={() => setSlotDuration(d)} className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${slotDuration === d ? 'bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all' : 'bg-surface border-border text-zinc-400 hover:bg-zinc-700'}`}>
                      {d}min
                    </button>
                  ))}
                </div>
              </div>

              <button onClick={saveHorarios} disabled={savingHorarios} className="w-full py-3 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {savingHorarios ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                {savingHorarios ? 'Salvando...' : 'Salvar Horários'}
              </button>
            </div>
          </div>
        )}

        {/* ─── APROVAÇÃO AUTO ─── */}
        {activeTab === 'aprovacao' && (
          <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="bg-dark border border-white/5 rounded-3xl p-6 lg:p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-white mb-2">Aprovação Automática</h3>
                <p className="text-sm text-zinc-400">
                  Defina como os novos agendamentos serão tratados. Por padrão, eles caem na aba "Pendentes" e você precisa aprovar manualmente.
                </p>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-4 p-4 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors">
                  <input type="radio" name="auto_approve" value="none" checked={autoApproveType === 'none'} onChange={() => setAutoApproveType('none')} className="mt-1 accent-electric" />
                  <div>
                    <div className="font-bold text-white">Manual (Padrão)</div>
                    <div className="text-xs text-zinc-400 mt-1">Requer que você aprove manualmente cada agendamento.</div>
                  </div>
                </label>

                <label className="flex items-start gap-4 p-4 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors">
                  <input type="radio" name="auto_approve" value="all" checked={autoApproveType === 'all'} onChange={() => setAutoApproveType('all')} className="mt-1 accent-electric" />
                  <div>
                    <div className="font-bold text-white">Aprovar Todos Automaticamente</div>
                    <div className="text-xs text-zinc-400 mt-1">Todo agendamento será confirmado e cairá direto em "Em andamento".</div>
                  </div>
                </label>

                <label className="flex items-start gap-4 p-4 border border-white/10 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors">
                  <input type="radio" name="auto_approve" value="until_time" checked={autoApproveType === 'until_time'} onChange={() => setAutoApproveType('until_time')} className="mt-1 accent-electric" />
                  <div className="flex-1">
                    <div className="font-bold text-white">Automático até horário específico</div>
                    <div className="text-xs text-zinc-400 mt-1">Apenas agendamentos antes ou até o horário limite serão aprovados. Os posteriores ficarão pendentes.</div>
                    
                    {autoApproveType === 'until_time' && (
                      <div className="mt-3">
                        <label className="block text-xs font-bold text-zinc-500 mb-1.5 uppercase">Horário Limite</label>
                        <input type="time" value={autoApproveTime} onChange={e => setAutoApproveTime(e.target.value)} className="w-full sm:w-1/2 bg-dark border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-electric focus:outline-none" />
                      </div>
                    )}
                  </div>
                </label>
              </div>

              <button onClick={saveAutoApprove} disabled={savingAutoApprove || (autoApproveType === 'until_time' && !autoApproveTime)} className="w-full py-3 bg-electric-gradient text-white shadow-glow hover:brightness-110 active:brightness-95 transition-all font-bold rounded-xl hover:brightness-110 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {savingAutoApprove ? <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                {savingAutoApprove ? 'Salvando...' : 'Salvar Regras'}
              </button>
            </div>
          </div>
        )}

        {/* ─── PROMOÇÕES ─── */}
        {activeTab === 'promocoes' && (
          <div className="animate-fade-in">
            <ManagePromotions />
          </div>
        )}

        {/* ─── STORIES ─── */}
        {activeTab === 'stories' && (
          <div className="animate-fade-in">
            <ManageStories />
          </div>
        )}

        {/* ─── DISPAROS ─── */}
        {activeTab === 'disparos' && (
          <div className="animate-fade-in">
            <ManageNotifications />
          </div>
        )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function BarberDashboardPageWrapper() {
  return (
    <RoleGuard allowedRoles={['barber', 'admin']}>
      <BarberDashboardPage />
    </RoleGuard>
  );
}
