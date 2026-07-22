ALTER TABLE barbers ADD COLUMN IF NOT EXISTS auto_approve_type TEXT DEFAULT 'none';
ALTER TABLE barbers ADD COLUMN IF NOT EXISTS auto_approve_time TIME;
