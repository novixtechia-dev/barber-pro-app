-- FIX PROGRESS BAR: Increment client cuts_count when a booking is completed

-- 1. Create a function that increments cuts_count for the client
CREATE OR REPLACE FUNCTION increment_cuts_count_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking's status changes from something else TO 'completed'
  IF (TG_OP = 'UPDATE' AND NEW.status = 'completed' AND OLD.status != 'completed') THEN
    UPDATE profiles
    SET cuts_count = COALESCE(cuts_count, 0) + 1
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Attach the trigger to the bookings table
DROP TRIGGER IF EXISTS trg_increment_cuts_count ON bookings;
CREATE TRIGGER trg_increment_cuts_count
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION increment_cuts_count_on_complete();
