'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createAdminClient(url, key)
}

export type ResetMode = 'transactions' | 'full'

export async function resetOrganizationData(
  mode: ResetMode,
  confirmPhrase: string
): Promise<{ success: true; counts: Record<string, number> } | { success: false; error: string }> {

  if (confirmPhrase !== 'BORRAR TODO') {
    return { success: false, error: 'Frase de confirmación incorrecta' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'No autenticado' }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) return { success: false, error: 'Sin organización asignada' }
  if (profile.role !== 'admin')   return { success: false, error: 'Se requiere rol Admin' }

  const admin = getAdminClient()

  const { data, error } = await admin.rpc('reset_organization_data', {
    org_id: profile.organization_id,
    mode,
  })

  if (error) return { success: false, error: error.message }

  return { success: true, counts: data as Record<string, number> }
}
