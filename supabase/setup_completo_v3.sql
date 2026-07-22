-- ============================================================
-- BARBER PRO - SETUP COMPLETO DO BANCO DE DADOS
-- ============================================================

-- === Conteúdo de supabase/schema.sql ===
-- ============================================================
-- BARBER PRO - Schema Completo Supabase v2
-- Cole no SQL Editor do seu projeto Supabase e execute
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── PROFILES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'barber', 'admin')),
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  state TEXT,
  tier TEXT DEFAULT 'standard' CHECK (tier IN ('standard', 'bronze', 'silver', 'gold', 'vip')),
  cuts_count INTEGER DEFAULT 0,      -- Para barra de progresso / gamificação
  push_notifications BOOLEAN DEFAULT TRUE,
  onesignal_player_id TEXT,          -- ID do dispositivo para notificações direcionadas
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── UNITS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'SP',
  phone TEXT,
  cover_image_url TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  opens_at TIME DEFAULT '09:00',
  closes_at TIME DEFAULT '20:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO units (name, slug, address, city, state, opens_at, closes_at)
VALUES ('Barber Pro - Unidade Principal', 'principal', 'Rua das Tesouras, 123', 'São Paulo', 'SP', '09:00', '21:00')
ON CONFLICT (slug) DO NOTHING;

-- ─── BARBERS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS barbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  specialties TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  avatar_url TEXT,
  bio TEXT,
  instagram_handle TEXT,
  rating NUMERIC(3,2) DEFAULT 5.0,
  total_reviews INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  accepts_online_booking BOOLEAN DEFAULT TRUE,
  commission_percentage NUMERIC(5,2) DEFAULT 0,
  monthly_goal NUMERIC(10,2) DEFAULT 0,
  whatsapp TEXT,
  status TEXT DEFAULT 'online' CHECK (status IN ('online', 'offline')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── SERVICES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,                     -- Imagem principal do serviço
  icon TEXT DEFAULT 'scissors',
  category TEXT DEFAULT 'Corte', -- Cabelo, Barba, Combo, Química, etc.
  barber_commission NUMERIC(5,2) DEFAULT 0, -- % specific commission for this service (overrides barber base commission if > 0)
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BARBER_SERVICES (Vínculo barbeiro ↔ serviço com fotos) ───
-- Um barbeiro pode fazer vários serviços e cada vínculo tem galeria de fotos própria
CREATE TABLE IF NOT EXISTS barber_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  custom_price NUMERIC(10,2),         -- Preço personalizado deste barbeiro para o serviço (NULL = usa o padrão)
  photos TEXT[] DEFAULT '{}',         -- URLs de fotos dos trabalhos deste barbeiro neste serviço
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barber_id, service_id)
);

-- ─── BARBER_SCHEDULES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS barber_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  starts_at TIME NOT NULL DEFAULT '09:00',
  ends_at TIME NOT NULL DEFAULT '18:00',
  slot_duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT TRUE,
  UNIQUE(barber_id, day_of_week)
);

-- ─── BARBER_TIME_OFFS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS barber_time_offs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  off_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(barber_id, off_date)
);

-- ─── CUSTOMER_PREFERENCES E FAVORITOS ─────────────────────────
CREATE TABLE IF NOT EXISTS customer_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, barber_id)
);

CREATE TABLE IF NOT EXISTS favorite_barbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, barber_id)
);

