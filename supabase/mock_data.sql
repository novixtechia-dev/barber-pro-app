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
