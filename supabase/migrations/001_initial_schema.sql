-- ============================================================
-- BARBER PRO - Schema Completo PostgreSQL / Supabase
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis"; -- geolocalização

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('client', 'barber', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show');
CREATE TYPE payment_method AS ENUM ('pix', 'credit_card', 'debit_card', 'on_site');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded', 'failed');
CREATE TYPE notification_type AS ENUM (
  'booking_created', 'booking_confirmed', 'booking_cancelled', 'booking_reminder_24h',
  'booking_reminder_2h', 'booking_reminder_30m', 'slot_available', 'promotion', 'new_story'
);
CREATE TYPE story_media_type AS ENUM ('image', 'video');

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'client',
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  location GEOGRAPHY(POINT, 4326),
  city TEXT,
  state TEXT,
  onesignal_player_id TEXT,
  push_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- UNITS (unidades da barbearia)
-- ============================================================

CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT,
  phone TEXT,
  email TEXT,
  location GEOGRAPHY(POINT, 4326),
  cover_image_url TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  opens_at TIME DEFAULT '08:00',
  closes_at TIME DEFAULT '20:00',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BARBERS
-- ============================================================

CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  specialties TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  accepts_online_booking BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SERVICES
-- ============================================================

CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- services padrão do sistema
INSERT INTO services (id, name, description, duration_minutes, price, order_index) VALUES
  (uuid_generate_v4(), 'Corte Masculino', 'Corte tradicional masculino', 30, 35.00, 1),
  (uuid_generate_v4(), 'Degradê', 'Corte com técnica de degradê', 40, 45.00, 2),
  (uuid_generate_v4(), 'Social', 'Corte social elegante', 30, 40.00, 3),
  (uuid_generate_v4(), 'Navalhado', 'Corte finalizado com navalha', 45, 50.00, 4),
  (uuid_generate_v4(), 'Barba', 'Aparar e modelar barba', 20, 25.00, 5),
  (uuid_generate_v4(), 'Sobrancelha', 'Design de sobrancelha', 15, 15.00, 6),
  (uuid_generate_v4(), 'Acabamento', 'Acabamento e alinhamento', 15, 15.00, 7),
  (uuid_generate_v4(), 'Pezinho', 'Alinhamento do pezinho', 10, 10.00, 8),
  (uuid_generate_v4(), 'Corte + Barba', 'Combo corte masculino e barba', 50, 55.00, 9),
  (uuid_generate_v4(), 'Corte Infantil', 'Corte especial para crianças', 25, 30.00, 10);

-- ============================================================
-- BARBER SCHEDULES (horários de trabalho)
-- ============================================================

CREATE TABLE barber_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Dom, 6=Sab
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  slot_duration_minutes INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(barber_id, day_of_week)
);

-- ============================================================
-- BARBER TIME BLOCKS (bloqueios específicos)
-- ============================================================

CREATE TABLE barber_time_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  starts_at TIME NOT NULL,
  ends_at TIME NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BOOKINGS
-- ============================================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  barber_id UUID NOT NULL REFERENCES barbers(id),
  unit_id UUID NOT NULL REFERENCES units(id),
  service_id UUID NOT NULL REFERENCES services(id),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status booking_status DEFAULT 'pending',
  notes TEXT,
  cancellation_reason TEXT,
  reminder_24h_sent BOOLEAN DEFAULT false,
  reminder_2h_sent BOOLEAN DEFAULT false,
  reminder_30m_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PAYMENTS
-- ============================================================

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(10,2) NOT NULL,
  method payment_method NOT NULL,
  status payment_status DEFAULT 'pending',
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  transaction_id TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- WAITING LIST
-- ============================================================

CREATE TABLE waiting_list (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  barber_id UUID NOT NULL REFERENCES barbers(id),
  service_id UUID NOT NULL REFERENCES services(id),
  desired_date DATE NOT NULL,
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  barber_id UUID NOT NULL REFERENCES barbers(id),
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PORTFOLIO
-- ============================================================

CREATE TABLE portfolio_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type story_media_type DEFAULT 'image',
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE portfolio_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  portfolio_item_id UUID NOT NULL REFERENCES portfolio_items(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(portfolio_item_id, client_id)
);

-- ============================================================
-- STORIES (expira em 24h)
-- ============================================================

CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type story_media_type DEFAULT 'image',
  caption TEXT,
  views_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE story_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id),
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(story_id, viewer_id)
);

