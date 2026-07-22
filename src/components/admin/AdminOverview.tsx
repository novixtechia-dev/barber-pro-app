'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { AdminStats } from '@/types';
import { CurrencyDollarIcon, CalendarIcon, ChartBarIcon, XCircleIcon, ArrowTrendingUpIcon, ShieldCheckIcon, SparklesIcon, CheckCircleIcon, UserIcon, ClockIcon } from '@heroicons/react/24/outline';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { processCRMData, ClientAnalytics } from '@/lib/analytics';
import { RFVAnalysis } from './analytics/RFVAnalysis';
import { DailyPerformanceChart } from './analytics/DailyPerformanceChart';
import { RevenueCompositionChart } from './analytics/RevenueCompositionChart';
import { HighlightsCards } from './analytics/HighlightsCards';

const isMocked = () => process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('SEU_PROJETO');
const fmt = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const MOCK_STATS: AdminStats = {
  total_bookings_today: 12,
  revenue_today: 450.00,
  revenue_month: 8540.00,
  revenue_year: 45000.00,
  revenue_total: 8540.00,
  cancellation_rate: 4.5,
  completion_rate: 85.5,
  top_services: [{ name: 'Corte Degradê', count: 45 }],
  revenue_by_service: [{ name: 'Corte Degradê', revenue: 2025 }],
  recurring_client: { name: 'João Carlos', count: 5 },
  peak_hours: [],
  bookings_by_status: {} as any,
};

const MOCK_BOOKINGS = [
  { id: '1', scheduled_date: '2026-06-15', scheduled_time: '14:30:00', status: 'confirmed', client: { full_name: 'João Carlos' }, barber: { display_name: 'Matheus' }, service: { name: 'Corte Degradê', price: 45 } },
  { id: '2', scheduled_date: '2026-06-15', scheduled_time: '15:00:00', status: 'pending', client: { full_name: 'Lucas Ferreira' }, barber: { display_name: 'Filipe' }, service: { name: 'Barba Terapia', price: 35 } },
  { id: '3', scheduled_date: '2026-06-15', scheduled_time: '16:00:00', status: 'completed', client: { full_name: 'André Costa' }, barber: { display_name: 'Matheus' }, service: { name: 'Navalhado', price: 50 } },
];

const statusConfig: Record<string, { label: string; classes: string }> = {
  pending: { label: 'Aguardando', classes: 'text-electric bg-electric/10 text-electric' },
  confirmed: { label: 'Confirmado', classes: 'text-blue-400 bg-blue-400/10' },
  completed: { label: 'Concluído', classes: 'text-green-400 bg-green-400/10' },
  cancelled: { label: 'Cancelado', classes: 'text-red-400 bg-red-400/10' },
  in_progress: { label: 'Em andamento', classes: 'text-electric bg-electric/10 text-electric' },
};

