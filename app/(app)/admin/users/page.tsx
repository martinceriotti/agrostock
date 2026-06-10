'use client'

import { useState, useTransition } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { getOrgUsers, inviteUser, updateUserRole, updateUserName, deleteUser, sendPasswordReset, setUserPassword } from '@/app/actions/admin'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Loader2, UserCheck, Mail, KeyRound } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

type OrgUser = { id: string; full_name: string; email: string; role: string; created_at: string }

const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', engineer: 'Ingeniero' }
const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  manager: 'bg-blue-100 text-blue-700',
  engineer: 'bg-green-100 text-green-700',
}

const inviteSchema = z.object({
  full_name: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'manager', 'engineer']),
})
type InviteData = z.infer<typeof inviteSchema>

export default function AdminUsersPage() {
  const qc = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [showInvite, setShowInvite] = useState(false)
  const [editUser, setEditUser] = useState<OrgUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'manager' | 'engineer'>('engineer')
  const [passwordUser, setPasswordUser] = useState<OrgUser | null>(null)
  const [tempPassword, setTempPassword] = useState('')

  const { data: result, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => getOrgUsers(),
  })

  const users = result?.success ? result.data ?? [] : []
  const queryError = result && !result.success ? result.error : null

  const form = useForm<InviteData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { full_name: '', email: '', role: 'engineer' },
  })

  function openEdit(user: OrgUser) {
    setEditUser(user)
    setEditName(user.full_name)
    setEditRole(user.role as 'admin' | 'manager' | 'engineer')
  }

  function handleInvite(data: InviteData) {
    startTransition(async () => {
      const result = await inviteUser(data)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(`Invitación enviada a ${data.email}`)
      form.reset()
      setShowInvite(false)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    })
  }

  function handleSaveEdit() {
    if (!editUser) return
    startTransition(async () => {
      const r1 = await updateUserName(editUser.id, editName)
      if (!r1.success) { toast.error(r1.error); return }
      const r2 = await updateUserRole(editUser.id, editRole)
      if (!r2.success) { toast.error(r2.error); return }
      toast.success('Usuario actualizado')
      setEditUser(null)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    })
  }

  function handleDelete(user: OrgUser) {
    if (!confirm(`¿Eliminar al usuario ${user.full_name}? Esta acción no se puede deshacer.`)) return
    startTransition(async () => {
      const result = await deleteUser(user.id)
      if (!result.success) { toast.error(result.error); return }
      toast.success(`Usuario ${user.full_name} eliminado`)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    })
  }

  function handlePasswordReset(user: OrgUser) {
    startTransition(async () => {
      const result = await sendPasswordReset(user.email)
      if (!result.success) { toast.error(result.error); return }
      toast.success(`Email de restablecimiento enviado a ${user.email}`)
      setPasswordUser(null)
    })
  }

  function handleSetTempPassword() {
    if (!passwordUser) return
    if (tempPassword.length < 8) { toast.error('Mínimo 8 caracteres'); return }
    startTransition(async () => {
      const result = await setUserPassword(passwordUser.id, tempPassword)
      if (!result.success) { toast.error(result.error); return }
      toast.success(`Contraseña actualizada para ${passwordUser.full_name}`)
      setPasswordUser(null)
      setTempPassword('')
    })
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Gestión de Usuarios"
        description="Administrá los accesos de tu equipo"
        action={
          <Button onClick={() => setShowInvite(true)} className="bg-green-700 hover:bg-green-800 gap-2">
            <Plus className="h-4 w-4" />
            Nuevo usuario
          </Button>
        }
      />

      {queryError && (
        <Card className="mb-4 border-amber-200 bg-amber-50">
          <CardContent className="pt-4 text-sm text-amber-800">
            <strong>Atención:</strong> {queryError}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <Card key={user.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="py-3 px-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-green-700">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{user.full_name}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span className="truncate">{user.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Badge className={`text-xs ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] ?? user.role}
                  </Badge>
                  <span className="text-xs text-gray-400 hidden sm:block">
                    {format(new Date(user.created_at), 'dd MMM yyyy', { locale: es })}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => { setPasswordUser(user); setTempPassword('') }}
                      title="Gestionar contraseña"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(user)}
                      disabled={isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              No hay usuarios en la organización
            </div>
          )}
        </div>
      )}

      {/* Dialog: Nuevo usuario */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invitar nuevo usuario</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            El usuario recibirá un email para configurar su contraseña.
          </p>
          <form onSubmit={form.handleSubmit(handleInvite)} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nombre completo *</Label>
              <Input {...form.register('full_name')} placeholder="Juan Pérez" autoFocus />
              {form.formState.errors.full_name && (
                <p className="text-xs text-red-500">{form.formState.errors.full_name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input type="email" {...form.register('email')} placeholder="juan@empresa.com" />
              {form.formState.errors.email && (
                <p className="text-xs text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Rol *</Label>
              <Select
                value={form.watch('role')}
                onValueChange={(v) => form.setValue('role', v as InviteData['role'])}
                items={{ engineer: 'Ingeniero — solo consulta', manager: 'Manager — compras y aplicaciones', admin: 'Admin — acceso total' }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineer">Ingeniero — solo consulta</SelectItem>
                  <SelectItem value="manager">Manager — compras y aplicaciones</SelectItem>
                  <SelectItem value="admin">Admin — acceso total</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending} className="bg-green-700 hover:bg-green-800 gap-2">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                Enviar invitación
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Gestionar contraseña */}
      <Dialog open={!!passwordUser} onOpenChange={(open) => { if (!open) { setPasswordUser(null); setTempPassword('') } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Contraseña — {passwordUser?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Opción 1: email de reset */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Enviá un email para que el usuario configure su propia contraseña.
              </p>
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={isPending}
                onClick={() => passwordUser && handlePasswordReset(passwordUser)}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Enviar email de restablecimiento
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 border-t" />
              <span className="text-xs text-gray-400">o</span>
              <div className="flex-1 border-t" />
            </div>

            {/* Opción 2: contraseña temporal */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Seteá una contraseña temporal para que pueda ingresar ahora.
              </p>
              <Input
                type="text"
                placeholder="Contraseña temporal (mín. 8 caracteres)"
                value={tempPassword}
                onChange={e => setTempPassword(e.target.value)}
              />
              <Button
                className="w-full bg-green-700 hover:bg-green-800 gap-2"
                disabled={isPending || tempPassword.length < 8}
                onClick={handleSetTempPassword}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                Setear contraseña temporal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Editar usuario */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar usuario</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select
                value={editRole}
                onValueChange={(v) => setEditRole(v as typeof editRole)}
                items={{ engineer: 'Ingeniero', manager: 'Manager', admin: 'Admin' }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineer">Ingeniero</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={isPending} className="bg-green-700 hover:bg-green-800">
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
