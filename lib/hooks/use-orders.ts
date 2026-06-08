'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { PurchaseOrderFormData } from '@/lib/validations'
import type { OrderRow } from '@/lib/types/app.types'
import { toast } from 'sonner'

export function useOrders(status?: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['orders', status],
    queryFn: async (): Promise<OrderRow[]> => {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers:supplier_id (id, name),
          profiles:created_by (id, full_name),
          purchase_order_items (
            id, quantity_ordered, quantity_received, unit_price, currency,
            products:product_id (id, name, unit),
            warehouses:warehouse_id (id, name)
          )
        `)
        .order('created_at', { ascending: false })

      if (status) query = query.eq('status', status)

      const { data, error } = await query
      if (error) throw error
      return (data ?? []) as unknown as OrderRow[]
    },
  })
}

export function useOrder(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async (): Promise<OrderRow | null> => {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          suppliers:supplier_id (id, name),
          profiles:created_by (id, full_name),
          purchase_order_items (
            id, quantity_ordered, quantity_received, unit_price, currency,
            products:product_id (id, name, unit),
            warehouses:warehouse_id (id, name)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as OrderRow
    },
    enabled: !!id,
  })
}

export function useCreateOrder() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ values, userId }: { values: PurchaseOrderFormData; userId: string }) => {
      const { items, ...orderData } = values

      const { data: order, error: orderError } = await supabase
        .from('purchase_orders')
        .insert({ ...orderData, created_by: userId })
        .select()
        .single()

      if (orderError) throw orderError

      const itemsToInsert = items.map(item => ({
        ...item,
        order_id: order.id,
      }))

      const { error: itemsError } = await supabase.from('purchase_order_items').insert(itemsToInsert)
      if (itemsError) throw itemsError

      return order
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Orden de compra creada')
    },
    onError: () => toast.error('Error al crear la orden'),
  })
}

export function useReceiveOrder() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      items,
      userId,
    }: {
      orderId: string
      items: Array<{ id: string; quantity_received: number; product_id: string; warehouse_id: string; unit_price: number | null; currency: string }>
      userId: string
    }) => {
      for (const item of items) {
        if (item.quantity_received <= 0) continue

        const { error: updateError } = await supabase
          .from('purchase_order_items')
          .update({ quantity_received: item.quantity_received })
          .eq('id', item.id)

        if (updateError) throw updateError

        const { error: movError } = await supabase.from('stock_movements').insert({
          movement_type: 'purchase_receipt',
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          quantity: item.quantity_received,
          unit_price: item.unit_price,
          currency: item.currency as 'ARS' | 'USD',
          reference_id: item.id,
          created_by: userId,
        })

        if (movError) throw movError
      }

      const { data: orderItems } = await supabase
        .from('purchase_order_items')
        .select('quantity_ordered, quantity_received')
        .eq('order_id', orderId)

      if (orderItems) {
        const allReceived = orderItems.every(i => i.quantity_received >= i.quantity_ordered)
        const anyReceived = orderItems.some(i => i.quantity_received > 0)
        const newStatus = allReceived ? 'received' : anyReceived ? 'partial' : 'pending'

        await supabase.from('purchase_orders').update({ status: newStatus }).eq('id', orderId)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['current-stock'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      toast.success('Recepción registrada. Stock actualizado.')
    },
    onError: () => toast.error('Error al registrar la recepción'),
  })
}

export function useCancelOrder() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('purchase_orders').update({ status: 'cancelled' }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] })
      toast.success('Orden cancelada')
    },
    onError: () => toast.error('Error al cancelar'),
  })
}
