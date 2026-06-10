'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Supabase invite/recovery links aterrizan en /login con tokens en el hash.
// Este componente los detecta y redirige a /auth/set-password preservando el hash.
export function AuthHashHandler() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    if (
      hash.includes('access_token') &&
      (hash.includes('type=invite') || hash.includes('type=recovery'))
    ) {
      router.replace('/auth/set-password' + hash)
    }
  }, [router])

  return null
}
