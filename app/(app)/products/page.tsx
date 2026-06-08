'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ProductForm } from '@/components/products/product-form'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, type ProductWithCategory } from '@/lib/hooks/use-products'
import { Plus, MoreHorizontal, Pencil, Trash2, AlertTriangle } from 'lucide-react'
import { useUser } from '@/lib/hooks/use-user'
import type { ProductFormData } from '@/lib/validations'
import { cn } from '@/lib/utils'

export default function ProductsPage() {
  const { data: user } = useUser()
  const { data: products = [], isLoading } = useProducts()
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const [dialog, setDialog] = useState<{ type: 'create' | 'edit'; product?: ProductWithCategory } | null>(null)
  const canEdit = user?.role === 'admin' || user?.role === 'manager'

  async function handleSubmit(data: ProductFormData) {
    if (dialog?.type === 'edit' && dialog.product) {
      await updateProduct.mutateAsync({ id: dialog.product.id, values: data })
    } else {
      await createProduct.mutateAsync(data)
    }
    setDialog(null)
  }

  return (
    <div>
      <PageHeader
        title="Productos"
        description="Catálogo de agroquímicos y semillas"
        action={
          canEdit ? (
            <Button onClick={() => setDialog({ type: 'create' })} className="bg-green-700 hover:bg-green-800 gap-2">
              <Plus className="h-4 w-4" />
              Nuevo producto
            </Button>
          ) : undefined
        }
      />

      <DataTable
        data={products}
        isLoading={isLoading}
        emptyMessage="No hay productos registrados"
        columns={[
          {
            key: 'name',
            header: 'Producto',
            cell: (row) => (
              <div>
                <p className="font-medium text-gray-900">{row.name}</p>
                {row.brand && <p className="text-xs text-gray-500">{row.brand}</p>}
              </div>
            ),
          },
          {
            key: 'category',
            header: 'Categoría',
            cell: (row) => row.product_categories ? (
              <Badge variant={row.product_categories.type === 'semilla' ? 'secondary' : 'outline'}>
                {row.product_categories.name}
              </Badge>
            ) : '-',
          },
          {
            key: 'unit',
            header: 'Unidad',
            cell: (row) => <span className="text-sm">{row.unit}</span>,
          },
          {
            key: 'min_stock',
            header: 'Alerta mínimo',
            cell: (row) => row.min_stock_alert != null ? (
              <div className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span className="text-sm">{row.min_stock_alert} {row.unit}</span>
              </div>
            ) : <span className="text-gray-400 text-sm">-</span>,
          },
          ...(canEdit ? [{
            key: 'actions',
            header: '',
            className: 'w-10',
            cell: (row: ProductWithCategory) => (
              <DropdownMenu>
                <DropdownMenuTrigger className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-8 w-8')}>
                  <MoreHorizontal className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setDialog({ type: 'edit', product: row })}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => {
                      if (confirm('¿Eliminar este producto?')) deleteProduct.mutate(row.id)
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          }] : []),
        ]}
      />

      <Dialog open={!!dialog} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialog?.type === 'edit' ? 'Editar producto' : 'Nuevo producto'}
            </DialogTitle>
          </DialogHeader>
          {dialog && (
            <ProductForm
              defaultValues={dialog.product}
              onSubmit={handleSubmit}
              onCancel={() => setDialog(null)}
              isLoading={createProduct.isPending || updateProduct.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
