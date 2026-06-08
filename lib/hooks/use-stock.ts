'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { StockEntry, StockMovementRow } from '@/lib/types/app.types'

export function useCurrentStock() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['current-stock'],
    queryFn: async (): Promise<StockEntry[]> => {
      const { data, error } = await supabase
        .from('current_stock')
        .select(`
          product_id,
          warehouse_id,
          quantity,
          products:product_id (id, name, brand, unit, min_stock_alert, category_id,
            product_categories:category_id (id, name, type)
          ),
          warehouses:warehouse_id (id, name, location)
        `)
      if (error) throw error
      return (data ?? []) as unknown as StockEntry[]
    },
  })
}

export function useStockMovements(filters?: { product_id?: string; warehouse_id?: string; limit?: number }) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['stock-movements', filters],
    queryFn: async (): Promise<StockMovementRow[]> => {
      let query = supabase
        .from('stock_movements')
        .select(`
          *,
          products:product_id (id, name, unit),
          warehouses:warehouse_id (id, name),
          profiles:created_by (id, full_name)
        `)
        .order('created_at', { ascending: false })

      if (filters?.product_id) query = query.eq('product_id', filters.product_id)
      if (filters?.warehouse_id) query = query.eq('warehouse_id', filters.warehouse_id)
      if (filters?.limit) query = query.limit(filters.limit)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as StockMovementRow[]
    },
  })
}
