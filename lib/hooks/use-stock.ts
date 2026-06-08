'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { StockEntry, StockMovementRow } from '@/lib/types/app.types'
import { toast } from 'sonner'
import { logActivity } from '@/lib/utils/log-activity'

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

export function useTransferStock() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      productId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      notes,
      userId,
      orgId,
    }: {
      productId: string
      fromWarehouseId: string
      toWarehouseId: string
      quantity: number
      notes?: string
      userId: string
      orgId: string
    }) => {
      const base = {
        movement_type: 'transfer' as const,
        product_id: productId,
        quantity,
        notes: notes ?? null,
        created_by: userId,
        organization_id: orgId,
      }

      const { error: e1 } = await supabase.from('stock_movements').insert({
        ...base,
        warehouse_id: fromWarehouseId,
        quantity: -quantity,
      })
      if (e1) throw e1

      const { error: e2 } = await supabase.from('stock_movements').insert({
        ...base,
        warehouse_id: toWarehouseId,
        quantity: quantity,
      })
      if (e2) throw e2
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['current-stock'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      toast.success('Transferencia registrada. Stock actualizado.')
      logActivity({
        action: 'transfer_stock',
        entityType: 'stock_movement',
        userId: variables.userId,
        orgId: variables.orgId,
      })
    },
    onError: () => toast.error('Error al registrar la transferencia'),
  })
}
