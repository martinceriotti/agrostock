'use server'

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionResult<T = null> = { success: true; data?: T } | { success: false; error: string }

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key || key === 'placeholder-service-role-key') {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada.')
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
export async function getOrgUsers(): Promise<ActionResult<Array<{
  id: string; full_name: string; email: string; role: string; created_at: string
}>>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'No autenticado' }

    const { data: myProfile } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single()

    if (!myProfile?.organization_id) return { success: false, error: 'Sin organización' }
    if (!['admin', 'manager'].includes(myProfile.role)) return { success: false, error: 'Sin permisos' }

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('organization_id', myProfile.organization_id)
      .order('full_name')

    if (error) return { success: false, error: error.message }

    try {
      const admin = getAdminClient()
      const { data: authData } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const emailMap = new Map(authData.users.map(u => [u.id, u.email ?? '—']))
      return {
        success: true,
        data: (profiles ?? []).map(p => ({ ...p, email: emailMap.get(p.id) ?? '—' })),
      }
    } catch {
      return {
        success: true,
        data: (profiles ?? []).map(p => ({ ...p, email: '—' })),
      }
    }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ── Invitar nuevo usuario ─────────────────────────────────────────
export async function inviteUser(data: {
  full_name: string
  email: string
  role: 'admin' | 'manager' | 'engineer'
}): Promise<ActionResult> {
  try {
    const { orgId } = await requireAdmin()
    const admin = getAdminClient()

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'http://localhost:3000')

    const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.full_name, role: data.role, organization_id: orgId },
      redirectTo: `${siteUrl}/auth/set-password`,
    })
    if (error) return { success: false, error: error.message }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: invited.user.id,
      full_name: data.full_name,
      role: data.role,
      organization_id: orgId,
    }, { onConflict: 'id' })

    if (profileError) return { success: false, error: profileError.message }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ── Cambiar rol ───────────────────────────────────────────────────
export async function updateUserRole(
  userId: string,
  role: 'admin' | 'manager' | 'engineer',
): Promise<ActionResult> {
  try {
    const { userId: callerId, orgId } = await requireAdmin()
    if (userId === callerId) return { success: false, error: 'No podés cambiar tu propio rol' }

    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId)
      .eq('organization_id', orgId)

    if (error) return { success: false, error: error.message }
    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ── Actualizar nombre ─────────────────────────────────────────────
export async function updateUserName(userId: string, full_name: string): Promise<ActionResult> {
  try {
    const { orgId } = await requireAdmin()
    const supabase = await createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ full_name })
      .eq('id', userId)
      .eq('organization_id', orgId)
    if (error) return { success: false, error: error.message }
    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ── Eliminar usuario ──────────────────────────────────────────────
export async function deleteUser(userId: string): Promise<ActionResult> {
  try {
    const { userId: callerId } = await requireAdmin()
    if (userId === callerId) return { success: false, error: 'No podés eliminarte a vos mismo' }

    const admin = getAdminClient()
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return { success: false, error: error.message }

    revalidatePath('/admin/users')
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ── Restablecer contraseña (envía email al usuario) ───────────────
export async function sendPasswordReset(email: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
      ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : 'http://localhost:3000')
    const supabase = await createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/auth/set-password`,
    })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}

// ── Setear contraseña temporal (admin) ───────────────────────────
export async function setUserPassword(userId: string, password: string): Promise<ActionResult> {
  try {
    const { orgId } = await requireAdmin()
    const supabase = await createClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .eq('organization_id', orgId)
      .single()
    if (!profile) return { success: false, error: 'Usuario no encontrado en la organización' }
    const admin = getAdminClient()
    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (e) {
    return { success: false, error: (e as Error).message }
  }
}
