'use client'

import { useState, useTransition } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DataTable } from '@/components/ui/data-table'
import {
  useCategories, useCreateCategory,
  useSuppliers, useCreateSupplier, useUpdateSupplier,
} from '@/lib/hooks/use-products'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { productCategorySchema, supplierSchema, type ProductCategoryFormData, type SupplierFormData } from '@/lib/validations'
import { Plus, Loader2, Pencil, Trash2, UserCheck, Mail, KeyRound, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Supplier } from '@/lib/types/database.types'
import { getOrgUsers, inviteUser, updateUserRole, updateUserName, deleteUser, sendPasswordReset } from '@/app/actions/admin'
import { resetOrganizationData, type ResetMode } from '@/app/actions/reset'

// ─── Users tab ──────────────────────────────────────────────────────

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

function UsersTab() {
  const qc = useQueryClient()
  const [isPending, startTransition] = useTransition()
  const [showInvite, setShowInvite] = useState(false)
  const [editUser, setEditUser] = useState<OrgUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'manager' | 'engineer'>('engineer')

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
      const res = await inviteUser(data)
      if (!res.success) { toast.error(res.error); return }
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
      const res = await deleteUser(user.id)
      if (!res.success) { toast.error(res.error); return }
      toast.success(`Usuario ${user.full_name} eliminado`)
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    })
  }

  function handlePasswordReset(user: OrgUser) {
    if (!confirm(`¿Enviar email de restablecimiento de contraseña a ${user.email}?`)) return
    startTransition(async () => {
      const res = await sendPasswordReset(user.email)
      if (!res.success) { toast.error(res.error); return }
      toast.success(`Email de restablecimiento enviado a ${user.email}`)
    })
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowInvite(true)} className="bg-green-700 hover:bg-green-800 gap-2">
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {queryError && (
        <Card className="border-amber-200 bg-amber-50">
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
                      variant="ghost" size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => handlePasswordReset(user)}
                      disabled={isPending}
                      title="Restablecer contraseña"
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(user)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon"
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
            <div className="text-center py-12 text-gray-400">No hay usuarios en la organización</div>
          )}
        </div>
      )}

      {/* Dialog: Nuevo usuario */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Invitar nuevo usuario</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">El usuario recibirá un email para configurar su contraseña.</p>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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

// ─── Categories tab ─────────────────────────────────────────────────

function CategoriesTab() {
  const { data: categories = [], isLoading } = useCategories()
  const createCategory = useCreateCategory()
  const [showForm, setShowForm] = useState(false)
  const supabase = createClient()

  const form = useForm<ProductCategoryFormData>({
    resolver: zodResolver(productCategorySchema),
    defaultValues: { name: '', type: 'agroquimico' },
  })

  async function onSubmit(data: ProductCategoryFormData) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
    if (!profile?.organization_id) return
    await createCategory.mutateAsync({ values: data, orgId: profile.organization_id })
    form.reset()
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)} className="bg-green-700 hover:bg-green-800 gap-2">
          <Plus className="h-4 w-4" />
          Nueva categoría
        </Button>
      </div>

      <DataTable
        data={categories}
        isLoading={isLoading}
        emptyMessage="No hay categorías"
        columns={[
          { key: 'name', header: 'Nombre', cell: (row) => <span className="font-medium">{row.name}</span> },
          {
            key: 'type',
            header: 'Tipo',
            cell: (row) => (
              <Badge variant={row.type === 'semilla' ? 'secondary' : 'outline'}>
                {row.type === 'semilla' ? 'Semilla' : 'Agroquímico'}
              </Badge>
            ),
          },
        ]}
      />

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nueva categoría</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input {...form.register('name')} placeholder="Ej: Herbicida selectivo" />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.watch('type')} onValueChange={(v) => form.setValue('type', v as 'agroquimico' | 'semilla')} items={{ agroquimico: 'Agroquímico', semilla: 'Semilla' }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="agroquimico">Agroquímico</SelectItem>
                  <SelectItem value="semilla">Semilla</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createCategory.isPending} className="bg-green-700 hover:bg-green-800">
                {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Suppliers tab ───────────────────────────────────────────────────

function SuppliersTab() {
  const { data: suppliers = [], isLoading } = useSuppliers()
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const [dialog, setDialog] = useState<{ type: 'create' | 'edit'; supplier?: Supplier } | null>(null)

  const form = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: '', contact: '', email: '', phone: '' },
  })

  function openDialog(type: 'create' | 'edit', supplier?: Supplier) {
    form.reset({
      name: supplier?.name ?? '',
      contact: supplier?.contact ?? '',
      email: supplier?.email ?? '',
      phone: supplier?.phone ?? '',
    })
    setDialog({ type, supplier })
  }

  async function onSubmit(data: SupplierFormData) {
    if (dialog?.type === 'edit' && dialog.supplier) {
      await updateSupplier.mutateAsync({ id: dialog.supplier.id, values: data })
    } else {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single()
      if (!profile?.organization_id) return
      await createSupplier.mutateAsync({ values: data, orgId: profile.organization_id })
    }
    setDialog(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openDialog('create')} className="bg-green-700 hover:bg-green-800 gap-2">
          <Plus className="h-4 w-4" />
          Nuevo proveedor
        </Button>
      </div>

      <DataTable
        data={suppliers}
        isLoading={isLoading}
        emptyMessage="No hay proveedores"
        columns={[
          { key: 'name', header: 'Nombre', cell: (row) => <span className="font-medium">{row.name}</span> },
          { key: 'contact', header: 'Contacto', cell: (row) => <span className="text-sm">{row.contact ?? '—'}</span> },
          { key: 'email', header: 'Email', cell: (row) => <span className="text-sm text-gray-500">{row.email ?? '—'}</span> },
          { key: 'phone', header: 'Teléfono', cell: (row) => <span className="text-sm">{row.phone ?? '—'}</span> },
          {
            key: 'actions',
            header: '',
            className: 'w-16',
            cell: (row) => (
              <Button variant="ghost" size="sm" onClick={() => openDialog('edit', row)}>
                Editar
              </Button>
            ),
          },
        ]}
      />

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog?.type === 'edit' ? 'Editar proveedor' : 'Nuevo proveedor'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input {...form.register('name')} />
              {form.formState.errors.name && <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Contacto</Label>
              <Input {...form.register('contact')} placeholder="Nombre del vendedor" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" {...form.register('email')} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input {...form.register('phone')} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialog(null)}>Cancelar</Button>
              <Button type="submit" disabled={createSupplier.isPending || updateSupplier.isPending} className="bg-green-700 hover:bg-green-800">
                {(createSupplier.isPending || updateSupplier.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Advanced tab ────────────────────────────────────────────────────

const RESET_MODES: { value: ResetMode; label: string; deletes: string; keeps: string }[] = [
  {
    value: 'transactions',
    label: 'Solo transacciones',
    deletes: 'Órdenes de compra, aplicaciones en campo, movimientos de stock, lecturas y alertas de silos IoT, actividad.',
    keeps: 'Silos, sensores, umbrales de alerta, productos, depósitos, categorías, proveedores, usuarios y organización.',
  },
  {
    value: 'full',
    label: 'Reseteo completo',
    deletes: 'Todo lo anterior más silos, sensores, productos, depósitos, categorías y proveedores.',
    keeps: 'Únicamente usuarios y organización.',
  },
]

function AdvancedTab() {
  const [mode, setMode] = useState<ResetMode>('transactions')
  const [phrase, setPhrase] = useState('')
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const confirmed = phrase === 'BORRAR TODO'

  function handleReset() {
    if (!confirmed) return
    startTransition(async () => {
      setResult(null)
      const res = await resetOrganizationData(mode, phrase)
      if (res.success) {
        const total = Object.values(res.counts).reduce((s, n) => s + n, 0)
        setResult({ ok: true, msg: `${total} registros eliminados correctamente.` })
        setPhrase('')
      } else {
        setResult({ ok: false, msg: res.error })
      }
    })
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Zona de peligro */}
      <div className="rounded-xl border-2 border-red-200 bg-red-50">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-red-200">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">Zona de peligro</p>
            <p className="text-sm text-red-600">Estas acciones son permanentes e irreversibles.</p>
          </div>
        </div>

        <div className="px-5 py-5 space-y-5">
          {/* Selector de modo */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700">¿Qué querés borrar?</p>
            {RESET_MODES.map(m => (
              <label
                key={m.value}
                className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  mode === m.value
                    ? 'border-red-400 bg-white'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="reset-mode"
                  value={m.value}
                  checked={mode === m.value}
                  onChange={() => setMode(m.value)}
                  className="mt-0.5 accent-red-600"
                />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{m.label}</p>
                  <p className="text-xs text-red-700"><span className="font-medium">Borra:</span> {m.deletes}</p>
                  <p className="text-xs text-gray-500"><span className="font-medium">Conserva:</span> {m.keeps}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Confirmación */}
          <div className="space-y-2 pt-2 border-t border-red-200">
            <p className="text-sm text-gray-700">
              Para confirmar, escribí exactamente: <span className="font-mono font-bold text-red-700">BORRAR TODO</span>
            </p>
            <input
              type="text"
              value={phrase}
              onChange={e => { setPhrase(e.target.value); setResult(null) }}
              placeholder="BORRAR TODO"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>

          {/* Resultado */}
          {result && (
            <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${
              result.ok
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {result.ok
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : <AlertTriangle className="h-4 w-4 shrink-0" />}
              {result.msg}
            </div>
          )}

          {/* Botón */}
          <button
            onClick={handleReset}
            disabled={!confirmed || isPending}
            className="flex items-center gap-2 rounded-md bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors
              hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Trash2 className="h-4 w-4" />}
            {isPending ? 'Borrando...' : 'Confirmar y borrar datos'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Configuración"
        description="Usuarios, categorías y proveedores"
      />
      <Tabs defaultValue="users">
        <TabsList className="mb-4">
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
          <TabsTrigger value="suppliers">Proveedores</TabsTrigger>
          <TabsTrigger value="advanced" className="text-red-600 data-[selected]:text-red-700">
            Avanzado
          </TabsTrigger>
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
        <TabsContent value="advanced"><AdvancedTab /></TabsContent>
      </Tabs>
    </div>
  )
}
