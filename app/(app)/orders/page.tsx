'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useOrders } from '@/lib/hooks/use-orders'
import { useUser } from '@/lib/hooks/use-user'
import { Plus, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OrderRow } from '@/lib/types/app.types'

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendiente', variant: 'secondary' },
  partial: { label: 'Parcial', variant: 'default' },
  received: { label: 'Recibida', variant: 'outline' },
  cancelled: { label: 'Cancelada', variant: 'destructive' },
}

export default function OrdersPage() {
  const router = useRouter()
  const { data: user } = useUser()
  const { data: orders = [], isLoading } = useOrders()
  const canCreate = user?.role === 'admin' || user?.role === 'manager'

  return (
    <div>
      <PageHeader
        title="Órdenes de Compra"
        description="Seguimiento de compras realizadas y pendientes de recepción"
        action={
          canCreate ? (
            <Link href="/orders/new" className={cn(buttonVariants(), 'bg-green-700 hover:bg-green-800 gap-2')}>
              <Plus className="h-4 w-4" />
              Nueva orden
            </Link>
          ) : undefined
        }
      />

      <DataTable
        data={orders}
        isLoading={isLoading}
        emptyMessage="No hay órdenes de compra"
        onRowClick={(row) => router.push(`/orders/${row.id}`)}
        columns={[
          {
            key: 'order_number',
            header: 'N° Orden',
            cell: (row: OrderRow) => <span className="font-mono text-sm font-medium">{row.order_number}</span>,
          },
          {
            key: 'supplier',
            header: 'Proveedor',
            cell: (row: OrderRow) => <span className="text-sm">{row.suppliers?.name ?? '—'}</span>,
          },
          {
            key: 'status',
            header: 'Estado',
            cell: (row: OrderRow) => {
              const s = STATUS_LABELS[row.status]
              return <Badge variant={s.variant}>{s.label}</Badge>
            },
          },
          {
            key: 'items',
            header: 'Ítems',
            cell: (row: OrderRow) => (
              <span className="text-sm text-gray-600">{row.purchase_order_items?.length ?? 0} producto(s)</span>
            ),
          },
          {
            key: 'currency',
            header: 'Moneda',
            cell: (row: OrderRow) => (
              <Badge variant="outline" className="font-mono">{row.currency}</Badge>
            ),
          },
          {
            key: 'ordered_at',
            header: 'Fecha',
            cell: (row: OrderRow) => (
              <span className="text-sm text-gray-500">
                {format(new Date(row.ordered_at), 'dd MMM yyyy', { locale: es })}
              </span>
            ),
          },
          {
            key: 'actions',
            header: '',
            className: 'w-16',
            cell: (row: OrderRow) => (
              <Link href={`/orders/${row.id}`} className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
                <Eye className="h-4 w-4 mr-1" />
                Ver
              </Link>
            ),
          },
        ]}
      />
    </div>
  )
}
