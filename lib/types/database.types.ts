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
      profiles: {
        Row: {
          id: string
          full_name: string
          role: 'admin' | 'manager' | 'engineer'
          created_at: string
        }
        Insert: {
          id: string
          full_name: string
          role?: 'admin' | 'manager' | 'engineer'
          created_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          role?: 'admin' | 'manager' | 'engineer'
          created_at?: string
        }
      }
      warehouses: {
        Row: {
          id: string
          name: string
          location: string | null
          description: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          location?: string | null
          description?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          location?: string | null
          description?: string | null
          created_at?: string
        }
      }
      product_categories: {
        Row: {
          id: string
          name: string
          type: 'agroquimico' | 'semilla'
        }
        Insert: {
          id?: string
          name: string
          type: 'agroquimico' | 'semilla'
        }
        Update: {
          id?: string
          name?: string
          type?: 'agroquimico' | 'semilla'
        }
      }
      products: {
        Row: {
          id: string
          name: string
          brand: string | null
          category_id: string
          unit: 'L' | 'kg' | 'unidad' | 'bolsa'
          description: string | null
          min_stock_alert: number | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          brand?: string | null
          category_id: string
          unit: 'L' | 'kg' | 'unidad' | 'bolsa'
          description?: string | null
          min_stock_alert?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          brand?: string | null
          category_id?: string
          unit?: 'L' | 'kg' | 'unidad' | 'bolsa'
          description?: string | null
          min_stock_alert?: number | null
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
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          contact?: string | null
          email?: string | null
          phone?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          contact?: string | null
          email?: string | null
          phone?: string | null
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
        }
      }
      field_applications: {
        Row: {
          id: string
          field_name: string
          application_date: string
          notes: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          field_name: string
          application_date: string
          notes?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          field_name?: string
          application_date?: string
          notes?: string | null
          created_by?: string
          created_at?: string
        }
      }
      field_application_items: {
        Row: {
          id: string
          application_id: string
          product_id: string
          warehouse_id: string
          quantity_used: number
        }
        Insert: {
          id?: string
          application_id: string
          product_id: string
          warehouse_id: string
          quantity_used: number
        }
        Update: {
          id?: string
          application_id?: string
          product_id?: string
          warehouse_id?: string
          quantity_used?: number
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
          created_at: string
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
          created_at?: string
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
          created_at?: string
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
    }
    Functions: {}
    Enums: {}
  }
}

// Convenience types
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

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
export type CurrentStock = Database['public']['Views']['current_stock']['Row']
