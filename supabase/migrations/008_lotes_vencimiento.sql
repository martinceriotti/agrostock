-- Agrega trazabilidad de lote y fecha de vencimiento a los items de órdenes de compra
ALTER TABLE purchase_order_items
  ADD COLUMN lote TEXT,
  ADD COLUMN fecha_vencimiento DATE;
