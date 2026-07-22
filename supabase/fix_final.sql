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
