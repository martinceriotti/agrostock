'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { FieldApplicationFormData } from '@/lib/validations'
import type { ApplicationRow } from '@/lib/types/app.types'
import { toast } from 'sonner'

export function useApplications() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['applications'],
    queryFn: async (): Promise<ApplicationRow[]> => {
      const { data, error } = await supabase
        .from('field_applications')
        .select(`
          *,
          profiles:created_by (id, full_name),
          field_application_items (
            id, quantity_used,
            products:product_id (id, name, unit),
            warehouses:warehouse_id (id, name)
          )
        `)
        .order('application_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as ApplicationRow[]
    },
  })
}

export function useCreateApplication() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ values, userId }: { values: FieldApplicationFormData; userId: string }) => {
      const { items, ...appData } = values

      const { data: app, error: appError } = await supabase
        .from('field_applications')
        .insert({ ...appData, created_by: userId })
        .select()
        .single()

      if (appError) throw appError

      const itemsToInsert = items.map(item => ({
        ...item,
        application_id: app.id,
      }))

      const { error: itemsError } = await supabase.from('field_application_items').insert(itemsToInsert)
      if (itemsError) throw itemsError

      for (const item of items) {
        const { error: movError } = await supabase.from('stock_movements').insert({
          movement_type: 'consumption',
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          quantity: -item.quantity_used,
          reference_id: app.id,
          notes: `Aplicación en ${values.field_name}`,
          created_by: userId,
        })
        if (movError) throw movError
      }

      return app
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      qc.invalidateQueries({ queryKey: ['current-stock'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      toast.success('Aplicación registrada. Stock descontado.')
    },
    onError: (error) => {
      console.error(error)
      toast.error('Error al registrar la aplicación')
    },
  })
}