CREATE TABLE IF NOT EXISTS client_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  target_cuts INTEGER DEFAULT 10,
  reward TEXT DEFAULT '1 Corte Grátis',
  is_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── BOOKINGS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES units(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','in_progress','completed','cancelled','cancelled_by_barber','no_show')),
  notes TEXT,
  cancellation_reason TEXT,
  admin_notified BOOLEAN DEFAULT FALSE, -- Controle para não duplicar notificação
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── COUPONS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,     -- Opcional: restringe o cupom a este barbeiro
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,    -- Opcional: restringe o cupom a este cliente
  allowed_tier TEXT CHECK (allowed_tier IN ('standard', 'bronze', 'silver', 'gold', 'vip')), -- Opcional: restringe por nível
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PAYMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  method TEXT DEFAULT 'on_site' CHECK (method IN ('pix','credit_card','debit_card','on_site')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','refunded','failed')),
  coupon_id UUID REFERENCES coupons(id) ON DELETE SET NULL,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REVIEWS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PORTFOLIO ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,   -- Categorizando por serviço
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image','video')),
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── STORIES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT DEFAULT 'image' CHECK (media_type IN ('image','video')),
  caption TEXT,
  views_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROMOTIONS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  service_id UUID REFERENCES services(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  original_price NUMERIC(10,2),
  promotional_price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── WAITING LIST ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS waiting_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  barber_id UUID REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  desired_date DATE NOT NULL,
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── FUNCTIONS ────────────────────────────────────────────────

-- Cria perfil automaticamente quando usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'client'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atualiza rating do barbeiro após nova avaliação
CREATE OR REPLACE FUNCTION update_barber_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE barbers
  SET
    rating = (SELECT ROUND(AVG(rating)::numeric, 2) FROM reviews WHERE barber_id = NEW.barber_id),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE barber_id = NEW.barber_id)
  WHERE id = NEW.barber_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_review_created ON reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_barber_rating();

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_time_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
CREATE POLICY "profiles_insert_admin" ON profiles FOR INSERT WITH CHECK (
  auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Customer Preferences
DROP POLICY IF EXISTS "customer_preferences_select" ON customer_preferences;
CREATE POLICY "customer_preferences_select" ON customer_preferences FOR SELECT USING (true);
DROP POLICY IF EXISTS "customer_preferences_all" ON customer_preferences;
CREATE POLICY "customer_preferences_all" ON customer_preferences FOR ALL USING (auth.uid() = client_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Barber Time Offs
DROP POLICY IF EXISTS "barber_time_offs_select" ON barber_time_offs;
CREATE POLICY "barber_time_offs_select" ON barber_time_offs FOR SELECT USING (true);
DROP POLICY IF EXISTS "barber_time_offs_admin" ON barber_time_offs;
CREATE POLICY "barber_time_offs_admin" ON barber_time_offs FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Barbers
DROP POLICY IF EXISTS "barbers_select" ON barbers;
CREATE POLICY "barbers_select" ON barbers FOR SELECT USING (true);
DROP POLICY IF EXISTS "barbers_admin_all" ON barbers;
CREATE POLICY "barbers_admin_all" ON barbers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Barber Services
DROP POLICY IF EXISTS "barber_services_select" ON barber_services;
CREATE POLICY "barber_services_select" ON barber_services FOR SELECT USING (true);
DROP POLICY IF EXISTS "barber_services_admin" ON barber_services;
CREATE POLICY "barber_services_admin" ON barber_services FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Barber Schedules
DROP POLICY IF EXISTS "schedules_select" ON barber_schedules;
CREATE POLICY "schedules_select" ON barber_schedules FOR SELECT USING (true);
DROP POLICY IF EXISTS "schedules_admin" ON barber_schedules;
CREATE POLICY "schedules_admin" ON barber_schedules FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Services
DROP POLICY IF EXISTS "services_select" ON services;
CREATE POLICY "services_select" ON services FOR SELECT USING (true);
DROP POLICY IF EXISTS "services_admin" ON services;
CREATE POLICY "services_admin" ON services FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Units
DROP POLICY IF EXISTS "units_select" ON units;
CREATE POLICY "units_select" ON units FOR SELECT USING (true);
DROP POLICY IF EXISTS "units_admin" ON units;
CREATE POLICY "units_admin" ON units FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bookings
DROP POLICY IF EXISTS "bookings_select" ON bookings;
CREATE POLICY "bookings_select" ON bookings FOR SELECT USING (
  auth.uid() = client_id OR
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "bookings_insert" ON bookings;
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (auth.uid() = client_id);
DROP POLICY IF EXISTS "bookings_update" ON bookings;
CREATE POLICY "bookings_update" ON bookings FOR UPDATE USING (
  auth.uid() = client_id OR
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Payments
DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT USING (
  auth.uid() = client_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Reviews
DROP POLICY IF EXISTS "reviews_select" ON reviews;
CREATE POLICY "reviews_select" ON reviews FOR SELECT USING (true);
DROP POLICY IF EXISTS "reviews_insert" ON reviews;
CREATE POLICY "reviews_insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Portfolio
DROP POLICY IF EXISTS "portfolio_select" ON portfolio_items;
CREATE POLICY "portfolio_select" ON portfolio_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "portfolio_write" ON portfolio_items;
CREATE POLICY "portfolio_write" ON portfolio_items FOR ALL USING (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Stories
DROP POLICY IF EXISTS "stories_select" ON stories;
CREATE POLICY "stories_select" ON stories FOR SELECT USING (expires_at > NOW());
DROP POLICY IF EXISTS "stories_write" ON stories;
CREATE POLICY "stories_write" ON stories FOR ALL USING (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Promotions
DROP POLICY IF EXISTS "promotions_select" ON promotions;
CREATE POLICY "promotions_select" ON promotions FOR SELECT USING (true);
DROP POLICY IF EXISTS "promotions_admin" ON promotions;
CREATE POLICY "promotions_admin" ON promotions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "coupons_select" ON coupons;
CREATE POLICY "coupons_select" ON coupons FOR SELECT USING (true);
DROP POLICY IF EXISTS "coupons_write" ON coupons;
CREATE POLICY "coupons_write" ON coupons FOR ALL USING (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Waiting List
DROP POLICY IF EXISTS "waiting_select" ON waiting_list;
CREATE POLICY "waiting_select" ON waiting_list FOR SELECT USING (
  auth.uid() = client_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "waiting_insert" ON waiting_list;
CREATE POLICY "waiting_insert" ON waiting_list FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Favorite Barbers
ALTER TABLE favorite_barbers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "favorites_select" ON favorite_barbers;
CREATE POLICY "favorites_select" ON favorite_barbers FOR SELECT USING (
  auth.uid() = client_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
DROP POLICY IF EXISTS "favorites_insert" ON favorite_barbers;
CREATE POLICY "favorites_insert" ON favorite_barbers FOR INSERT WITH CHECK (auth.uid() = client_id);
DROP POLICY IF EXISTS "favorites_delete" ON favorite_barbers;
CREATE POLICY "favorites_delete" ON favorite_barbers FOR DELETE USING (auth.uid() = client_id);

-- Client Goals
ALTER TABLE client_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "goals_select" ON client_goals;
CREATE POLICY "goals_select" ON client_goals FOR SELECT USING (
  auth.uid() = client_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);
DROP POLICY IF EXISTS "goals_write" ON client_goals;
CREATE POLICY "goals_write" ON client_goals FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);

-- ─── STORAGE BUCKETS ──────────────────────────────────────────
-- Execute estas linhas separadamente no SQL Editor (Storage > Buckets via UI ou via SQL):

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('promotions', 'promotions', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('services', 'services', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies (qualquer um lê, autenticado escreve em seus buckets)
DROP POLICY IF EXISTS "storage_public_read" ON storage.objects;
CREATE POLICY "storage_public_read" ON storage.objects FOR SELECT USING (bucket_id IN ('avatars','portfolio','stories','promotions','services'));
DROP POLICY IF EXISTS "storage_auth_upload" ON storage.objects;
CREATE POLICY "storage_auth_upload" ON storage.objects FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "storage_admin_delete" ON storage.objects;
CREATE POLICY "storage_admin_delete" ON storage.objects FOR DELETE USING (auth.role() = 'authenticated');

-- ─── APÓS CRIAR SEU USUÁRIO ADMIN ─────────────────────────────
-- 1. Cadastre-se pelo app em /register
-- 2. Copie seu UUID do Supabase > Auth > Users
-- 3. Execute: UPDATE profiles SET role = 'admin' WHERE id = 'SEU-UUID-AQUI';

-- ─── VIEWS (Para relatórios e admin) ──────────────────────────
CREATE OR REPLACE VIEW customers_view AS
SELECT 
  p.id, 
  p.full_name, 
  p.phone, 
  p.avatar_url,
  p.tier,
  MAX(b.scheduled_date) AS last_visit,
  COALESCE(SUM(pay.amount), 0) AS total_spent,
  COUNT(b.id) AS total_bookings
FROM profiles p
LEFT JOIN bookings b ON b.client_id = p.id AND b.status IN ('completed', 'confirmed', 'in_progress')
LEFT JOIN payments pay ON pay.booking_id = b.id AND pay.status = 'paid'
WHERE p.role = 'client'
GROUP BY p.id;



-- === Conteúdo de supabase_update.sql ===
-- Execute este script no painel do Supabase -> SQL Editor -> New Query -> Run
ALTER TABLE bookings ADD COLUMN cancelled_by_role text; -- Pode ser 'client' ou 'barber'



-- === Conteúdo de supabase/notification_system.sql ===
-- 1. Modificar a tabela bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT false;

-- 2. Tabela de Templates de Notificação
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type TEXT NOT NULL UNIQUE, -- ex: NEW_BOOKING, BOOKING_REMINDER
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  available_variables TEXT[] DEFAULT '{}', -- ex: ['{cliente}', '{barbeiro}', '{servico}', '{hora}']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Políticas: Admin pode tudo, outros apenas leitura
DROP POLICY IF EXISTS "templates_select" ON notification_templates;
CREATE POLICY "templates_select" ON notification_templates FOR SELECT USING (true);

DROP POLICY IF EXISTS "templates_all_admin" ON notification_templates;
CREATE POLICY "templates_all_admin" ON notification_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 3. Tabela de Histórico (Logs)
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Quem enviou (Admin ou Barbeiro)
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE, -- Quem recebeu
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'push', -- push, push_whatsapp
  status TEXT DEFAULT 'delivered', -- delivered, failed, read
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: Usuário pode ver suas próprias recebidas. Admin pode ver tudo. Barbeiro pode ver os que enviou.
DROP POLICY IF EXISTS "logs_select_recipient" ON notification_logs;
CREATE POLICY "logs_select_recipient" ON notification_logs FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "logs_select_sender" ON notification_logs;
CREATE POLICY "logs_select_sender" ON notification_logs FOR SELECT USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "logs_select_admin" ON notification_logs;
CREATE POLICY "logs_select_admin" ON notification_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "logs_insert" ON notification_logs;
CREATE POLICY "logs_insert" ON notification_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);

-- 4. Inserir Templates Padrões
INSERT INTO notification_templates (event_type, title, message, available_variables) VALUES
  (
    'NEW_BOOKING_CLIENT',
    'Agendamento realizado',
    'Seu horário foi agendado com sucesso.\n\nBarbeiro: {barbeiro}\nServiço: {servico}\nData: {data}\nHorário: {hora}',
    ARRAY['{barbeiro}', '{servico}', '{data}', '{hora}']
  ),
  (
    'NEW_BOOKING_BARBER',
    'Novo agendamento',
    'Cliente: {cliente}\nServiço: {servico}\nData: {data}\nHorário: {hora}',
    ARRAY['{cliente}', '{servico}', '{data}', '{hora}']
  ),
  (
    'REMINDER_20_MIN_CLIENT',
    'Seu atendimento está próximo',
    'Olá {cliente},\nFaltam apenas 20 minutos para seu atendimento com {barbeiro}.\nDeseja confirmar sua presença?',
    ARRAY['{cliente}', '{barbeiro}']
  ),
  (
    'REMINDER_20_MIN_BARBER',
    'Atendimento em 20 minutos',
    'Cliente: {cliente}\nServiço: {servico}\nHorário: {hora}\nAguardando confirmação.',
    ARRAY['{cliente}', '{servico}', '{hora}']
  ),
  (
    'CONFIRM_PRESENCE_CLIENT',
    'Presença confirmada',
    'Seu atendimento está confirmado. Nos vemos em breve.',
    ARRAY[]::TEXT[]
  ),
  (
    'CONFIRM_PRESENCE_BARBER',
    'Agendamento confirmado',
    'Cliente: {cliente}\nServiço: {servico}\nHorário: {hora}\nConfirmou presença.',
    ARRAY['{cliente}', '{servico}', '{hora}']
  ),
  (
    'CANCELED_BY_CLIENT',
    'Agendamento cancelado',
    'Cliente: {cliente} cancelou o horário.\nServiço: {servico}\nHorário: {hora}',
    ARRAY['{cliente}', '{servico}', '{hora}']
  ),
  (
    'CANCELED_BY_BARBER',
    'Agendamento cancelado',
    'O barbeiro {barbeiro} cancelou seu atendimento.\nMotivo: {motivo}\nToque para reagendar.',
    ARRAY['{barbeiro}', '{motivo}']
  ),
  (
    'NEW_SLOT',
    'Horário disponível',
    'Tenho uma vaga disponível hoje às {hora}. Agende agora.',
    ARRAY['{hora}']
  ),
  (
    'NEW_STORY',
    'Novo story',
    '{barbeiro} publicou um novo story. Confira agora.',
    ARRAY['{barbeiro}']
  ),
  (
    'NEW_PROMO',
    'Nova promoção',
    '{barbeiro} lançou uma nova promoção. Confira agora.',
    ARRAY['{barbeiro}']
  )
ON CONFLICT (event_type) DO UPDATE SET
  title = EXCLUDED.title,
  message = EXCLUDED.message,
  available_variables = EXCLUDED.available_variables;



-- === Conteúdo de supabase/fix_final.sql ===
-- ============================================================
-- BARBER PRO - Script de Limpeza e Correção Final
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Remover barbeiros "fantasma" criados com nome padrão "Novo Barbeiro"
--    Esses são criados automaticamente quando alguém é promovido a barbeiro
--    mas não preencheu o perfil ainda.
DELETE FROM barbers 
WHERE display_name = 'Novo Barbeiro';

-- 2. Remover barbeiros indesejados por nome (e.g. "Antoniel Golpista")
--    Remova ou comente esta linha se não for necessário.
-- DELETE FROM barbers WHERE display_name ILIKE '%golpista%';

-- 3. Garantir que apenas barbeiros com nome definido apareçam
--    Você pode desativar barbeiros sem nome real:
UPDATE barbers SET is_active = false 
WHERE display_name IS NULL 
   OR display_name = '' 
   OR display_name = 'Novo Barbeiro';

-- 4. Atualizar políticas RLS para barber_services
DROP POLICY IF EXISTS "barber_services_admin" ON barber_services;
DROP POLICY IF EXISTS "barber_services_select" ON barber_services;
DROP POLICY IF EXISTS "barber_services_insert" ON barber_services;
DROP POLICY IF EXISTS "barber_services_delete" ON barber_services;

CREATE POLICY "barber_services_select" ON barber_services FOR SELECT USING (true);
CREATE POLICY "barber_services_insert" ON barber_services FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "barber_services_delete" ON barber_services FOR DELETE USING (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 5. Atualizar políticas RLS para barber_schedules
DROP POLICY IF EXISTS "schedules_admin" ON barber_schedules;
DROP POLICY IF EXISTS "schedules_select" ON barber_schedules;
DROP POLICY IF EXISTS "schedules_insert" ON barber_schedules;
DROP POLICY IF EXISTS "schedules_update" ON barber_schedules;

CREATE POLICY "schedules_select" ON barber_schedules FOR SELECT USING (true);
CREATE POLICY "schedules_insert" ON barber_schedules FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "schedules_update" ON barber_schedules FOR UPDATE USING (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 6. Atualizar políticas RLS para barbers (permitir barbeiro atualizar próprio perfil)
DROP POLICY IF EXISTS "barbers_update" ON barbers;
CREATE POLICY "barbers_update" ON barbers FOR UPDATE USING (
  auth.uid() = profile_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 7. Garantir RLS em portfolio_items
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "portfolio_select" ON portfolio_items;
DROP POLICY IF EXISTS "portfolio_write" ON portfolio_items;
CREATE POLICY "portfolio_select" ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "portfolio_write" ON portfolio_items FOR ALL USING (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 8. Verificar resultados
SELECT id, display_name, is_active FROM barbers ORDER BY created_at DESC;



-- === Conteúdo de supabase/mock_data.sql ===
-- ==========================================
-- SCRIPT DE MOCK DATA - BARBER PRO
-- Execute isso no SQL Editor do Supabase 
-- para povoar o app com dados iniciais
-- ==========================================

-- 1. Inserir Unidade (se não existir)
INSERT INTO units (name, slug, address, city, state, opens_at, closes_at)
VALUES ('Barber Pro - Matriz', 'matriz', 'Rua Principal, 100', 'São Paulo', 'SP', '09:00', '20:00')
ON CONFLICT (slug) DO NOTHING;

-- Pegar o ID da unidade recém-criada (ou existente) para usar nos próximos
DO $$
DECLARE
  v_unit_id UUID;
  v_barber1_id UUID;
  v_barber2_id UUID;
  v_service1_id UUID;
  v_service2_id UUID;
BEGIN
  SELECT id INTO v_unit_id FROM units LIMIT 1;

  -- 2. Inserir Barbeiros de Teste
  INSERT INTO barbers (unit_id, display_name, specialties, experience_years, rating, total_reviews)
  VALUES 
    (v_unit_id, 'João Carlos', ARRAY['Degradê', 'Barba'], 8, 4.9, 120),
    (v_unit_id, 'Marcos Silva', ARRAY['Social', 'Navalhado', 'Luzes'], 5, 4.8, 85);

  SELECT id INTO v_barber1_id FROM barbers WHERE display_name = 'João Carlos' LIMIT 1;
  SELECT id INTO v_barber2_id FROM barbers WHERE display_name = 'Marcos Silva' LIMIT 1;

  -- 3. Inserir Serviços de Teste
  INSERT INTO services (unit_id, name, description, duration_minutes, price, icon)
  VALUES 
    (v_unit_id, 'Corte Degradê', 'Corte moderno com transição perfeita', 45, 45.00, 'wave'),
    (v_unit_id, 'Corte + Barba', 'Combo completo com toalha quente', 60, 65.00, 'sparkles'),
    (v_unit_id, 'Corte Infantil', 'Corte social ou moderno para crianças', 30, 35.00, 'scissors');

  SELECT id INTO v_service1_id FROM services WHERE name = 'Corte Degradê' LIMIT 1;
  SELECT id INTO v_service2_id FROM services WHERE name = 'Corte + Barba' LIMIT 1;

  -- 4. Inserir Vínculos (Barbeiro faz Serviço)
  INSERT INTO barber_services (barber_id, service_id) VALUES (v_barber1_id, v_service1_id) ON CONFLICT DO NOTHING;
  INSERT INTO barber_services (barber_id, service_id) VALUES (v_barber1_id, v_service2_id) ON CONFLICT DO NOTHING;
  INSERT INTO barber_services (barber_id, service_id) VALUES (v_barber2_id, v_service1_id) ON CONFLICT DO NOTHING;

  -- 5. Inserir uma Promoção
  INSERT INTO promotions (unit_id, title, description, original_price, promotional_price, valid_until)
  VALUES (
    v_unit_id, 
    'Promoção Sextou', 
    'Corte + Barba com desconto especial', 
    65.00, 
    50.00, 
    NOW() + INTERVAL '7 days'
  );

  -- 6. Inserir um Story para o primeiro barbeiro
  INSERT INTO stories (barber_id, media_url, caption, expires_at)
  VALUES (
    v_barber1_id,
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&q=80&w=1000',
    'Degradê do dia 🔥',
    NOW() + INTERVAL '24 hours'
  );

END $$;


