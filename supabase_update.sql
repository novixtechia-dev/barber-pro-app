-- Execute este script no painel do Supabase -> SQL Editor -> New Query -> Run
ALTER TABLE bookings ADD COLUMN cancelled_by_role text; -- Pode ser 'client' ou 'barber'
