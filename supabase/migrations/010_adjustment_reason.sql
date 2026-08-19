-- supabase/migrations/010_adjustment_reason.sql
-- Categoría de motivo para ajustes manuales de stock (movement_type = 'adjustment')

ALTER TABLE public.stock_movements
  ADD COLUMN adjustment_reason TEXT
  CHECK (adjustment_reason IS NULL OR adjustment_reason IN (
    'recount', 'breakage', 'theft_loss', 'expiry', 'data_correction', 'other'
  ));
