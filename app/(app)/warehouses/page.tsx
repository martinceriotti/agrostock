'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useWarehouses, useCreateWarehouse, useUpdateWarehouse } from '@/lib/hooks/use-products'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { warehouseSchema, type WarehouseFormData } from '@/lib/validations'
import { Plus, MoreHorizontal, Pencil, Loader2, MapPin } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import type { Warehouse } from '@/lib/types/database.types'

function WarehouseForm({
  defaultValues,
  onSubmit,
  onCancel,
  isLoading,
}: {
  defaultValues?: Partial<Warehouse>
  onSubmit: (data: WarehouseFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}) {
  const form = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      location: defaultValues?.location ?? '',
      description: defaultValues?.description ?? '',
    },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Nombre *</Label>
        <Input id="name" {...form.register('name')} placeholder="Ej: Depósito Principal" />
        {form.formState.errors.name && (
          <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="location">Ubicación</Label>
        <Input id="location" {...form.register('location')} placeholder="Ej: Campo Norte, Ruta 8 km 200" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" {...form.register('description')} rows={2} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={isLoading} className="bg-green-700 hover:bg-green-800">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}

export default function WarehousesPage() {
  const { data: user } = useUser()
  const { data: warehouses = [], isLoading } = useWarehouses()
  const createWarehouse = useCreateWarehouse()
  const updateWarehouse = useUpdateWarehouse()
  const [dialog, setDialog] = useState<{ type: 'create' | 'edit'; warehouse?: Warehouse } | null>(null)
  const canEdit = user?.role === 'admin' || user?.role === 'manager'

  async function handleSubmit(data: WarehouseFormData) {
    if (dialog?.type === 'edit' && dialog.warehouse) {
      await updateWarehouse.mutateAsync({ id: dialog.warehouse.id, values: data })
    } else {
      await createWarehouse.mutateAsync(data)
    }
    setDialog(null)
  }

  return (
    <div>
      <PageHeader
        title="Depósitos"
        description="Gestión de warehouses y ubicaciones de almacenamiento"
        action={
          canEdit ? (
            <Button onClick={() => setDialog({ type: 'create' })} className="bg-green-700 hover:bg-green-800 gap-2">
              <Plus className="h-4 w-4" />
              Nuevo depósito
            </Button>
          ) : undefined
        }
      />

      <DataTable
        data={warehouses}
        isLoading={isLoading}
        emptyMessage="No hay depósitos registrados"
        columns={[
          {
            key: 'name',
            header: 'Depósito',
            cell: (row) => <p className="font-medium">{row.name}</p>,
          },
          {
            key: 'location',
            header: 'Ubicación',
            cell: (row) => row.location ? (
              <div className="flex items-center gap-1.5 text-gray-600">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="text-sm">{row.location}</span>
              </div>
            ) : <span className="text-gray-400 text-sm">-</span>,
          },
          {
            key: 'description',
            header: 'Descripción',
            cell: (row) => <span className="text-sm text-gray-500">{row.description ?? '-'}</span>,
          },
          ...(canEdit ? [{
            key: 'actions',
            header: '',
            className: 'w-10',
            cell: (row: Warehouse) => (
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDialog({ type: 'edit', warehouse: row })}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          }] : []),
        ]}
      />

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === 'edit' ? 'Editar depósito' : 'Nuevo depósito'}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <WarehouseForm
              defaultValues={dialog.warehouse}
              onSubmit={handleSubmit}
              onCancel={() => setDialog(null)}
              isLoading={createWarehouse.isPending || updateWarehouse.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
