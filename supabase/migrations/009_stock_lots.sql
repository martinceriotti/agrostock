-- 009_stock_lots.sql
-- Tracking real de lotes: tabla stock_lots, lot_id en movimientos y aplicaciones,
-- vista current_lot_stock y backfill de datos existentes.

-- ============================================================
-- 1. Tabla stock_lots
-- ============================================================
CREATE TABLE public.stock_lots (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id        UUID REFERENCES public.organizations(id),
  product_id             UUID NOT NULL REFERENCES public.products(id),
  warehouse_id           UUID NOT NULL REFERENCES public.warehouses(id),
  lote                   TEXT NOT NULL,
  fecha_vencimiento      DATE,
  purchase_order_item_id UUID REFERENCES public.purchase_order_items(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.stock_lots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_stock_lots" ON public.stock_lots
  USING (
    organization_id = (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- 2. Nuevas columnas en tablas existentes
-- ============================================================
ALTER TABLE public.stock_movements
  ADD COLUMN lot_id UUID REFERENCES public.stock_lots(id);

ALTER TABLE public.field_application_items
  ADD COLUMN lot_id UUID REFERENCES public.stock_lots(id);

-- ============================================================
-- 3. Vista current_lot_stock
-- ============================================================
CREATE OR REPLACE VIEW public.current_lot_stock AS
SELECT
  sl.id                  AS lot_id,
  sl.organization_id,
  sl.product_id,
  sl.warehouse_id,
  sl.lote,
  sl.fecha_vencimiento,
  COALESCE(SUM(sm.quantity), 0) AS quantity
FROM public.stock_lots sl
LEFT JOIN public.stock_movements sm ON sm.lot_id = sl.id
GROUP BY sl.id, sl.organization_id, sl.product_id, sl.warehouse_id, sl.lote, sl.fecha_vencimiento;

-- ============================================================
-- 4. Backfill: crear stock_lots para items recibidos con lote
-- ============================================================
INSERT INTO public.stock_lots (
  organization_id, product_id, warehouse_id,
  lote, fecha_vencimiento, purchase_order_item_id
)
SELECT
  po.organization_id,
  poi.product_id,
  poi.warehouse_id,
  poi.lote,
  poi.fecha_vencimiento,
  poi.id
FROM public.purchase_order_items poi
JOIN public.purchase_orders po ON po.id = poi.order_id
WHERE poi.lote IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM public.stock_movements sm
    WHERE sm.reference_id::text = poi.id::text
      AND sm.movement_type = 'purchase_receipt'
  );

-- ============================================================
-- 5. Backfill: linkear movements existentes a sus stock_lots
-- ============================================================
UPDATE public.stock_movements sm
SET lot_id = sl.id
FROM public.stock_lots sl
WHERE sm.reference_id::text = sl.purchase_order_item_id::text
  AND sm.movement_type = 'purchase_receipt';
