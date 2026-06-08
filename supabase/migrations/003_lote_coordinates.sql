-- Add latitude/longitude to field_applications for future map view
ALTER TABLE field_applications
  ADD COLUMN IF NOT EXISTS latitude  NUMERIC(10, 6),
  ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 6);
