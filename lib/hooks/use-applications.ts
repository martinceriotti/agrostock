'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { FieldApplicationFormData } from '@/lib/validations'
import type { ApplicationRow } from '@/lib/types/app.types'
import { toast } from 'sonner'
import { logActivity } from '@/lib/utils/log-activity'

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
            id, quantity_used, dose_per_ha,
            products:product_id (id, name, unit, active_ingredient),
            warehouses:warehouse_id (id, name)
          )
        `)
        .order('application_date', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as ApplicationRow[]
    },
  })
}

export function useApplication(id: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['applications', id],
    queryFn: async (): Promise<ApplicationRow | null> => {
      const { data, error } = await supabase
        .from('field_applications')
        .select(`
          *,
          profiles:created_by (id, full_name),
          field_application_items (
            id, quantity_used, dose_per_ha,
            products:product_id (id, name, unit, active_ingredient),
            warehouses:warehouse_id (id, name)
          )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data as unknown as ApplicationRow
    },
    enabled: !!id,
  })
}

export function useCreateApplication() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      values,
      userId,
      orgId,
    }: {
      values: FieldApplicationFormData
      userId: string
      orgId: string
    }) => {
      const { items, ...appData } = values

      // Crea la orden en estado 'draft' — sin descontar stock todavía
      const { data: app, error: appError } = await supabase
        .from('field_applications')
        .insert({
          ...appData,
          created_by: userId,
          organization_id: orgId,
          order_status: 'draft',
        })
        .select()
        .single()

      if (appError) throw appError

      const itemsToInsert = items.map(item => ({
        application_id: app.id,
        product_id: item.product_id,
        warehouse_id: item.warehouse_id,
        quantity_used: item.quantity_used,
        dose_per_ha: item.dose_per_ha ?? null,
      }))

      const { error: itemsError } = await supabase.from('field_application_items').insert(itemsToInsert)
      if (itemsError) throw itemsError

      return app
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Orden de aplicación creada como borrador.')
      logActivity({
        action: 'create_application',
        entityType: 'application',
        entityId: (data as { id: string }).id,
        entityName: variables.values.field_name,
        userId: variables.userId,
        orgId: variables.orgId,
      })
    },
    onError: (error) => {
      console.error(error)
      toast.error('Error al crear la orden de aplicación')
    },
  })
}

export function useExecuteApplication() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      applicationId,
      userId,
      orgId,
    }: {
      applicationId: string
      userId: string
      orgId: string
    }) => {
      // Obtener los ítems de la aplicación
      const { data: items, error: itemsError } = await supabase
        .from('field_application_items')
        .select('product_id, warehouse_id, quantity_used')
        .eq('application_id', applicationId)

      if (itemsError) throw itemsError

      // Obtener el field_name para la nota
      const { data: app } = await supabase
        .from('field_applications')
        .select('field_name')
        .eq('id', applicationId)
        .single()

      // Crear movimientos de stock (consumo)
      for (const item of items ?? []) {
        const { error: movError } = await supabase.from('stock_movements').insert({
          movement_type: 'consumption',
          product_id: item.product_id,
          warehouse_id: item.warehouse_id,
          quantity: -item.quantity_used,
          reference_id: applicationId,
          notes: `Aplicación en ${app?.field_name ?? ''}`,
          created_by: userId,
          organization_id: orgId,
        })
        if (movError) throw movError
      }

      // Marcar la orden como ejecutada
      const { error: updateError } = await supabase
        .from('field_applications')
        .update({ order_status: 'executed' })
        .eq('id', applicationId)

      if (updateError) throw updateError
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      qc.invalidateQueries({ queryKey: ['current-stock'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Aplicación ejecutada. Stock descontado.')
      logActivity({
        action: 'execute_application',
        entityType: 'application',
        entityId: variables.applicationId,
        userId: variables.userId,
        orgId: variables.orgId,
      })
    },
    onError: (error) => {
      console.error(error)
      toast.error('Error al ejecutar la aplicación')
    },
  })
}

export function useUpdateApplicationStatus() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'draft' | 'sent' | 'executed' }) => {
      const { error } = await supabase
        .from('field_applications')
        .update({ order_status: status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      toast.success('Estado actualizado')
    },
    onError: () => toast.error('Error al actualizar el estado'),
  })
}
