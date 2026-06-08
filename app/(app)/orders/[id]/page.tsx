'use client'

import { useState, use } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useOrder, useReceiveOrder, useCancelOrder } from '@/lib/hooks/use-orders'
import { useUser } from '@/lib/hooks/use-user'
import { ArrowLeft, PackageCheck, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  partial: { label: 'Recepción parcial', variant: 'default' },
  received: { label: 'Completamente recibida', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: order, isLoading } = useOrder(id)
  const { data: user } = useUser()
  const receiveOrder = useReceiveOrder()
  const cancelOrder = useCancelOrder()

  const [receiveOpen, setReceiveOpen] = useState(false)
  const [quantities, setQuantities] = useState<Record<string, number>>({})

  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const items = (order?.purchase_order_items as unknown as Array<{
    id: string
    quantity_ordered: number
    quantity_received: number
    unit_price: number | null
    currency: string
    products: { id: string; name: string; unit: string } | null
    warehouses: { id: string; name: string } | null
  }>) ?? []

  function openReceiveDialog() {
    const initial: Record<string, number> = {}
    items.forEach(item => {
      initial[item.id] = item.quantity_ordered - item.quantity_received
    })
    setQuantities(initial)
    setReceiveOpen(true)
  }

  async function handleReceive() {
    if (!user || !order) return
    const itemsToReceive = items.map(item => ({
      id: item.id,
      quantity_received: quantities[item.id] ?? 0,
      product_id: item.products?.id ?? '',
      warehouse_id: item.warehouses?.id ?? '',
      unit_price: item.unit_price,
      currency: item.currency,
    }))
    await receiveOrder.mutateAsync({ orderId: order.id, items: itemsToReceive, userId: user.id, orgId: user.organization_id! })
    setReceiveOpen(false)
  }

  if (isLoading) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/3" /><div className="h-32 bg-gray-200 rounded" /></div>
  }

  if (!order) {
    return <div className="text-center py-12 text-gray-500">Orden no encontrada.</div>
  }

  const status = STATUS_LABELS[order.status]
  const supplier = order.suppliers as { name: string } | null
  const creator = order.profiles as { full_name: string } | null
  const total = items.reduce((sum, item) => sum + (item.unit_price ?? 0) * item.quantity_ordered, 0)

  return (
    <div className="max-w-3xl">
      <Link href="/orders" className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2 mb-4 -ml-2')}>
        <ArrowLeft className="h-4 w-4" />Volver a órdenes
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{order.order_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant="outline" className="font-mono">{order.currency}</Badge>
          </div>
        </div>
        {canManage && order.status !== 'received' && order.status !== 'cancelled' && (
          <div className="flex gap-2">
            <Button onClick={openReceiveDialog} className="bg-green-700 hover:bg-green-800 gap-2">
              <PackageCheck className="h-4 w-4" />
              Registrar recepción
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => {
                if (confirm('¿Cancelar esta orden?')) cancelOrder.mutate(order.id)
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Info card */}
      <Card className="mb-6">
        <CardContent className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Proveedor</p>
            <p className="font-medium">{supplier?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Fecha pedido</p>
            <p className="font-medium">{format(new Date(order.ordered_at), 'dd MMM yyyy', { locale: es })}</p>
          </div>
          {order.expected_at && (
            <div>
              <p className="text-gray-500">Entrega estimada</p>
              <p className="font-medium">{format(new Date(order.expected_at), 'dd MMM yyyy', { locale: es })}</p>
            </div>
          )}
          <div>
            <p className="text-gray-500">Creado por</p>
            <p className="font-medium">{creator?.full_name ?? '—'}</p>
          </div>
          {order.exchange_rate && (
            <div>
              <p className="text-gray-500">Tipo de cambio</p>
              <p className="font-medium">$ {order.exchange_rate.toLocaleString('es-AR')}</p>
            </div>
          )}
          {order.notes && (
            <div className="col-span-2 sm:col-span-3">
              <p className="text-gray-500">Notas</p>
              <p className="font-medium">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ítems */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {items.map((item) => {
              const pending = item.quantity_ordered - item.quantity_received
              return (
                <div key={item.id} className="py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                  <div className="col-span-2">
                    <p className="font-medium">{item.products?.name}</p>
                    <p className="text-gray-500">{item.warehouses?.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pedido / Recibido</p>
                    <p className="font-medium">
                      {item.quantity_ordered} {item.products?.unit}
                      {' / '}
                      <span className={item.quantity_received >= item.quantity_ordered ? 'text-green-600' : 'text-amber-600'}>
                        {item.quantity_received} {item.products?.unit}
                      </span>
                    </p>
                    {pending > 0 && <p className="text-xs text-amber-600">Faltan: {pending} {item.products?.unit}</p>}
                  </div>
                  <div>
                    <p className="text-gray-500">Precio unit.</p>
                    <p className="font-medium">
                      {item.unit_price != null
                        ? `${item.currency} ${item.unit_price.toLocaleString('es-AR')}`
                        : '—'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
          {total > 0 && (
            <div className="border-t pt-3 flex justify-end">
              <p className="text-sm font-semibold">
                Total estimado: {order.currency} {total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de recepción */}
      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar recepción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Ingresá las cantidades efectivamente recibidas:</p>
            {items.filter(i => i.quantity_received < i.quantity_ordered).map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.products?.name}</p>
                  <p className="text-xs text-gray-500">{item.warehouses?.name} · Pendiente: {item.quantity_ordered - item.quantity_received} {item.products?.unit}</p>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={item.quantity_ordered - item.quantity_received}
                  step="0.01"
                  value={quantities[item.id] ?? 0}
                  onChange={(e) => setQuantities(prev => ({ ...prev, [item.id]: parseFloat(e.target.value) || 0 }))}
                  className="w-24 shrink-0"
                />
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReceiveOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleReceive}
                disabled={receiveOrder.isPending}
                className="bg-green-700 hover:bg-green-800"
              >
                {receiveOrder.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar recepción'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
