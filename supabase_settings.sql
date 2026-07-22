-- Adicionar coluna logo_url na tabela units
ALTER TABLE public.units ADD COLUMN IF NOT EXISTS logo_url text;
