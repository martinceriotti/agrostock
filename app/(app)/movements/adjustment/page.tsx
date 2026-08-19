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
import { useCurrentStock, useActiveLots, useAdjustStock } from '@/lib/hooks/use-stock'
import { useWarehouses } from '@/lib/hooks/use-products'
import { useUser } from '@/lib/hooks/use-user'
import { ClipboardCheck, Loader2 } from 'lucide-react'

const REASON_CATEGORIES: { value: string; label: string }[] = [
  { value: 'recount', label: 'Recuento físico' },
  { value: 'breakage', label: 'Rotura/derrame' },
  { value: 'theft_loss', label: 'Robo o pérdida' },
  { value: 'expiry', label: 'Vencimiento' },
  { value: 'data_correction', label: 'Corrección de carga' },
  { value: 'other', label: 'Otro' },
]

const NO_LOT = '__no_lot__'

const adjustmentSchema = z.object({
  product_id:        z.string().min(1, 'Seleccioná un producto'),
  warehouse_id:      z.string().min(1, 'Seleccioná el depósito'),
  lot_id:            z.string().min(1),
  counted_quantity:  z.number().min(0, 'La cantidad no puede ser negativa'),
  reason_category:   z.enum(['recount', 'breakage', 'theft_loss', 'expiry', 'data_correction', 'other']),
  reason_detail:     z.string().min(3, 'Contá brevemente el motivo'),
})
type AdjustmentData = z.infer<typeof adjustmentSchema>

