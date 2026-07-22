-- FIX RLS POLICIES FOR PAYMENTS AND BOOKINGS
-- This script fixes the issues where payments were not being updated when a booking was completed,
-- and allows Barbers and Admins to select and insert payments properly.

-- 1. PAYMENTS POLICIES

-- Drop existing payments policies
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_insert" ON payments;
DROP POLICY IF EXISTS "payments_update" ON payments;

-- Select Policy: Clients can see their own. Admins can see all. Barbers can see payments for their bookings.
CREATE POLICY "payments_select" ON payments FOR SELECT USING (
  auth.uid() = client_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') OR
  auth.uid() IN (SELECT profile_id FROM barbers WHERE id = (SELECT barber_id FROM bookings WHERE bookings.id = payments.booking_id))
);

-- Insert Policy: Clients can insert. Admins can insert (for seeding mock data).
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (
  auth.uid() = client_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Update Policy: Admins and Barbers can update payments (e.g. to mark as 'paid' when booking is completed)
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber'))
);

-- 2. BOOKINGS POLICIES (Fixing admin bypass for mock data insertion)

DROP POLICY IF EXISTS "bookings_insert" ON bookings;
-- Insert Policy: Clients can insert. Admins can insert (for seeding mock data).
CREATE POLICY "bookings_insert" ON bookings FOR INSERT WITH CHECK (
  auth.uid() = client_id OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