-- ============================================================
-- PROMOTIONS
-- ============================================================

CREATE TABLE promotions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES units(id),
  title TEXT NOT NULL,
  description TEXT,
  original_price DECIMAL(10,2),
  promotional_price DECIMAL(10,2) NOT NULL,
  service_id UUID REFERENCES services(id),
  image_url TEXT,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  notification_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NOTIFICATIONS LOG
-- ============================================================

CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  onesignal_id TEXT,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_barber ON bookings(barber_id);
CREATE INDEX idx_bookings_date ON bookings(scheduled_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_reminder ON bookings(reminder_24h_sent, reminder_2h_sent, reminder_30m_sent);
CREATE INDEX idx_stories_expires ON stories(expires_at) WHERE expires_at > NOW();
CREATE INDEX idx_barbers_unit ON barbers(unit_id);
CREATE INDEX idx_reviews_barber ON reviews(barber_id);
CREATE INDEX idx_waiting_barber_date ON waiting_list(barber_id, desired_date);
CREATE INDEX idx_units_location ON units USING GIST(location);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Update updated_at automático
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER trg_barbers_updated_at BEFORE UPDATE ON barbers
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Atualiza rating do barbeiro após review
CREATE OR REPLACE FUNCTION update_barber_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE barbers SET
    rating = (SELECT AVG(rating) FROM reviews WHERE barber_id = NEW.barber_id AND is_visible = true),
    total_reviews = (SELECT COUNT(*) FROM reviews WHERE barber_id = NEW.barber_id AND is_visible = true)
  WHERE id = NEW.barber_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_rating AFTER INSERT OR UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_barber_rating();

-- Auto-confirma booking quando pagamento é feito
CREATE OR REPLACE FUNCTION handle_payment_confirmed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    UPDATE bookings SET status = 'confirmed' WHERE id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payment_confirmed AFTER UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION handle_payment_confirmed();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE waiting_list ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_own" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_public_read" ON profiles FOR SELECT USING (true);

-- Bookings: cliente vê os seus, barbeiro vê os dele
CREATE POLICY "bookings_client" ON bookings FOR ALL USING (auth.uid() = client_id);
CREATE POLICY "bookings_barber" ON bookings FOR SELECT USING (
  barber_id IN (SELECT id FROM barbers WHERE profile_id = auth.uid())
);
CREATE POLICY "bookings_barber_update" ON bookings FOR UPDATE USING (
  barber_id IN (SELECT id FROM barbers WHERE profile_id = auth.uid())
);

-- Payments: apenas o dono vê
CREATE POLICY "payments_own" ON payments FOR ALL USING (auth.uid() = client_id);

-- Reviews: público para leitura, dono cria
CREATE POLICY "reviews_public_read" ON reviews FOR SELECT USING (is_visible = true);
CREATE POLICY "reviews_own_write" ON reviews FOR INSERT WITH CHECK (auth.uid() = client_id);

-- Stories: público para leitura, barbeiro cria
CREATE POLICY "stories_public_read" ON stories FOR SELECT USING (expires_at > NOW());
CREATE POLICY "stories_barber_write" ON stories FOR ALL USING (
  barber_id IN (SELECT id FROM barbers WHERE profile_id = auth.uid())
);

-- Portfolio: público para leitura
CREATE POLICY "portfolio_public_read" ON portfolio_items FOR SELECT USING (true);
CREATE POLICY "portfolio_barber_write" ON portfolio_items FOR ALL USING (
  barber_id IN (SELECT id FROM barbers WHERE profile_id = auth.uid())
);

-- Promotions: público para leitura
CREATE POLICY "promotions_public_read" ON promotions FOR SELECT USING (is_active = true);
CREATE POLICY "promotions_barber_write" ON promotions FOR ALL USING (
  barber_id IN (SELECT id FROM barbers WHERE profile_id = auth.uid())
);

-- ============================================================
-- CRON: Limpar stories expirados (via pg_cron no Supabase)
-- ============================================================
-- SELECT cron.schedule('cleanup-stories', '0 * * * *', $$
--   DELETE FROM stories WHERE expires_at < NOW();
-- $$);
