'use client'

import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { purchaseOrderSchema, type PurchaseOrderFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { OrderItemRow } from '@/components/orders/order-item-row'
import { useProducts, useWarehouses, useSuppliers } from '@/lib/hooks/use-products'
import { useCreateOrder } from '@/lib/hooks/use-orders'
import { useUser } from '@/lib/hooks/use-user'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { format } from 'date-fns'

export default function NewOrderPage() {
  const router = useRouter()
  const { data: user } = useUser()

  if (user && user.role === 'engineer') {
    router.replace('/orders')
    return null
  }
  const { data: products = [] } = useProducts()
  const { data: warehouses = [] } = useWarehouses()
  const { data: suppliers = [] } = useSuppliers()
  const createOrder = useCreateOrder()

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplier_id: null,
      currency: 'ARS',
      exchange_rate: null,
      notes: '',
      ordered_at: format(new Date(), 'yyyy-MM-dd'),
      expected_at: null,
      items: [{ product_id: '', warehouse_id: '', quantity_ordered: 0, unit_price: null, currency: 'ARS' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
  const currency = form.watch('currency')

  async function onSubmit(data: PurchaseOrderFormData) {
    if (!user?.organization_id) return
    const values = { ...data, items: data.items.map(i => ({ ...i, currency: data.currency })) }
    const order = await createOrder.mutateAsync({ values, userId: user.id, orgId: user.organization_id }) as { id: string }
    router.push(`/orders/${order.id}`)
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/orders" className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2 mb-2 -ml-2')}>
          <ArrowLeft className="h-4 w-4" />Volver
        </Link>
        <PageHeader title="Nueva Orden de Compra" />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Datos generales */}
        <Card>
          <CardHeader><CardTitle className="text-base">Datos generales</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Proveedor</Label>
              <Select
                value={form.watch('supplier_id') ?? ''}
                onValueChange={(v) => form.setValue('supplier_id', v || null)}
                items={[{ value: '', label: 'Sin proveedor' }, ...suppliers.map(s => ({ value: s.id, label: s.name }))]}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sin proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin proveedor</SelectItem>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Moneda *</Label>
              <Select
                value={currency}
                onValueChange={(v) => form.setValue('currency', v as 'ARS' | 'USD')}
                items={{ ARS: 'Pesos (ARS)', USD: 'Dólares (USD)' }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ARS">Pesos (ARS)</SelectItem>
                  <SelectItem value="USD">Dólares (USD)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {currency === 'USD' && (
              <div className="space-y-1.5">
                <Label htmlFor="exchange_rate">Tipo de cambio (referencia)</Label>
                <Input
                  id="exchange_rate"
                  type="number"
                  step="0.01"
                  placeholder="Ej: 1200"
                  {...form.register('exchange_rate', { valueAsNumber: true })}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="ordered_at">Fecha de pedido *</Label>
              <Input id="ordered_at" type="date" {...form.register('ordered_at')} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="expected_at">Fecha estimada de entrega</Label>
              <Input id="expected_at" type="date" {...form.register('expected_at')} />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" {...form.register('notes')} rows={2} placeholder="Condiciones de pago, referencias, etc." />
            </div>
          </CardContent>
        </Card>

        {/* Ítems */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Productos a comprar</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => append({ product_id: '', warehouse_id: '', quantity_ordered: 0, unit_price: null, currency: currency })}
            >
              <Plus className="h-4 w-4" />
              Agregar ítem
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="hidden sm:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 px-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <span>Producto</span>
              <span>Depósito destino</span>
              <span>Cantidad</span>
              <span>Precio unit.</span>
              <span />
            </div>

            {fields.map((field, index) => (
              <OrderItemRow
                key={field.id}
                index={index}
                form={form}
                products={products}
                warehouses={warehouses}
                onRemove={() => remove(index)}
              />
            ))}

            {form.formState.errors.items?.root && (
              <p className="text-sm text-red-500">{form.formState.errors.items.root.message}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/orders" className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancelar
          </Link>
          <Button type="submit" disabled={createOrder.isPending} className="bg-green-700 hover:bg-green-800">
            {createOrder.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creando...</>
            ) : 'Crear orden'}
          </Button>
        </div>
      </form>
    </div>
  )
}
