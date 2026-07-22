-- Fix RLS Policies for Barber Autonomy
-- This file fixes 403 errors and allows barbers to manage their own services and schedules.

-- 1. Barber Services
DROP POLICY IF EXISTS "barber_services_select" ON barber_services;
CREATE POLICY "barber_services_select" ON barber_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "barber_services_insert" ON barber_services;
CREATE POLICY "barber_services_insert" ON barber_services FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "barber_services_delete" ON barber_services;
CREATE POLICY "barber_services_delete" ON barber_services FOR DELETE USING (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- 2. Barber Schedules
DROP POLICY IF EXISTS "schedules_select" ON barber_schedules;
CREATE POLICY "schedules_select" ON barber_schedules FOR SELECT USING (true);

DROP POLICY IF EXISTS "schedules_insert" ON barber_schedules;
CREATE POLICY "schedules_insert" ON barber_schedules FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "schedules_update" ON barber_schedules;
CREATE POLICY "schedules_update" ON barber_schedules FOR UPDATE USING (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- 3. Barber Time Offs
DROP POLICY IF EXISTS "barber_time_offs_select" ON barber_time_offs;
CREATE POLICY "barber_time_offs_select" ON barber_time_offs FOR SELECT USING (true);

DROP POLICY IF EXISTS "barber_time_offs_insert" ON barber_time_offs;
CREATE POLICY "barber_time_offs_insert" ON barber_time_offs FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "barber_time_offs_delete" ON barber_time_offs;
CREATE POLICY "barber_time_offs_delete" ON barber_time_offs FOR DELETE USING (
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = barber_id) OR
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);


-- 4. Barbers Update
DROP POLICY IF EXISTS "barbers_update" ON barbers;
CREATE POLICY "barbers_update" ON barbers FOR UPDATE USING (
  auth.uid() = profile_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
