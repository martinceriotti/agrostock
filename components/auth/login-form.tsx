'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export function LoginForm() {
  const [view, setView] = useState<'login' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Credenciales inválidas. Verificá tu email y contraseña.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/set-password`,
    })
    setLoading(false)
    if (error) {
      toast.error('No se pudo enviar el email. Intentá de nuevo.')
      return
    }
    setResetSent(true)
  }

  if (view === 'forgot') {
    return (
      <div className="space-y-4">
        {resetSent ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-600">
              Si existe una cuenta con ese email, vas a recibir un link para restablecer tu contraseña.
            </p>
            <Button
              variant="outline"
              className="w-full h-11"
              onClick={() => { setView('login'); setResetSent(false); setEmail('') }}
            >
              Volver al inicio de sesión
            </Button>
          </div>
        ) : (
          <form onSubmit={handleForgot} className="space-y-4">
            <div>
              <p className="text-sm text-gray-500 mb-4">
                Ingresá tu email y te enviamos un link para restablecer tu contraseña.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="h-11"
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11 bg-green-700 hover:bg-green-800" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar link'}
            </Button>
            <button
              type="button"
              onClick={() => setView('login')}
              className="w-full text-center text-xs text-gray-500 hover:text-gray-700"
            >
              ← Volver al inicio de sesión
            </button>
          </form>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="usuario@empresa.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="h-11"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Contraseña</Label>
          <button
            type="button"
            onClick={() => setView('forgot')}
            className="text-xs text-green-700 hover:text-green-800"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="h-11"
        />
      </div>

      <Button type="submit" className="w-full h-11 bg-green-700 hover:bg-green-800" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Ingresando...
          </>
        ) : (
          'Ingresar'
        )}
      </Button>

      <p className="text-center text-xs text-gray-500 mt-2">
        ¿No tenés cuenta? Pedile al administrador que te invite.
      </p>
    </form>
  )
}
