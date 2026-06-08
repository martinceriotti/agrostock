'use client'

import { createClient } from '@/lib/supabase/client'
import { useQuery } from '@tanstack/react-query'
import type { Profile } from '@/lib/types/database.types'

export function useUser() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) return null

      const { data: profile } = await supabase
        .from('profiles')
        .select('*, organizations:organization_id (id, name)')
        .eq('id', user.id)
        .single()

      return profile as (Profile & { organizations: { id: string; name: string } | null }) | null
    },
  })
}
