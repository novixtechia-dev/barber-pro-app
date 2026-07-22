// ============================================================
// BARBER PRO - Types & Interfaces
// ============================================================

export type UserRole = 'client' | 'barber' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type PaymentMethod = 'pix' | 'credit_card' | 'debit_card' | 'on_site';
export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type MediaType = 'image' | 'video';

// ─── Profile ─────────────────────────────────────────────────
export interface Profile {
  id: string;
  role: UserRole;
  full_name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  bio?: string;
  city?: string;
  state?: string;
  push_notifications: boolean;
  tier?: string;
  cuts_count?: number;
  created_at: string;
}

// ─── Unit ────────────────────────────────────────────────────
export interface Unit {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  phone?: string;
  cover_image_url?: string;
  logo_url?: string;
  is_active: boolean;
  opens_at: string;
  closes_at: string;
  distance_km?: number; // computed via geoloc
}

// ─── Barber ──────────────────────────────────────────────────
export interface Barber {
  id: string;
  profile_id: string;
  unit_id: string;
  display_name: string;
  specialties: string[];
  experience_years: number;
  rating: number;
  total_reviews: number;
  is_active: boolean;
  accepts_online_booking: boolean;
  bio?: string;
  instagram_url?: string;
  profile?: Profile;
  unit?: Unit;
}

// ─── Service ─────────────────────────────────────────────────
export interface Service {
  id: string;
  unit_id?: string;
  name: string;
  description?: string;
  duration_minutes: number;
  price: number;
  image_url?: string;
  is_active: boolean;
}

// ─── Schedule ────────────────────────────────────────────────
export interface BarberSchedule {
  id: string;
  barber_id: string;
  day_of_week: number; // 0-6
  starts_at: string;
  ends_at: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

// ─── Booking ─────────────────────────────────────────────────
export interface Booking {
  id: string;
  client_id: string;
  barber_id: string;
  unit_id: string;
  service_id: string;
  scheduled_date: string;
  scheduled_time: string;
  end_time: string;
  status: BookingStatus;
  notes?: string;
  cancellation_reason?: string;
  created_at: string;
  // joins
  barber?: Barber;
  service?: Service;
  unit?: Unit;
  client?: Profile;
  payment?: Payment;
}

// ─── Payment ─────────────────────────────────────────────────
export interface Payment {
  id: string;
  booking_id: string;
  client_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  pix_qr_code?: string;
  pix_copy_paste?: string;
  transaction_id?: string;
  paid_at?: string;
  created_at: string;
}

// ─── Review ──────────────────────────────────────────────────
export interface Review {
  id: string;
  booking_id: string;
  client_id: string;
  barber_id: string;
  rating: number;
  comment?: string;
  created_at: string;
  client?: Profile;
}

// ─── Portfolio ───────────────────────────────────────────────
export interface PortfolioItem {
  id: string;
  barber_id: string;
  media_url: string;
  media_type: MediaType;
  caption?: string;
  likes_count: number;
  created_at: string;
  liked_by_me?: boolean;
}

// ─── Story ───────────────────────────────────────────────────
export interface Story {
  id: string;
  barber_id: string;
  media_url: string;
  media_type: MediaType;
  caption?: string;
  views_count: number;
  expires_at: string;
  created_at: string;
  barber?: Barber;
  viewed?: boolean;
}

// ─── Promotion ───────────────────────────────────────────────
export interface Promotion {
  id: string;
  barber_id: string;
  unit_id: string;
  title: string;
  description?: string;
  original_price?: number;
  promotional_price: number;
  service_id?: string;
  image_url?: string;
  valid_until?: string;
  is_active: boolean;
  barber?: Barber;
  service?: Service;
}

// ─── Waiting List ────────────────────────────────────────────
export interface WaitingListEntry {
  id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  desired_date: string;
  notified: boolean;
  created_at: string;
}

// ─── Booking Flow State ──────────────────────────────────────
export interface BookingFlowState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  unit?: Unit;
  barber?: Barber;
  service?: Service;
  date?: string;
  time?: string;
  paymentMethod?: PaymentMethod;
}

// ─── Dashboard Stats ─────────────────────────────────────────
export interface AdminStats {
  total_bookings_today: number;
  revenue_today: number;
  revenue_month: number;
  revenue_year: number;
  revenue_total: number;
  cancellation_rate: number;
  completion_rate: number;
  top_services: { name: string; count: number }[];
  revenue_by_service: { name: string; revenue: number }[];
  recurring_client: { name: string; count: number } | null;
  peak_hours: { hour: number; count: number }[];
  bookings_by_status: Record<BookingStatus, number>;
}

export interface BarberStats {
  bookings_today: number;
  bookings_week: number;
  revenue_month: number;
  avg_rating: number;
  total_clients: number;
}
