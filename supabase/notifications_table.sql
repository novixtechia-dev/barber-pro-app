CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON notifications;
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_update" ON notifications;
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "notifications_insert_admin" ON notifications;
CREATE POLICY "notifications_insert_admin" ON notifications FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'barber')));
