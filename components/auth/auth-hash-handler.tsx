'use client'

import { useEffect } from 'react'

export function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash
    console.log('[AuthHashHandler] hash:', hash || '(vacío)')

    if (!hash) return

    const params = new URLSearchParams(hash.slice(1))
    const error = params.get('error')
    const errorCode = params.get('error_code')
    const accessToken = params.get('access_token')
    const type = params.get('type')

    console.log('[AuthHashHandler] error:', error, '| error_code:', errorCode)
    console.log('[AuthHashHandler] access_token:', accessToken ? '(presente)' : '(ausente)', '| type:', type)

    if (error) {
      console.warn('[AuthHashHandler] Error de Supabase en hash, no redirigiendo.')
      return
    }

    if (accessToken && (type === 'invite' || type === 'recovery')) {
      console.log('[AuthHashHandler] Redirigiendo a /auth/set-password...')
      window.location.replace('/auth/set-password' + hash)
    }
  }, [])

  return null
}
