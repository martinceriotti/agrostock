'use client'

import { useEffect } from 'react'

export function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash) return

    const params = new URLSearchParams(hash.slice(1))
    const error = params.get('error')
    const accessToken = params.get('access_token')
    const type = params.get('type')

    if (error) return

    if (accessToken && (type === 'invite' || type === 'recovery')) {
      window.location.replace('/auth/set-password' + hash)
    }
  }, [])

  return null
}
