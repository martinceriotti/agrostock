'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { OrganizationFormData } from '@/lib/validations'
import type { Organization } from '@/lib/types/database.types'
import { toast } from 'sonner'

export function useOrganization() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['organization'],
    queryFn: async (): Promise<Organization | null> => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
        .single()

      if (!profile?.organization_id) return null

      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', profile.organization_id)
        .single()

      if (error) return null
      return data as Organization
    },
  })
}

export function useCreateOrganization() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (values: OrganizationFormData) => {
      // Llama la función de Supabase que crea la org, asigna el usuario y hace el seed
      const { data, error } = await supabase.rpc('create_organization_for_user', {
        org_name: values.name,
        org_cuit: values.cuit || null,
        org_email: values.contact_email || null,
        org_phone: values.phone || null,
        org_address: values.address || null,
      })

      if (error) throw error
      return data as string // org_id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user'] })
      qc.invalidateQueries({ queryKey: ['organization'] })
      toast.success('Organización creada')
    },
    onError: (error) => {
      console.error(error)
      toast.error('Error al crear la organización')
    },
  })
}

export function useUpdateOrganization() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<OrganizationFormData> }) => {
      const { error } = await supabase
        .from('organizations')
        .update(values)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organization'] })
      toast.success('Organización actualizada')
    },
    onError: () => toast.error('Error al actualizar'),
  })
}
