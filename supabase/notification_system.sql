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
