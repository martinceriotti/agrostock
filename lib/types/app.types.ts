// Tipos enriquecidos para queries con joins de Supabase
// (reemplazan la inferencia automática que se genera con el CLI real de Supabase)

export interface StockEntry {
  product_id: string
  warehouse_id: string
  quantity: number
  products: {
    id: string
    name: string
    brand: string | null
    unit: string
    min_stock_alert: number | null
    category_id: string
    product_categories: { id: string; name: string; type: string } | null
  } | null
  warehouses: { id: string; name: string; location: string | null } | null
}

export interface StockMovementRow {
  id: string
  movement_type: 'purchase_receipt' | 'consumption' | 'transfer' | 'adjustment' | 'initial'
  product_id: string
  warehouse_id: string
  quantity: number
  unit_price: number | null
  currency: 'ARS' | 'USD' | null
  reference_id: string | null
  notes: string | null
  created_by: string
  created_at: string
  products: { id: string; name: string; unit: string } | null
  warehouses: { id: string; name: string } | null
  profiles: { id: string; full_name: string } | null
}

export interface OrderRow {
  id: string
  order_number: string
  supplier_id: string | null
  status: 'pending' | 'partial' | 'received' | 'cancelled'
  currency: 'ARS' | 'USD'
  exchange_rate: number | null
  notes: string | null
  ordered_at: string
  expected_at: string | null
  created_by: string
  created_at: string
  suppliers: { id: string; name: string } | null
  profiles: { id: string; full_name: string } | null
  purchase_order_items: OrderItemRow[]
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  warehouse_id: string
  quantity_ordered: number
  quantity_received: number
  unit_price: number | null
  currency: string
  products: { id: string; name: string; unit: string } | null
  warehouses: { id: string; name: string } | null
}

export interface ApplicationRow {
  id: string
  field_name: string
  application_date: string
  notes: string | null
  created_by: string
  created_at: string
  profiles: { id: string; full_name: string } | null
  field_application_items: ApplicationItemRow[]
}

export interface ApplicationItemRow {
  id: string
  application_id: string
  product_id: string
  warehouse_id: string
  quantity_used: number
  products: { id: string; name: string; unit: string } | null
  warehouses: { id: string; name: string } | null
}
