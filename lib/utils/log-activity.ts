import { createClient } from '@/lib/supabase/client'

export async function logActivity(params: {
  action: string
  entityType?: string
  entityId?: string
  entityName?: string
  details?: Record<string, unknown>
  userId: string
  orgId: string
}) {
  try {
    const supabase = createClient()
    const { error } = await supabase.from('activity_logs').insert({
      user_id: params.userId,
      organization_id: params.orgId,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      entity_name: params.entityName ?? null,
      details: params.details ?? null,
    })
    if (error) console.error('[logActivity]', error.message, error.details)
  } catch (e) {
    console.error('[logActivity] unexpected error', e)
  }
}
