-- Función para resetear datos de una organización.
-- Llamada desde un server action con service_role (SECURITY DEFINER).
-- mode = 'transactions' → borra solo datos operativos, mantiene config (productos, depósitos, etc.)
-- mode = 'full'         → borra también configuración, deja solo org + usuarios

CREATE OR REPLACE FUNCTION public.reset_organization_data(org_id UUID, mode TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  counts JSONB := '{}';
  n INT;
BEGIN
  -- Verificar que el org_id existe
  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = org_id) THEN
    RAISE EXCEPTION 'Organización no encontrada';
  END IF;

  -- ── IoT: silos (cascada borra sensors/readings/alerts/configs) ──
  DELETE FROM silo_readings      WHERE organization_id = org_id;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('silo_readings', n);

  DELETE FROM silo_alerts        WHERE organization_id = org_id;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('silo_alerts', n);

  DELETE FROM silo_alert_configs WHERE organization_id = org_id;
  DELETE FROM silo_sensors       WHERE organization_id = org_id;

  DELETE FROM silos              WHERE organization_id = org_id;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('silos', n);

  -- ── Movimientos de stock ─────────────────────────────────────────
  DELETE FROM stock_movements    WHERE organization_id = org_id;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('stock_movements', n);

  -- ── Aplicaciones en campo (CASCADE borra application_items) ─────
  DELETE FROM field_applications WHERE organization_id = org_id;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('field_applications', n);

  -- ── Órdenes de compra (CASCADE borra order_items) ────────────────
  DELETE FROM purchase_orders    WHERE organization_id = org_id;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('purchase_orders', n);

  -- ── Log de actividad ─────────────────────────────────────────────
  DELETE FROM activity_logs      WHERE organization_id = org_id;
  GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('activity_logs', n);

  -- ── Configuración (solo si mode = 'full') ────────────────────────
  IF mode = 'full' THEN
    DELETE FROM products           WHERE organization_id = org_id;
    GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('products', n);

    DELETE FROM product_categories WHERE organization_id = org_id;
    DELETE FROM warehouses         WHERE organization_id = org_id;
    GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('warehouses', n);

    DELETE FROM suppliers          WHERE organization_id = org_id;
    GET DIAGNOSTICS n = ROW_COUNT; counts := counts || jsonb_build_object('suppliers', n);
  END IF;

  RETURN counts;
END;
$$;
