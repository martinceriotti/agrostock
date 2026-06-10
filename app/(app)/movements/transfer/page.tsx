'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrentStock, useTransferStock } from '@/lib/hooks/use-stock'
import { useWarehouses } from '@/lib/hooks/use-products'
import { useUser } from '@/lib/hooks/use-user'
import { ArrowRight, Loader2, PackageCheck } from 'lucide-react'

const transferSchema = z.object({
  product_id:        z.string().min(1, 'Seleccioná un producto'),
  from_warehouse_id: z.string().min(1, 'Seleccioná el depósito origen'),
  to_warehouse_id:   z.string().min(1, 'Seleccioná el depósito destino'),
  quantity:          z.number().positive('Ingresá una cantidad mayor a 0'),
  notes:             z.string().optional(),
})
type TransferData = z.infer<typeof transferSchema>

export default function TransferPage() {
  const router = useRouter()
  const { data: user } = useUser()

  if (user && user.role === 'engineer') {
    router.replace('/stock')
    return null
  }
  const { data: stockData = [] } = useCurrentStock()
  const { data: allWarehouses = [] } = useWarehouses()
  const transfer = useTransferStock()

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedFrom, setSelectedFrom] = useState<string | null>(null)

  const form = useForm<TransferData>({
    resolver: zodResolver(transferSchema),
    defaultValues: { product_id: '', from_warehouse_id: '', to_warehouse_id: '', quantity: undefined, notes: '' },
  })

  // Productos únicos que tienen stock
  const products = useMemo(() => {
    const map = new Map<string, { id: string; name: string; brand: string | null; unit: string }>()
    stockData.forEach(e => {
      const p = e.products as { id: string; name: string; brand: string | null; unit: string } | null
      if (p && !map.has(p.id)) map.set(p.id, p)
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [stockData])

  // Depósitos donde el producto seleccionado tiene stock > 0
  const sourceWarehouses = useMemo(() => {
    if (!selectedProduct) return []
    return stockData
      .filter(e => e.product_id === selectedProduct && e.quantity > 0)
      .map(e => {
        const w = e.warehouses as { id: string; name: string } | null
        return w ? { id: w.id, name: w.name, quantity: e.quantity } : null
      })
      .filter(Boolean) as { id: string; name: string; quantity: number }[]
  }, [stockData, selectedProduct])

  // Todos los depósitos excepto el origen seleccionado
  const destWarehouses = useMemo(() => {
    return allWarehouses
      .filter(w => w.id !== selectedFrom)
      .map(w => ({ id: w.id, name: w.name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [allWarehouses, selectedFrom])

  const availableQty = useMemo(() => {
    if (!selectedProduct || !selectedFrom) return null
    const entry = stockData.find(e => e.product_id === selectedProduct && e.warehouse_id === selectedFrom)
    return entry?.quantity ?? null
  }, [stockData, selectedProduct, selectedFrom])

  const selectedUnit = useMemo(() => {
    const p = products.find(p => p.id === selectedProduct)
    return p?.unit ?? ''
  }, [products, selectedProduct])

  async function onSubmit(data: TransferData) {
    if (!user?.id || !user?.organization_id) return
    if (data.from_warehouse_id === data.to_warehouse_id) {
      form.setError('to_warehouse_id', { message: 'El destino debe ser diferente al origen' })
      return
    }
    if (availableQty !== null && data.quantity > availableQty) {
      form.setError('quantity', { message: `Stock disponible: ${availableQty} ${selectedUnit}` })
      return
    }
    await transfer.mutateAsync({
      productId: data.product_id,
      fromWarehouseId: data.from_warehouse_id,
      toWarehouseId: data.to_warehouse_id,
      quantity: data.quantity,
      notes: data.notes || undefined,
      userId: user.id,
      orgId: user.organization_id,
    })
    router.push('/stock')
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Transferencia de Stock"
        description="Mover mercadería de un depósito a otro"
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Producto */}
            <div className="space-y-1.5">
              <Label>Producto *</Label>
              <Select
                value={form.watch('product_id')}
                onValueChange={(v) => {
                  form.setValue('product_id', v ?? '')
                  form.setValue('from_warehouse_id', '')
                  form.setValue('to_warehouse_id', '')
                  setSelectedProduct(v ?? null)
                  setSelectedFrom(null)
                }}
                items={Object.fromEntries(products.map(p => [p.id, `${p.name}${p.brand ? ` — ${p.brand}` : ''}`]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un producto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.brand ? ` — ${p.brand}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.product_id && (
                <p className="text-xs text-red-500">{form.formState.errors.product_id.message}</p>
              )}
            </div>

            {/* Origen → Destino */}
            <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
              <div className="space-y-1.5">
                <Label>Depósito origen *</Label>
                <Select
                  value={form.watch('from_warehouse_id')}
                  onValueChange={(v) => {
                    form.setValue('from_warehouse_id', v ?? '')
                    form.setValue('to_warehouse_id', '')
                    setSelectedFrom(v ?? null)
                  }}
                  items={Object.fromEntries(sourceWarehouses.map(w => [w.id, `${w.name} (${w.quantity} ${selectedUnit})`]))}
                  disabled={!selectedProduct}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Origen..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceWarehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>
                        {w.name}
                        <span className="ml-1 text-gray-400 text-xs">({w.quantity} {selectedUnit})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.from_warehouse_id && (
                  <p className="text-xs text-red-500">{form.formState.errors.from_warehouse_id.message}</p>
                )}
              </div>

              <div className="pt-7 text-gray-400">
                <ArrowRight className="h-5 w-5" />
              </div>

              <div className="space-y-1.5">
                <Label>Depósito destino *</Label>
                <Select
                  value={form.watch('to_warehouse_id')}
                  onValueChange={(v) => form.setValue('to_warehouse_id', v ?? '')}
                  items={Object.fromEntries(destWarehouses.map(w => [w.id, w.name]))}
                  disabled={!selectedFrom}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {destWarehouses.map(w => (
                      <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.to_warehouse_id && (
                  <p className="text-xs text-red-500">{form.formState.errors.to_warehouse_id.message}</p>
                )}
              </div>
            </div>

            {/* Cantidad */}
            <div className="space-y-1.5">
              <Label>
                Cantidad *
                {availableQty !== null && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    Disponible: {availableQty} {selectedUnit}
                  </span>
                )}
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="any"
                  min={0}
                  placeholder="0"
                  disabled={!selectedFrom}
                  {...form.register('quantity', { valueAsNumber: true })}
                />
                {selectedUnit && (
                  <span className="text-sm text-gray-500 shrink-0">{selectedUnit}</span>
                )}
              </div>
              {form.formState.errors.quantity && (
                <p className="text-xs text-red-500">{form.formState.errors.quantity.message}</p>
              )}
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label>Notas <span className="text-gray-400 font-normal">(opcional)</span></Label>
              <Input placeholder="Motivo de la transferencia..." {...form.register('notes')} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={transfer.isPending}
                className="bg-green-700 hover:bg-green-800 gap-2"
              >
                {transfer.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <PackageCheck className="h-4 w-4" />}
                Confirmar transferencia
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
