'use client'

import { useState } from 'react'
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
import { productCategorySchema, supplierSchema, type ProductCategoryFormData, type SupplierFormData } from '@/lib/validations'
import { Plus, Loader2, UserPlus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Supplier } from '@/lib/types/database.types'

// ─── Users tab ──────────────────────────────────────────────────────

function UsersTab() {
  const supabase = createClient()
  const qc = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'manager' | 'engineer'>('engineer')
  const [loading, setLoading] = useState(false)

  type ProfileRow = { id: string; full_name: string; role: 'admin' | 'manager' | 'engineer'; created_at: string }
  const { data: users = [], isLoading } = useQuery<ProfileRow[]>({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('*').order('full_name')
      return (data ?? []) as ProfileRow[]
    },
  })

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.admin.inviteUserByEmail(inviteEmail, {
        data: { full_name: inviteName, role: inviteRole },
      })
      if (error) throw error
      toast.success(`Invitación enviada a ${inviteEmail}`)
      setInviteEmail('')
      setInviteName('')
      qc.invalidateQueries({ queryKey: ['profiles'] })
    } catch {
      toast.error('Error al enviar la invitación. Verificá que usás la Service Role Key.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: 'admin' | 'manager' | 'engineer') {
    const { error } = await supabase.from('profiles').update({ role: newRole } as never).eq('id', userId)
    if (error) {
      toast.error('Error al cambiar el rol')
    } else {
      toast.success('Rol actualizado')
      qc.invalidateQueries({ queryKey: ['profiles'] })
    }
  }

  const ROLE_LABELS = { admin: 'Admin', manager: 'Manager', engineer: 'Ingeniero' }

  return (
    <div className="space-y-6">
      {/* Invitar usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invitar nuevo usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Nombre completo</Label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Juan Pérez" required />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="usuario@empresa.com" required />
            </div>
            <div className="space-y-1.5">
              <Label>Rol</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineer">Ingeniero (solo consulta)</SelectItem>
                  <SelectItem value="manager">Manager (compras + aplicaciones)</SelectItem>
                  <SelectItem value="admin">Admin (acceso total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-3 flex justify-end">
              <Button type="submit" disabled={loading} className="bg-green-700 hover:bg-green-800 gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Enviar invitación
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de usuarios */}
      <DataTable
        data={users}
        isLoading={isLoading}
        emptyMessage="No hay usuarios"
        columns={[
          {
            key: 'name',
            header: 'Usuario',
            cell: (row) => <p className="font-medium">{row.full_name}</p>,
          },
          {
            key: 'role',
            header: 'Rol',
            cell: (row) => (
              <Select
                value={row.role}
                onValueChange={(v) => handleRoleChange(row.id, v as 'admin' | 'manager' | 'engineer')}
              >
                <SelectTrigger className="w-36 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="engineer">Ingeniero</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            ),
          },
        ]}
      />
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
              <Select value={form.watch('type')} onValueChange={(v) => form.setValue('type', v as 'agroquimico' | 'semilla')}>
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
        </TabsList>
        <TabsContent value="users"><UsersTab /></TabsContent>
        <TabsContent value="categories"><CategoriesTab /></TabsContent>
        <TabsContent value="suppliers"><SuppliersTab /></TabsContent>
      </Tabs>
    </div>
  )
}
