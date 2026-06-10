'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Leaf, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function SetPasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function init() {
      const supabase = createClient()

      // Caso A: tokens en el hash (invite o recovery via implicit flow)
      const hash = window.location.hash
      if (hash.includes('access_token')) {
        const params = new URLSearchParams(hash.slice(1))
        const access_token = params.get('access_token')
        const refresh_token = params.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (!error) {
            window.history.replaceState({}, '', window.location.pathname)
            setReady(true)
            return
          }
        }
      }

      // Caso B: sesión ya activa (viene del callback PKCE tras reset password)
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setReady(true)
        return
      }

      router.replace('/login?error=El+link+expiró.+Pedí+uno+nuevo+al+administrador.')
    }

    init()
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres')
      return
    }
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
      return
    }
    toast.success('¡Contraseña configurada! Bienvenido a AgroStock.')
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 to-green-800 px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <Leaf className="h-8 w-8 text-green-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">AgroStock</h1>
          <p className="text-green-300 text-sm mt-1">Gestión de insumos agropecuarios</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {!ready ? (
            <div className="flex flex-col items-center gap-3 py-4 text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin text-green-700" />
              <p className="text-sm">Verificando enlace...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-1">Crear contraseña</h2>
              <p className="text-sm text-gray-500 mb-6">Elegí una contraseña para acceder a tu cuenta.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Nueva contraseña</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoFocus
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Confirmar contraseña</Label>
                  <Input
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repetí la contraseña"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-green-700 hover:bg-green-800 gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Guardar contraseña
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