export default function AdminOverview({ barberId }: { barberId?: string }) {
  const { profile } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  
  // CRM State
  const [activeTab, setActiveTab] = useState<'overview' | 'crm'>('overview');
  const [crmData, setCrmData] = useState<{
    clients: ClientAnalytics[];
    dailyData: any[];
    highlights: any;
    composition: { recurring: number; new: number };
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Interaction States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedServiceRevenue, setSelectedServiceRevenue] = useState<string>('all');
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<any | null>(null);

  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  useEffect(() => { 
    if (dateFilter !== 'custom') {
      load(); 
    }
  }, [dateFilter, barberId]);

  const load = async () => {
    setLoading(true);
    if (isMocked()) { setStats(MOCK_STATS); setBookings(MOCK_BOOKINGS); setLoading(false); return; }
    try {
      const now = new Date();
      let startDateStr = '';
      let endDateStr = '';
      
      if (dateFilter === 'today') startDateStr = startOfDay(now).toISOString();
      else if (dateFilter === 'week') startDateStr = startOfWeek(now, { weekStartsOn: 1 }).toISOString();
      else if (dateFilter === 'month') startDateStr = startOfMonth(now).toISOString();
      else if (dateFilter === 'year') startDateStr = startOfYear(now).toISOString();
      else if (dateFilter === 'custom') {
        if (customStartDate) startDateStr = new Date(customStartDate).toISOString();
        if (customEndDate) endDateStr = new Date(customEndDate).toISOString();
      }

      // Consultas base com ou sem filtro de data e barbeiro
      let bookingsQuery = supabase.from('bookings').select('id, status, scheduled_date, scheduled_time, client_id, client:profiles!client_id(full_name), service:services(name,price)');
      let paymentsQuery = supabase.from('payments').select('amount, status, paid_at, client_id, booking:bookings!inner(service_id, barber_id, service:services(name))').eq('status', 'paid');
      
      if (startDateStr) {
        // Extrai a parte da data para bookings (que é do tipo DATE puro)
        const startDatePart = startDateStr.split('T')[0];
        bookingsQuery = bookingsQuery.gte('scheduled_date', startDatePart);
        paymentsQuery = paymentsQuery.gte('paid_at', startDateStr);
        
        // Se houver hora no filtro custom, filtra também o horário agendado
        if (dateFilter === 'custom' && customStartDate.includes('T')) {
           const timePart = customStartDate.split('T')[1];
           bookingsQuery = bookingsQuery.gte('scheduled_time', timePart);
        }
      }
      if (endDateStr) {
        const endDatePart = endDateStr.split('T')[0];
        bookingsQuery = bookingsQuery.lte('scheduled_date', endDatePart);
        paymentsQuery = paymentsQuery.lte('paid_at', endDateStr);

        if (dateFilter === 'custom' && customEndDate.includes('T')) {
           const timePart = customEndDate.split('T')[1];
           bookingsQuery = bookingsQuery.lte('scheduled_time', timePart);
        }
      }
      if (barberId) {
        bookingsQuery = bookingsQuery.eq('barber_id', barberId);
        paymentsQuery = paymentsQuery.eq('booking.barber_id', barberId);
      }

      const [booksRes, payRes] = await Promise.all([
        bookingsQuery,
        paymentsQuery
      ]);

      const bks = booksRes.data || [];
      const pays = payRes.data || [];

      // Cálculos
      const totalBookings = bks.length;
      const cancelledCount = bks.filter(b => b.status === 'cancelled').length;
      const completedCount = bks.filter(b => b.status === 'completed').length;
      const revenueTotal = pays.reduce((sum, p) => sum + (p.amount || 0), 0);

      // top services
      const serviceCounts = new Map<string, number>();
      bks.forEach(b => {
        const srv = Array.isArray(b.service) ? b.service[0] : b.service;
        if (srv && (srv as any).name) {
          serviceCounts.set((srv as any).name, (serviceCounts.get((srv as any).name) || 0) + 1);
        }
      });
      const top_services = Array.from(serviceCounts.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      // recurring client
      const clientCounts = new Map<string, {name: string, count: number}>();
      bks.forEach(b => {
        if (b.client_id && b.client) {
          const cName = Array.isArray(b.client) ? b.client[0]?.full_name : (b.client as any).full_name;
          if (cName) {
            const current = clientCounts.get(b.client_id) || { name: cName, count: 0 };
            current.count += 1;
            clientCounts.set(b.client_id, current);
          }
        }
      });
      let recurring_client = null;
      let maxCount = 0;
      const valuesArray = Array.from(clientCounts.values());
      for (const val of valuesArray) {
        if (val.count > maxCount) {
          maxCount = val.count;
          recurring_client = val;
        }
      }

      // revenue by service
      const revByServiceMap = new Map<string, number>();
      pays.forEach(p => {
        const b = Array.isArray(p.booking) ? p.booking[0] : p.booking;
        if (b && b.service) {
          const srvName = Array.isArray(b.service) ? b.service[0]?.name : (b.service as any).name;
          if (srvName) {
            revByServiceMap.set(srvName, (revByServiceMap.get(srvName) || 0) + (p.amount || 0));
          }
        }
      });
      const revenue_by_service = Array.from(revByServiceMap.entries())
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue);

      const todayStr = startOfDay(now).toISOString();
      const monthStr = startOfMonth(now).toISOString();
      const yearStr = startOfYear(now).toISOString();

      let revToday = 0;
      let revMonth = 0;
      let revYear = 0;

      pays.forEach(p => {
        if (!p.amount) return;
        if (p.paid_at && p.paid_at >= todayStr) revToday += p.amount;
        if (p.paid_at && p.paid_at >= monthStr) revMonth += p.amount;
        if (p.paid_at && p.paid_at >= yearStr) revYear += p.amount;
      });

      setStats({
        total_bookings_today: totalBookings, // using total for the period
        revenue_today: revToday,
        revenue_month: revMonth,
        revenue_year: revYear,
        revenue_total: revenueTotal,
        cancellation_rate: totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0,
        completion_rate: totalBookings > 0 ? (completedCount / totalBookings) * 100 : 0,
        top_services,
        revenue_by_service,
        recurring_client,
        peak_hours: [], bookings_by_status: {} as any,
      });

      // recent bookings (independent of date filter, just fetch latest 8)
      let recentQuery = supabase.from('bookings')
        .select('id,scheduled_date,scheduled_time,status,client:profiles!client_id(full_name),barber:barbers(display_name),service:services(name,price)')
        .order('created_at', { ascending: false }).limit(8);
      if (barberId) recentQuery = recentQuery.eq('barber_id', barberId);
      
      const { data: recentBooks } = await recentQuery;
      setBookings(recentBooks || []);

      // Calculate CRM Data ONLY if we're on the CRM tab and don't have it yet, 
      // or just calculate it every time if it's fast enough. Let's do it every time.
      if (activeTab === 'crm' && !crmData) {
        // Fetch ALL bookings and payments for accurate RFV
        let allBooksQuery = supabase.from('bookings').select('id, status, scheduled_date, scheduled_time, client_id, client:profiles!client_id(full_name)');
        let allPaysQuery = supabase.from('payments').select('amount, status, client_id, booking:bookings!inner(barber_id)');
        
        if (barberId) {
          allBooksQuery = allBooksQuery.eq('barber_id', barberId);
          allPaysQuery = allPaysQuery.eq('booking.barber_id', barberId);
        }

        const [allBksRes, allPaysRes] = await Promise.all([allBooksQuery, allPaysQuery]);
        const allBooks = allBksRes.data || [];
        const allPays = allPaysRes.data || [];

        const clients = processCRMData(allBooks, allPays);

        // Daily Performance
        const dailyMap = new Map<string, { revenue: number, bookings: number }>();
        const daysMap = new Map<string, { revenue: number, bookings: number }>();
        const hoursMap = new Map<string, number>();

        bks.forEach(b => {
          if (b.status === 'completed') {
            const dateObj = new Date(`${b.scheduled_date}T00:00:00`);
            const dayNum = format(dateObj, 'dd'); // '01', '02'
            const weekday = format(dateObj, 'eeee', { locale: ptBR }); // 'segunda-feira'
            
            const timePrefix = b.scheduled_time.substring(0, 2) + 'h'; // '14h'

            // Daily Map
            const currentD = dailyMap.get(dayNum) || { revenue: 0, bookings: 0 };
            currentD.bookings += 1;
            dailyMap.set(dayNum, currentD);

            // Weekdays map
            const currentW = daysMap.get(weekday) || { revenue: 0, bookings: 0 };
            currentW.bookings += 1;
            daysMap.set(weekday, currentW);

            // Hours map
            hoursMap.set(timePrefix, (hoursMap.get(timePrefix) || 0) + 1);
          }
        });

        pays.forEach(p => {
          if (p.status === 'paid' && p.booking) {
            const b = Array.isArray(p.booking) ? p.booking[0] : p.booking;
            // Hacky way to match the date without fetching it in the inner join, 
            // since we didn't fetch scheduled_date in the original paymentsQuery.
            // Let's use paid_at for revenue date
            if (p.paid_at) {
              const dateObj = new Date(p.paid_at);
              const dayNum = format(dateObj, 'dd');
              const weekday = format(dateObj, 'eeee', { locale: ptBR });

              const currentD = dailyMap.get(dayNum) || { revenue: 0, bookings: 0 };
              currentD.revenue += p.amount || 0;
              dailyMap.set(dayNum, currentD);

              const currentW = daysMap.get(weekday) || { revenue: 0, bookings: 0 };
              currentW.revenue += p.amount || 0;
              daysMap.set(weekday, currentW);
            }
          }
        });

        // Convert Maps to Arrays
        const dailyData = Array.from(dailyMap.entries())
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date));

        const weekdays = Array.from(daysMap.entries());
        weekdays.sort((a, b) => b[1].bookings - a[1].bookings);
        const bestDay = weekdays.length > 0 ? weekdays[0][0] : '-';
        const worstDay = weekdays.length > 0 ? weekdays[weekdays.length - 1][0] : '-';

        const hoursArr = Array.from(hoursMap.entries());
        hoursArr.sort((a, b) => a[1] - b[1]); // Sort asc (worst first)
        const worstTime = hoursArr.length > 0 ? hoursArr[0][0] : '-';
        const bestTime = hoursArr.length > 0 ? hoursArr[hoursArr.length - 1][0] : '-';

        // Revenue Composition
        let recurringRev = 0;
        let newRev = 0;
        const recurringClientsSet = new Set(clients.filter(c => c.rfvMetrics.frequency > 1).map(c => c.clientId));

        pays.forEach(p => {
          if (p.status === 'paid' && p.client_id) {
            if (recurringClientsSet.has(p.client_id)) recurringRev += (p.amount || 0);
            else newRev += (p.amount || 0);
          }
        });

        setCrmData({
          clients,
          dailyData,
          highlights: { totalSales: completedCount, totalRevenue: revenueTotal, bestDay, worstDay, bestTime, worstTime },
          composition: { recurring: recurringRev, new: newRev }
        });
      }

    } catch {
      setStats(MOCK_STATS);
      setBookings(MOCK_BOOKINGS);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'crm' && !crmData) {
      load();
    }
  }, [activeTab]);

  const makeMeAdmin = async () => {
    if (!profile) return;
    setActionLoading(true);
    try {
      await supabase.from('profiles').update({ role: 'admin' }).eq('id', profile.id);
      alert('Pronto! Atualize a página para recarregar com permissões de Admin.');
      window.location.reload();
    } catch (err: any) {
      alert('Erro: ' + err.message);
    }
    setActionLoading(false);
  };

  const seedDatabase = async () => {
    if (!confirm('Isto irá gerar MUITOS dados (5 Barbeiros, 7 Clientes, 6 Serviços e 118 Agendamentos). Pode demorar uns 10 segundos. Deseja continuar?')) return;
    setActionLoading(true);
    try {
      // 1. Criar unidade
      const { data: unitData } = await supabase.from('units').select('id').limit(1).single();
      let unitId = unitData?.id;
      if (!unitId) {
        const { data: newUnit } = await supabase.from('units').insert({ name: 'Barber Pro - Matriz', slug: 'matriz', address: 'Rua Principal', city: 'São Paulo' }).select('id').single();
        unitId = newUnit?.id;
      }

      const { data: session } = await supabase.auth.getSession();
      const defaultUserId = session?.session?.user?.id;

      // 2. Serviços
      const servicesData = [
        { name: 'Corte Masculino', price: 40, duration_minutes: 30, icon: 'scissors' },
        { name: 'Degradê', price: 50, duration_minutes: 45, icon: 'wave' },
        { name: 'Barba', price: 25, duration_minutes: 20, icon: 'scissors' },
        { name: 'Sobrancelha', price: 15, duration_minutes: 10, icon: 'sparkles' },
        { name: 'Pigmentação', price: 35, duration_minutes: 30, icon: 'sparkles' },
        { name: 'Combo Corte + Barba', price: 60, duration_minutes: 60, icon: 'star' },
      ];
      const svcs = [];
      for (const s of servicesData) {
        const { data } = await supabase.from('services').insert({ ...s, unit_id: unitId }).select('id, price').single();
        if (data) svcs.push(data);
      }

      // Se falhou inserir serviços (ex: erro de schema), pega os existentes
      if (svcs.length === 0) {
        const { data } = await supabase.from('services').select('id, price').limit(6);
        if (data) svcs.push(...data);
      }

      // 3. Clientes (Profiles) - NÃO podemos inserir fake com UUID aleatório por causa da FK auth.users
      const { data: existingProfiles } = await supabase.from('profiles').select('id').limit(10);
      const clientIds = existingProfiles?.map(p => p.id) || [];
      if (clientIds.length === 0 && defaultUserId) clientIds.push(defaultUserId);

      // 4. Barbeiros
      const barberNames = ['Antonio Silva', 'Lucas Barber', 'Felipe Fade', 'Rodrigo Cortez', 'Pedro Style'];
      const barberIds = [];
      for (const name of barberNames) {
        const { data, error } = await supabase.from('barbers').insert({ 
          unit_id: unitId, display_name: name, experience_years: Math.floor(Math.random() * 8) + 2, rating: 4.8 + (Math.random() * 0.2)
        }).select('id').single();
        if (data) barberIds.push(data.id);
        else console.warn('Erro ao inserir barbeiro', error);
      }

      // Vínculos de serviço para os barbeiros
      for (const bid of barberIds) {
        for (const sid of svcs) {
          if (Math.random() > 0.3) {
            try {
              await supabase.from('barber_services').insert({ barber_id: bid, service_id: sid.id });
            } catch (e) {
              // ignore duplicates
            }
          }
        }
      }

      // 5. Gerar 118 Agendamentos
      const now = new Date();
      const bookingsToCreate = [];
      
      const addBooking = (dateOffsetDays: number) => {
        if (svcs.length === 0 || barberIds.length === 0 || clientIds.length === 0) return;
        const bDate = new Date(now);
        bDate.setDate(bDate.getDate() - dateOffsetDays);
        const svc = svcs[Math.floor(Math.random() * svcs.length)];
        const client = clientIds[Math.floor(Math.random() * clientIds.length)];
        const barber = barberIds[Math.floor(Math.random() * barberIds.length)];
        const h = Math.floor(Math.random() * 10) + 9; // 09:00 - 18:00
        const m = Math.random() > 0.5 ? '00' : '30';
        
        bookingsToCreate.push({
          client_id: client,
          barber_id: barber,
          unit_id: unitId,
          service_id: svc.id,
          scheduled_date: bDate.toISOString().split('T')[0],
          scheduled_time: `${h.toString().padStart(2,'0')}:${m}:00`,
          end_time: `${(h+1).toString().padStart(2,'0')}:${m}:00`,
          status: dateOffsetDays > 0 ? 'completed' : 'confirmed',
          price: svc.price // passed temporarily to calculate payment
        });
      };

      // 14 Hoje (dateOffset = 0)
      for(let i=0; i<14; i++) addBooking(0);
      // 25 nesta semana (dateOffset = 1 to 6)
      for(let i=0; i<25; i++) addBooking(Math.floor(Math.random() * 6) + 1);
      // 79 resto do mes (dateOffset = 7 to 28)
      for(let i=0; i<79; i++) addBooking(Math.floor(Math.random() * 21) + 7);

      for (const b of bookingsToCreate) {
        const { price, ...bData } = b;
        const { data: bRow } = await supabase.from('bookings').insert(bData).select('id').single();
        if (bRow) {
          await supabase.from('payments').insert({
            booking_id: bRow.id,
            client_id: b.client_id,
            amount: price,
            method: 'pix',
            status: b.status === 'completed' ? 'paid' : 'pending',
            paid_at: b.status === 'completed' ? new Date().toISOString() : null
          });
        }
      }

      alert('Dados inseridos com sucesso! Atualize a página.');
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      alert('Erro ao popular dados. Tem certeza que é Admin? ' + err.message);
    }
    setActionLoading(false);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const cards = stats ? [
    { title: 'Faturamento Total', value: fmt(stats.revenue_total), sub: `${stats.total_bookings_today} agendamentos`, Icon: CurrencyDollarIcon, color: 'text-electric', wide: true },
    { title: 'Cancelamentos', value: `${stats.cancellation_rate.toFixed(1)}%`, sub: 'Taxa no período', Icon: XCircleIcon, color: 'text-red-400' },
    { title: 'Conclusão', value: `${stats.completion_rate.toFixed(1)}%`, sub: 'Taxa no período', Icon: CheckCircleIcon, color: 'text-emerald-400' },
  ] : [];

  return (
    <div className="p-4 sm:p-6 pb-20 space-y-8 max-w-7xl mx-auto">
      
      {/* Tabs Principais */}
      <div className="flex gap-4 border-b border-white/5 pb-1 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-bold transition-all whitespace-nowrap px-1 ${
            activeTab === 'overview' ? 'text-white border-b-2 border-white' : 'text-zinc-600 hover:text-zinc-300'
          }`}
        >
          Visão Geral
        </button>
        <button
          onClick={() => setActiveTab('crm')}
          className={`pb-3 text-sm font-bold transition-all whitespace-nowrap px-1 ${
            activeTab === 'crm' ? 'text-electric border-b-2 border-electric' : 'text-zinc-600 hover:text-zinc-300'
          }`}
        >
          CRM & Analytics
        </button>
      </div>

      {/* Date Filter (Visible on both tabs) */}
      <div className="flex justify-end mb-6 relative">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A0A0A] border border-white/10 rounded-full text-sm font-bold text-white hover:border-white/30 transition-colors"
        >
          <CalendarIcon className="w-4 h-4 text-zinc-400" />
          {dateFilter === 'custom' ? 'Personalizado' : dateFilter === 'today' ? 'Hoje' : dateFilter === 'week' ? 'Esta Semana' : dateFilter === 'month' ? 'Este Mês' : dateFilter === 'year' ? 'Este Ano' : 'Tudo'}
        </button>

        {isFilterOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }} 
            animate={{ opacity: 1, y: 0, scale: 1 }}
            className="absolute top-full right-0 mt-2 w-64 bg-[#0A0A0A] border border-white/10 rounded-2xl p-4 shadow-2xl z-50 flex flex-col gap-1"
          >
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: 'Esta Semana' },
              { id: 'month', label: 'Este Mês' },
              { id: 'year', label: 'Este Ano' },
              { id: 'all', label: 'Tudo' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => { setDateFilter(f.id as any); setIsFilterOpen(false); }}
                className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${dateFilter === f.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
              >
                {f.label}
              </button>
            ))}
            
            <div className="w-full h-px bg-white/10 my-2"></div>
            
            <button
              onClick={() => setDateFilter('custom')}
              className={`text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${dateFilter === 'custom' ? 'bg-white/10 text-white' : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'}`}
            >
              Personalizado 📅
            </button>

            {dateFilter === 'custom' && (
              <div className="flex flex-col gap-3 mt-3">
                 <div>
                   <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 ml-1">Início</label>
                   <input type="datetime-local" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full bg-[#050505] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1 ml-1">Fim</label>
                   <input type="datetime-local" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} style={{ colorScheme: 'dark' }} className="w-full bg-[#050505] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/30" />
                 </div>
                 <button onClick={() => { load(); setIsFilterOpen(false); }} className="w-full py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-zinc-200 transition-colors mt-1">
                   Aplicar Filtro
                 </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
      {activeTab === 'crm' && crmData ? (
        <div className="space-y-6">
          <HighlightsCards 
            totalSales={crmData.highlights.totalSales}
            totalRevenue={crmData.highlights.totalRevenue}
            bestDay={crmData.highlights.bestDay}
            worstDay={crmData.highlights.worstDay}
            bestTime={crmData.highlights.bestTime}
            worstTime={crmData.highlights.worstTime}
          />
          <DailyPerformanceChart data={crmData.dailyData} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RFVAnalysis clients={crmData.clients} />
            <RevenueCompositionChart recurringRevenue={crmData.composition.recurring} newRevenue={crmData.composition.new} />
          </div>
        </div>
      ) : activeTab === 'overview' ? (
        <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c, i) => (
          <motion.div key={c.title} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="bg-[#0A0A0A] rounded-2xl p-5 border border-white/[0.08] flex flex-col justify-between hover:border-white/[0.15] transition-all">
            <div className="flex items-start justify-between mb-4">
              <span className="text-zinc-500 text-[11px] font-bold uppercase tracking-widest">{c.sub}</span>
              <c.Icon className={`w-4 h-4 opacity-70 ${c.color}`} />
            </div>
            <div>
              <p className={`text-3xl font-bold tracking-tight ${c.color === 'text-zinc-100' ? 'text-white' : c.color}`}>{c.value}</p>
              <p className="text-zinc-400 text-xs mt-1">{c.title}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Recorrente & Serviços mais realizados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {stats && stats.top_services.length > 0 && (
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.15] transition-colors">
            <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-6">Serviços Mais Realizados</h2>
            <div className="space-y-4">
              {stats.top_services.map((svc, idx) => (
                <div key={idx} className="flex items-center justify-between pb-3 border-b border-white/5 last:border-0 last:pb-0">
                  <span className="text-zinc-200 text-sm font-medium">{svc.name}</span>
                  <span className="text-zinc-400 text-sm">{svc.count} cortes</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats && stats.recurring_client && (
          <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.15] transition-colors flex flex-col justify-center items-center text-center min-h-[200px]">
            <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-6 w-full text-left">Cliente Destaque</h2>
            <div className="w-16 h-16 bg-white/[0.03] border border-white/[0.08] rounded-full flex items-center justify-center mb-4 shadow-xl">
              <UserIcon className="w-7 h-7 text-zinc-300" />
            </div>
            <p className="text-xl font-bold text-white mb-1 tracking-tight">{stats.recurring_client.name}</p>
            <p className="text-xs text-zinc-500">{stats.recurring_client.count} agendamentos recentes</p>
          </div>
        )}
      </div>

      {/* Receita por Serviço */}
      {stats && stats.revenue_by_service.length > 0 && (
        <div className="bg-[#0A0A0A] border border-white/[0.08] rounded-2xl p-6 hover:border-white/[0.15] transition-colors mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Receita por Serviço</h2>
            <select
              value={selectedServiceRevenue}
              onChange={(e) => setSelectedServiceRevenue(e.target.value)}
              className="bg-[#050505] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-white/30 w-full sm:w-64"
            >
              <option value="all">Ver Todos os Serviços</option>
              {stats.revenue_by_service.map((svc, idx) => (
                <option key={idx} value={svc.name}>{svc.name}</option>
              ))}
            </select>
          </div>
          
          {selectedServiceRevenue === 'all' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.revenue_by_service.map((svc, idx) => (
                <div key={idx} className="flex flex-col p-4 bg-white/[0.02] border border-white/[0.05] rounded-xl hover:bg-white/[0.04] transition-colors">
                  <div className="flex items-center gap-3 mb-2">
                    <CurrencyDollarIcon className="w-4 h-4 text-emerald-400 opacity-80" />
                    <span className="text-zinc-300 text-sm font-medium">{svc.name}</span>
                  </div>
                  <span className="text-white text-xl font-bold tracking-tight">{fmt(svc.revenue)}</span>
                </div>
              ))}
            </div>
          ) : (
            (() => {
              const svc = stats.revenue_by_service.find(s => s.name === selectedServiceRevenue);
              if (!svc) return null;
              return (
                <div className="flex flex-col items-center justify-center p-8 bg-white/[0.01] border border-white/[0.05] rounded-xl">
                  <CurrencyDollarIcon className="w-8 h-8 text-emerald-400 opacity-80 mb-4" />
                  <span className="text-zinc-400 text-sm font-medium mb-2">{svc.name}</span>
                  <span className="text-white text-4xl sm:text-5xl font-black tracking-tight">{fmt(svc.revenue)}</span>
                </div>
              );
            })()
          )}
        </div>
      )}

      {/* Agendamentos Recentes */}
      <div className="mt-8">
        <h2 className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Agendamentos Recentes</h2>
        <div className="space-y-3">
          {bookings.map((b, i) => {
            const s = statusConfig[b.status] || { label: b.status, classes: 'text-zinc-400 bg-white/[0.05]' };
            return (
              <motion.div 
                key={b.id} 
                initial={{ opacity: 0, x: -10 }} 
                animate={{ opacity: 1, x: 0 }} 
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedBookingDetails(b)}
                className="bg-[#0A0A0A] rounded-xl p-4 border border-white/[0.08] flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:bg-white/[0.03] hover:border-white/[0.15] transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                  <div className="w-10 h-10 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center flex-shrink-0 text-zinc-300 font-bold text-sm">
                    {b.client?.full_name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{b.client?.full_name || 'Cliente deletado'}</p>
                    <p className="text-xs text-zinc-500 truncate">{b.service?.name}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between w-full sm:w-auto sm:gap-6 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <p className="text-xs font-medium text-zinc-400 whitespace-nowrap">
                    {format(new Date(`${b.scheduled_date}T${b.scheduled_time}`), "dd MMM 'às' HH:mm", { locale: ptBR })}
                  </p>
                  <span className={`text-[10px] px-2.5 py-1 rounded-md font-semibold tracking-wide uppercase ${s.classes}`}>
                    {s.label}
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4 text-zinc-500">
            <div className="w-8 h-8 border-2 border-electric border-t-transparent rounded-full animate-spin" />
            <p>Carregando análises...</p>
          </div>
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBookingDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-dark/80 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-6 w-full max-w-md relative"
          >
            <button 
              onClick={() => setSelectedBookingDetails(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
            
            <h2 className="text-lg font-bold text-white mb-6">Detalhes do Agendamento</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4 pb-4 border-b border-white/5">
                <div className="w-12 h-12 rounded-full bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-zinc-300 font-bold text-lg">
                  {selectedBookingDetails.client?.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-white font-bold">{selectedBookingDetails.client?.full_name || 'Cliente Deletado'}</p>
                  <p className="text-zinc-400 text-sm">Realizado com {selectedBookingDetails.barber?.display_name || 'Desconhecido'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Serviço</p>
                  <p className="text-zinc-200 text-sm font-medium">{selectedBookingDetails.service?.name || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Valor</p>
                  <p className="text-emerald-400 text-sm font-bold">{fmt(selectedBookingDetails.service?.price || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Data</p>
                  <p className="text-zinc-200 text-sm font-medium">{format(new Date(`${selectedBookingDetails.scheduled_date}T12:00:00`), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Horário</p>
                  <p className="text-zinc-200 text-sm font-medium">{selectedBookingDetails.scheduled_time?.slice(0,5)}</p>
                </div>
              </div>
              
              <div className="pt-2">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Status do Agendamento</p>
                <div className="inline-block">
                  <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${statusConfig[selectedBookingDetails.status]?.classes || 'text-zinc-400 bg-white/5'}`}>
                    {statusConfig[selectedBookingDetails.status]?.label || selectedBookingDetails.status}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
