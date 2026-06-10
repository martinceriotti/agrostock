import { LoginForm } from '@/components/auth/login-form'
import { AuthHashHandler } from '@/components/auth/auth-hash-handler'
import { Leaf } from 'lucide-react'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-950 to-green-800 px-4">
      <AuthHashHandler />
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
            <Leaf className="h-8 w-8 text-green-300" />
          </div>
          <h1 className="text-2xl font-bold text-white">AgroStock</h1>
          <p className="text-green-300 text-sm mt-1">Gestión de insumos agropecuarios</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Iniciar sesión</h2>
          <LoginForm />
        </div>
      </div>
    </div>
  )
}
