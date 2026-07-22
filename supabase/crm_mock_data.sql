-- ==========================================
-- SCRIPT DE MOCK DATA - CRM & ANALYTICS (V2 ROBUSTO)
-- ==========================================

DO $$
DECLARE
  v_unit_id UUID;
  v_barber_id UUID;
  v_service_id UUID;
  v_existing_client UUID;
  
  -- Algumas variáveis para iteração
  i INT;
  random_days INT;
  random_amount DECIMAL;
  booking_date DATE;
  new_booking_id UUID;
BEGIN
  -- 1. Garantir que temos uma Unidade
  SELECT id INTO v_unit_id FROM units LIMIT 1;
  IF v_unit_id IS NULL THEN
    INSERT INTO units (name, slug, address, city, state) VALUES ('Matriz', 'matriz', 'Rua X', 'SP', 'SP') RETURNING id INTO v_unit_id;
  END IF;

  -- 2. Garantir que temos um Cliente Real (o seu próprio usuário) para não dar erro no auth.users
  SELECT id INTO v_existing_client FROM profiles LIMIT 1;
  IF v_existing_client IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário encontrado. Crie uma conta no app primeiro.';
  END IF;

  -- 3. Garantir que temos um Barbeiro
  SELECT id INTO v_barber_id FROM barbers LIMIT 1;
  IF v_barber_id IS NULL THEN
    INSERT INTO barbers (unit_id, profile_id, display_name) 
    VALUES (v_unit_id, v_existing_client, 'Barbeiro Teste') 
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_barber_id;
    
    IF v_barber_id IS NULL THEN
      SELECT id INTO v_barber_id FROM barbers LIMIT 1;
    END IF;
  END IF;

  -- 4. Garantir que temos um Serviço
  SELECT id INTO v_service_id FROM services LIMIT 1;
  IF v_service_id IS NULL THEN
    INSERT INTO services (unit_id, name, duration_minutes, price) 
    VALUES (v_unit_id, 'Corte Mock', 30, 50.00) RETURNING id INTO v_service_id;
  END IF;

  -- 5. Inserir dezenas de agendamentos no PASSADO usando O SEU CLIENTE
  -- Isso vai inflar os gráficos do CRM!
  
  -- GERAR 30 AGENDAMENTOS COMPLETO ESPALHADOS NO ÚLTIMO MÊS
  FOR i IN 1..30 LOOP
    random_days := trunc(random() * 30); -- Dias aleatórios entre 0 e 30
    booking_date := CURRENT_DATE - random_days;
    new_booking_id := uuid_generate_v4();
    random_amount := 30.00 + (trunc(random() * 50)); -- Preço entre 30 e 80

    INSERT INTO bookings (id, client_id, barber_id, unit_id, service_id, scheduled_date, scheduled_time, end_time, status)
    VALUES (new_booking_id, v_existing_client, v_barber_id, v_unit_id, v_service_id, booking_date, '14:00', '14:45', 'completed');

    INSERT INTO payments (booking_id, client_id, amount, method, status, paid_at, created_at)
    VALUES (new_booking_id, v_existing_client, random_amount, 'pix', 'paid', booking_date + interval '14 hours', booking_date + interval '14 hours');
  END LOOP;

  -- GERAR ALGUNS CANCELAMENTOS
  FOR i IN 1..5 LOOP
    random_days := trunc(random() * 30);
    booking_date := CURRENT_DATE - random_days;
    new_booking_id := uuid_generate_v4();

    INSERT INTO bookings (id, client_id, barber_id, unit_id, service_id, scheduled_date, scheduled_time, end_time, status)
    VALUES (new_booking_id, v_existing_client, v_barber_id, v_unit_id, v_service_id, booking_date, '10:00', '10:30', 'cancelled');
  END LOOP;

END $$;
