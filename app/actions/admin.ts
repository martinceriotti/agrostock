'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || key === 'placeholder-service-role-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada. Agregala en las variables de entorno de Vercel.')
  }
  return createSupabaseAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') throw new Error('Solo los administradores pueden realizar esta acción')
  return { userId: user.id, orgId: profile.organization_id! }
}

// ── Listar usuarios de la org ─────────────────────────────────────
export async function getOrgUsers() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  if (!myProfile?.organization_id) throw new Error('Sin organización')
  if (!['admin', 'manager'].includes(myProfile.role)) throw new Error('Sin permisos')

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, created_at')
    .eq('organization_id', myProfile.organization_id)
    .order('full_name')

  if (error) throw error

  // Obtener emails via admin API
  try {
    const admin = getAdminClient()
    const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
    const emailMap = new Map(authData.users.map(u => [u.id, u.email ?? '—']))
    return (profiles ?? []).map(p => ({ ...p, email: emailMap.get(p.id) ?? '—' }))
  } catch {
    // Si no hay service role key, devolver sin emails
    return (profiles ?? []).map(p => ({ ...p, email: '—' }))
  }
}

// ── Invitar nuevo usuario ─────────────────────────────────────────
export async function inviteUser(data: {
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'engineer'
}) {
  const { orgId } = await requireAdmin()
  const admin = getAdminClient()

  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(data.email, {
    data: { full_name: data.full_name },
  })
  if (error) throw new Error(error.message)

  // Asignar org, nombre y rol al perfil
  await admin.from('profiles').upsert({
    id: invited.user.id,
    full_name: data.full_name,
    role: data.role,
    organization_id: orgId,
  }, { onConflict: 'id' })

  revalidatePath('/admin/users')
  return { success: true }
}

// ── Cambiar rol ───────────────────────────────────────────────────
export async function updateUserRole(userId: string, role: 'admin' | 'manager' | 'engineer') {
  const { userId: callerId, orgId } = await requireAdmin()
  if (userId === callerId) throw new Error('No podés cambiar tu propio rol')

  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)
    .eq('organization_id', orgId)

  if (error) throw error
  revalidatePath('/admin/users')
  return { success: true }
}

// ── Actualizar nombre ─────────────────────────────────────────────
export async function updateUserName(userId: string, full_name: string) {
  const { orgId } = await requireAdmin()
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ full_name })
    .eq('id', userId)
    .eq('organization_id', orgId)
  if (error) throw error
  revalidatePath('/admin/users')
  return { success: true }
}

// ── Eliminar usuario ──────────────────────────────────────────────
export async function deleteUser(userId: string) {
  const { userId: callerId } = await requireAdmin()
  if (userId === callerId) throw new Error('No podés eliminarte a vos mismo')

  const admin = getAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
  return { success: true }
}
