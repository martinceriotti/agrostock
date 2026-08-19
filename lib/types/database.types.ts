export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string
          name: string
          cuit: string | null
          contact_email: string | null
          phone: string | null
          address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          cuit?: string | null
          contact_email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          cuit?: string | null
          contact_email?: string | null
          phone?: string | null
          address?: string | null
          created_at?: string
        }
      }
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'manager' | 'engineer'
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: 'admin' | 'manager' | 'engineer'
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'manager' | 'engineer'
          organization_id?: string | null
          created_at?: string
        }
      }
      warehouses: {
        Row: {
          id: string
          name: string
          location: string | null
          description: string | null
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          description?: string | null
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string | null
          description?: string | null
          organization_id?: string | null
          created_at?: string
        }
      }
      product_categories: {
        Row: {
          id: string
          name: string
          type: 'agroquimico' | 'semilla'
          organization_id: string | null
        }
        Insert: {
          id?: string
          name: string
          type: 'agroquimico' | 'semilla'
          organization_id?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: 'agroquimico' | 'semilla'
          organization_id?: string | null
        }
      }
      products: {
        Row: {
          id: string
          name: string
          brand: string | null
          active_ingredient: string | null
          category_id: string
          unit: 'L' | 'kg' | 'unidad' | 'bolsa'
          description: string | null
          min_stock_alert: number | null
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          brand?: string | null
          active_ingredient?: string | null
          category_id: string
          unit: 'L' | 'kg' | 'unidad' | 'bolsa'
          description?: string | null
          min_stock_alert?: number | null
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          brand?: string | null
          active_ingredient?: string | null
          category_id?: string
          unit?: 'L' | 'kg' | 'unidad' | 'bolsa'
          description?: string | null
          min_stock_alert?: number | null
          organization_id?: string | null
          created_at?: string
        }
      }
      suppliers: {
        Row: {
          id: string
          name: string
          contact: string | null
          email: string | null
          phone: string | null
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          contact?: string | null
          email?: string | null
          phone?: string | null
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact?: string | null
          email?: string | null
          phone?: string | null
          organization_id?: string | null
          created_at?: string
        }
      }
      purchase_orders: {
        Row: {
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
          organization_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_number?: string
          supplier_id?: string | null
          status?: 'pending' | 'partial' | 'received' | 'cancelled'
          currency?: 'ARS' | 'USD'
          exchange_rate?: number | null
          notes?: string | null
          ordered_at?: string
          expected_at?: string | null
          created_by: string
          organization_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          supplier_id?: string | null
          status?: 'pending' | 'partial' | 'received' | 'cancelled'
          currency?: 'ARS' | 'USD'
          exchange_rate?: number | null
          notes?: string | null
          ordered_at?: string
          expected_at?: string | null
          created_by?: string
          organization_id?: string | null
          created_at?: string
        }
      }
      purchase_order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          warehouse_id: string
          quantity_ordered: number
          quantity_received: number
          unit_price: number | null
          currency: 'ARS' | 'USD'
          lote: string | null
          fecha_vencimiento: string | null
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          warehouse_id: string
          quantity_ordered: number
          quantity_received?: number
          unit_price?: number | null
          currency?: 'ARS' | 'USD'
          lote?: string | null
          fecha_vencimiento?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          warehouse_id?: string
          quantity_ordered?: number
          quantity_received?: number
          unit_price?: number | null
          currency?: 'ARS' | 'USD'
          lote?: string | null
          fecha_vencimiento?: string | null
        }
      }
      field_applications: {
        Row: {
          id: string
          field_name: string
          application_date: string
          notes: string | null
          created_by: string
          organization_id: string | null
          created_at: string
          // Orden de aplicación
          crop: string | null
          crop_variety: string | null
          cycle: string | null
          area_ha: number | null
          client_name: string | null
          client_email: string | null
          contractor: string | null
          machine: string | null
          nozzle_type: string | null
          application_rate_lha: number | null
          min_humidity: number | null
          max_temperature: number | null
          max_wind_speed: number | null
          wind_direction: string | null
          withholding_period: string | null
          order_status: 'draft' | 'sent' | 'executed'
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          id?: string
          field_name: string
          application_date: string
          notes?: string | null
          created_by: string
          organization_id?: string | null
          created_at?: string
          crop?: string | null
          crop_variety?: string | null
          cycle?: string | null
          area_ha?: number | null
          client_name?: string | null
          client_email?: string | null
          contractor?: string | null
          machine?: string | null
          nozzle_type?: string | null
          application_rate_lha?: number | null
          min_humidity?: number | null
          max_temperature?: number | null
          max_wind_speed?: number | null
          wind_direction?: string | null
          withholding_period?: string | null
          order_status?: 'draft' | 'sent' | 'executed'
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          id?: string
          field_name?: string
          application_date?: string
          notes?: string | null
          created_by?: string
          organization_id?: string | null
          created_at?: string
          crop?: string | null
          crop_variety?: string | null
          cycle?: string | null
          area_ha?: number | null
          client_name?: string | null
          client_email?: string | null
          contractor?: string | null
          machine?: string | null
          nozzle_type?: string | null
          application_rate_lha?: number | null
          min_humidity?: number | null
          max_temperature?: number | null
          max_wind_speed?: number | null
          wind_direction?: string | null
          withholding_period?: string | null
          order_status?: 'draft' | 'sent' | 'executed'
          latitude?: number | null
          longitude?: number | null
        }
      }
      field_application_items: {
        Row: {
          id: string
          application_id: string
          product_id: string
          warehouse_id: string
          quantity_used: number
          dose_per_ha: number | null
          lot_id: string | null
        }
        Insert: {
          id?: string
          application_id: string
          product_id: string
          warehouse_id: string
          quantity_used: number
          dose_per_ha?: number | null
          lot_id?: string | null
        }
        Update: {
          id?: string
          application_id?: string
          product_id?: string
          warehouse_id?: string
          quantity_used?: number
          dose_per_ha?: number | null
          lot_id?: string | null
        }
      }
      stock_lots: {
        Row: {
          id: string
          organization_id: string | null
          product_id: string
          warehouse_id: string
          lote: string
          fecha_vencimiento: string | null
          purchase_order_item_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          product_id: string
          warehouse_id: string
          lote: string
          fecha_vencimiento?: string | null
          purchase_order_item_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          organization_id?: string | null
          product_id?: string
          warehouse_id?: string
          lote?: string
          fecha_vencimiento?: string | null
          purchase_order_item_id?: string | null
          created_at?: string
        }
      }
      stock_movements: {
        Row: {
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
          organization_id: string | null
          created_at: string
          lot_id: string | null
          adjustment_reason: 'recount' | 'breakage' | 'theft_loss' | 'expiry' | 'data_correction' | 'other' | null
        }
        Insert: {
          id?: string
          movement_type: 'purchase_receipt' | 'consumption' | 'transfer' | 'adjustment' | 'initial'
          product_id: string
          warehouse_id: string
          quantity: number
          unit_price?: number | null
          currency?: 'ARS' | 'USD' | null
          reference_id?: string | null
          notes?: string | null
          created_by: string
          organization_id?: string | null
          created_at?: string
          lot_id?: string | null
          adjustment_reason?: 'recount' | 'breakage' | 'theft_loss' | 'expiry' | 'data_correction' | 'other' | null
        }
        Update: {
          id?: string
          movement_type?: 'purchase_receipt' | 'consumption' | 'transfer' | 'adjustment' | 'initial'
          product_id?: string
          warehouse_id?: string
          quantity?: number
          unit_price?: number | null
          currency?: 'ARS' | 'USD' | null
          reference_id?: string | null
          notes?: string | null
          created_by?: string
          organization_id?: string | null
          created_at?: string
          lot_id?: string | null
          adjustment_reason?: 'recount' | 'breakage' | 'theft_loss' | 'expiry' | 'data_correction' | 'other' | null
        }
      }
    }
    Views: {
      current_stock: {
        Row: {
          product_id: string
          warehouse_id: string
          quantity: number
        }
      }
      current_lot_stock: {
        Row: {
          lot_id: string
          organization_id: string | null
          product_id: string
          warehouse_id: string
          lote: string
          fecha_vencimiento: string | null
          quantity: number
        }
      }
    }
    Functions: {}
    Enums: {}
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Organization = Tables<'organizations'>
export type Profile = Tables<'profiles'>
export type Warehouse = Tables<'warehouses'>
export type ProductCategory = Tables<'product_categories'>
export type Product = Tables<'products'>
export type Supplier = Tables<'suppliers'>
export type PurchaseOrder = Tables<'purchase_orders'>
export type PurchaseOrderItem = Tables<'purchase_order_items'>
export type FieldApplication = Tables<'field_applications'>
export type FieldApplicationItem = Tables<'field_application_items'>
export type StockMovement = Tables<'stock_movements'>
export type StockLot = Tables<'stock_lots'>
export type CurrentStock = Database['public']['Views']['current_stock']['Row']
export type CurrentLotStock = Database['public']['Views']['current_lot_stock']['Row']