export default function AdjustmentPage() {
  const router = useRouter()
  const { data: user } = useUser()
  const { data: stockData = [] } = useCurrentStock()
  const { data: allWarehouses = [] } = useWarehouses()
  const adjust = useAdjustStock()

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null)

  const form = useForm<AdjustmentData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      product_id: '', warehouse_id: '', lot_id: NO_LOT,
      counted_quantity: undefined, reason_category: undefined, reason_detail: '',
    },
  })

  const { data: activeLots = [] } = useActiveLots(selectedProduct, selectedWarehouse)

  // Productos únicos que tienen stock en algún depósito
  const products = useMemo(() => {
    const map = new Map<string, { id: string; name: string; brand: string | null; unit: string }>()
    stockData.forEach(e => {
      const p = e.products as { id: string; name: string; brand: string | null; unit: string } | null
      if (p && !map.has(p.id)) map.set(p.id, p)
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [stockData])

  const warehouses = useMemo(
    () => [...allWarehouses].sort((a, b) => a.name.localeCompare(b.name)),
    [allWarehouses]
  )

  const selectedUnit = useMemo(() => {
    const p = products.find(p => p.id === selectedProduct)
    return p?.unit ?? ''
  }, [products, selectedProduct])

  const selectedLotId = form.watch('lot_id')

  // Stock actual de la combinación elegida (por lote, o producto+depósito si no hay lote)
  const currentQuantity = useMemo(() => {
    if (!selectedProduct || !selectedWarehouse) return null
    if (selectedLotId && selectedLotId !== NO_LOT) {
      const lot = activeLots.find(l => l.lot_id === selectedLotId)
      return lot?.quantity ?? 0
    }
    const entry = stockData.find(e => e.product_id === selectedProduct && e.warehouse_id === selectedWarehouse)
    return entry?.quantity ?? 0
  }, [stockData, activeLots, selectedProduct, selectedWarehouse, selectedLotId])

  const countedQuantity = form.watch('counted_quantity')
  const delta = useMemo(() => {
    if (currentQuantity === null || countedQuantity === undefined || Number.isNaN(countedQuantity)) return null
    return countedQuantity - currentQuantity
  }, [currentQuantity, countedQuantity])

  async function onSubmit(data: AdjustmentData) {
    if (!user?.id || !user?.organization_id) return
    if (currentQuantity === null) return
    const finalDelta = data.counted_quantity - currentQuantity
    if (finalDelta === 0) {
      form.setError('counted_quantity', { message: 'La cantidad contada es igual al stock actual — no hay nada para ajustar' })
      return
    }
    await adjust.mutateAsync({
      productId: data.product_id,
      warehouseId: data.warehouse_id,
      lotId: data.lot_id === NO_LOT ? null : data.lot_id,
      delta: finalDelta,
      reasonCategory: data.reason_category,
      notes: data.reason_detail,
      userId: user.id,
      orgId: user.organization_id,
    })
    router.push('/movements')
  }

  if (user && user.role === 'engineer') {
    router.replace('/stock')
    return null
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Ajuste de Stock"
        description="Corregir el stock registrado contra un recuento físico real"
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
                  form.setValue('warehouse_id', '')
                  form.setValue('lot_id', NO_LOT)
                  setSelectedProduct(v ?? null)
                  setSelectedWarehouse(null)
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

            {/* Depósito */}
            <div className="space-y-1.5">
              <Label>Depósito *</Label>
              <Select
                value={form.watch('warehouse_id')}
                onValueChange={(v) => {
                  form.setValue('warehouse_id', v ?? '')
                  form.setValue('lot_id', NO_LOT)
                  setSelectedWarehouse(v ?? null)
                }}
                items={Object.fromEntries(warehouses.map(w => [w.id, w.name]))}
                disabled={!selectedProduct}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un depósito..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.warehouse_id && (
                <p className="text-xs text-red-500">{form.formState.errors.warehouse_id.message}</p>
              )}
            </div>

            {/* Lote (solo si hay lotes activos) */}
            {activeLots.length > 0 && (
              <div className="space-y-1.5">
                <Label>Lote</Label>
                <Select
                  value={selectedLotId}
                  onValueChange={(v) => form.setValue('lot_id', v ?? NO_LOT)}
                  items={{
                    [NO_LOT]: 'Sin lote específico — ajuste general',
                    ...Object.fromEntries(activeLots.map(l => [l.lot_id, `${l.lote} (${l.quantity} ${selectedUnit})`])),
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin lote específico..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LOT}>Sin lote específico — ajuste general</SelectItem>
                    {activeLots.map(l => (
                      <SelectItem key={l.lot_id} value={l.lot_id}>
                        {l.lote}
                        <span className="ml-1 text-gray-400 text-xs">
                          ({l.quantity} {selectedUnit}{l.fecha_vencimiento ? ` · vence ${l.fecha_vencimiento}` : ''})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cantidad real contada */}
            <div className="space-y-1.5">
              <Label>
                Cantidad real contada *
                {currentQuantity !== null && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    Stock actual: {currentQuantity} {selectedUnit}
                  </span>
                )}
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="any"
                  min={0}
                  placeholder="0"
                  disabled={!selectedWarehouse}
                  {...form.register('counted_quantity', { valueAsNumber: true })}
                />
                {selectedUnit && (
                  <span className="text-sm text-gray-500 shrink-0">{selectedUnit}</span>
                )}
              </div>
              {form.formState.errors.counted_quantity && (
                <p className="text-xs text-red-500">{form.formState.errors.counted_quantity.message}</p>
              )}
              {delta !== null && delta !== 0 && (
                <p className={delta > 0 ? 'text-xs text-green-600' : 'text-xs text-red-500'}>
                  Se registrará un ajuste de {delta > 0 ? '+' : ''}{delta} {selectedUnit}
                </p>
              )}
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
              <Label>Motivo *</Label>
              <Select
                value={form.watch('reason_category')}
                onValueChange={(v) => form.setValue('reason_category', v as AdjustmentData['reason_category'])}
                items={Object.fromEntries(REASON_CATEGORIES.map(r => [r.value, r.label]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {REASON_CATEGORIES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.reason_category && (
                <p className="text-xs text-red-500">{form.formState.errors.reason_category.message}</p>
              )}
            </div>

            {/* Detalle del motivo */}
            <div className="space-y-1.5">
              <Label>Detalle *</Label>
              <Input placeholder="Ej.: bidón roto en descarga del 12/08" {...form.register('reason_detail')} />
              {form.formState.errors.reason_detail && (
                <p className="text-xs text-red-500">{form.formState.errors.reason_detail.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={adjust.isPending}
                className="bg-green-700 hover:bg-green-800 gap-2"
              >
                {adjust.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ClipboardCheck className="h-4 w-4" />}
                Confirmar ajuste
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
