import { z } from 'zod'

export const organizationSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  cuit: z.string().optional(),
  contact_email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
})

export const warehouseSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  location: z.string().optional(),
  description: z.string().optional(),
})

export const productCategorySchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.enum(['agroquimico', 'semilla']),
})

export const productSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  brand: z.string().optional(),
  active_ingredient: z.string().optional(),
  category_id: z.string().min(1, 'La categoría es requerida'),
  unit: z.enum(['L', 'kg', 'unidad', 'bolsa']),
  description: z.string().optional(),
  min_stock_alert: z.number().min(0).optional().nullable(),
})

export const supplierSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  contact: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
})

export const purchaseOrderItemSchema = z.object({
  product_id: z.string().min(1, 'El producto es requerido'),
  warehouse_id: z.string().min(1, 'El depósito es requerido'),
  quantity_ordered: z.number().positive('La cantidad debe ser mayor a 0'),
  unit_price: z.number().min(0).optional().nullable(),
  currency: z.enum(['ARS', 'USD']),
  lote: z.string().optional(),
  fecha_vencimiento: z.string().optional().nullable(),
})

export const purchaseOrderSchema = z.object({
  supplier_id: z.string().optional().nullable(),
  currency: z.enum(['ARS', 'USD']),
  exchange_rate: z.number().min(0).optional().nullable(),
  notes: z.string().optional(),
  ordered_at: z.string(),
  expected_at: z.string().optional().nullable(),
  items: z.array(purchaseOrderItemSchema).min(1, 'Agregá al menos un ítem'),
})

export const receiveItemSchema = z.object({
  id: z.string(),
  quantity_received: z.number().min(0),
})

export const fieldApplicationItemSchema = z.object({
  product_id: z.string().min(1, 'El producto es requerido'),
  warehouse_id: z.string().min(1, 'El depósito es requerido'),
  dose_per_ha: z.number().positive().optional().nullable(),
  quantity_used: z.number().positive('La cantidad debe ser mayor a 0'),
  lot_id: z.string().optional().nullable(),
})

export const fieldApplicationSchema = z.object({
  field_name: z.string().min(1, 'El nombre del lote/campo es requerido'),
  application_date: z.string(),
  notes: z.string().optional(),
  // Orden de aplicación
  crop: z.string().optional(),
  crop_variety: z.string().optional(),
  cycle: z.string().optional(),
  area_ha: z.number().positive().optional().nullable(),
  client_name: z.string().optional(),
  client_email: z.string().email('Email inválido').optional().or(z.literal('')),
  contractor: z.string().optional(),
  machine: z.string().optional(),
  nozzle_type: z.string().optional(),
  application_rate_lha: z.number().positive().optional().nullable(),
  min_humidity: z.number().min(0).max(100).optional().nullable(),
  max_temperature: z.number().optional().nullable(),
  max_wind_speed: z.number().min(0).optional().nullable(),
  wind_direction: z.string().optional(),
  withholding_period: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  items: z.array(fieldApplicationItemSchema).min(1, 'Agregá al menos un producto'),
})

export const stockAdjustmentSchema = z.object({
  product_id: z.string().min(1),
  warehouse_id: z.string().min(1),
  quantity: z.number(),
  notes: z.string().min(1, 'El motivo del ajuste es requerido'),
})

export type OrganizationFormData = z.infer<typeof organizationSchema>
export type WarehouseFormData = z.infer<typeof warehouseSchema>
export type ProductCategoryFormData = z.infer<typeof productCategorySchema>
export type ProductFormData = z.infer<typeof productSchema>
export type SupplierFormData = z.infer<typeof supplierSchema>
export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>
export type ReceiveItemData = z.infer<typeof receiveItemSchema>
export type FieldApplicationFormData = z.infer<typeof fieldApplicationSchema>
export type StockAdjustmentFormData = z.infer<typeof stockAdjustmentSchema>
