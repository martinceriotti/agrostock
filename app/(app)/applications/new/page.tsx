'use client'

import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fieldApplicationSchema, type FieldApplicationFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProducts, useWarehouses } from '@/lib/hooks/use-products'
import { useCurrentStock } from '@/lib/hooks/use-stock'
import { useCreateApplication } from '@/lib/hooks/use-applications'
import { useUser } from '@/lib/hooks/use-user'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, Trash2, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default function NewApplicationPage() {
  const router = useRouter()
  const { data: user } = useUser()
  const { data: products = [] } = useProducts()
  const { data: warehouses = [] } = useWarehouses()
  const { data: stockData = [] } = useCurrentStock()
  const createApplication = useCreateApplication()

  const form = useForm<FieldApplicationFormData>({
    resolver: zodResolver(fieldApplicationSchema),
    defaultValues: {
      field_name: '',
      application_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      items: [{ product_id: '', warehouse_id: '', quantity_used: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })

  function getAvailableStock(productId: string, warehouseId: string) {
    if (!productId || !warehouseId) return null
    const entry = stockData.find(
      (s) => s.product_id === productId && s.warehouse_id === warehouseId
    )
    return entry?.quantity ?? 0
  }

  async function onSubmit(data: FieldApplicationFormData) {
    if (!user) return

    for (const item of data.items) {
      const available = getAvailableStock(item.product_id, item.warehouse_id)
      if (available !== null && item.quantity_used > available) {
        const product = products.find(p => p.id === item.product_id)
        form.setError('root', {
          message: `Stock insuficiente de ${product?.name}. Disponible: ${available} ${product?.unit}`
        })
        return
      }
    }

    await createApplication.mutateAsync({ values: data, userId: user.id })
    router.push('/applications')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/applications" className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2 mb-2 -ml-2')}>
          <ArrowLeft className="h-4 w-4" />Volver
        </Link>
        <PageHeader title="Nueva Aplicación en Campo" />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del lote</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="field_name">Nombre del lote / campo *</Label>
              <Input id="field_name" {...form.register('field_name')} placeholder="Ej: Lote Norte, Campo La Esperanza" />
              {form.formState.errors.field_name && (
                <p className="text-xs text-red-500">{form.formState.errors.field_name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="application_date">Fecha de aplicación *</Label>
              <Input id="application_date" type="date" {...form.register('application_date')} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" {...form.register('notes')} rows={2} placeholder="Observaciones, dosis, condiciones climáticas..." />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Productos utilizados</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => append({ product_id: '', warehouse_id: '', quantity_used: 0 })}
            >
              <Plus className="h-4 w-4" />
              Agregar producto
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.formState.errors.root && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {form.formState.errors.root.message}
              </div>
            )}

            {fields.map((field, index) => {
              const productId = form.watch(`items.${index}.product_id`)
              const warehouseId = form.watch(`items.${index}.warehouse_id`)
              const availableStock = getAvailableStock(productId, warehouseId)
              const selectedProduct = products.find(p => p.id === productId)

              return (
                <div key={field.id} className="p-3 bg-gray-50 rounded-lg border space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Producto</Label>
                      <Select
                        value={form.watch(`items.${index}.product_id`)}
                        onValueChange={(v) => form.setValue(`items.${index}.product_id`, v ?? '')}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}{p.brand ? ` — ${p.brand}` : ''} ({p.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Depósito origen</Label>
                      <Select
                        value={form.watch(`items.${index}.warehouse_id`)}
                        onValueChange={(v) => form.setValue(`items.${index}.warehouse_id`, v ?? '')}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Seleccionar depósito" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">
                        Cantidad utilizada {selectedProduct ? `(${selectedProduct.unit})` : ''}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="bg-white"
                        {...form.register(`items.${index}.quantity_used`, { valueAsNumber: true })}
                      />
                      {availableStock !== null && (
                        <p className={`text-xs ${availableStock === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                          Disponible en depósito: {availableStock} {selectedProduct?.unit}
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}

            {form.formState.errors.items?.root && (
              <p className="text-sm text-red-500">{form.formState.errors.items.root.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/applications" className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancelar
          </Link>
          <Button type="submit" disabled={createApplication.isPending} className="bg-green-700 hover:bg-green-800">
            {createApplication.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            ) : 'Registrar aplicación'}
          </Button>
        </div>
      </form>
    </div>
  )
}
