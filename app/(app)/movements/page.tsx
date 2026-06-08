'use client'

import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { PageHeader } from '@/components/ui/page-header'
import { DataTable } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useStockMovements } from '@/lib/hooks/use-stock'
import { ArrowDownCircle, ArrowUpCircle, RefreshCcw, PenLine, Search } from 'lucide-react'

const MOVEMENT_TYPES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  purchase_receipt: { label: 'Compra recibida', icon: ArrowUpCircle, color: 'text-green-600' },
  consumption: { label: 'Consumo en campo', icon: ArrowDownCircle, color: 'text-red-500' },
  transfer: { label: 'Transferencia', icon: RefreshCcw, color: 'text-blue-500' },
  adjustment: { label: 'Ajuste', icon: PenLine, color: 'text-purple-500' },
  initial: { label: 'Stock inicial', icon: ArrowUpCircle, color: 'text-gray-500' },
}

export default function MovementsPage() {
  const { data: movements = [], isLoading } = useStockMovements()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const filtered = useMemo(() => {
    return movements.filter(m => {
      const product = m.products as { name: string } | null
      if (search && !product?.name.toLowerCase().includes(search.toLowerCase())) return false
      if (typeFilter !== 'all' && m.movement_type !== typeFilter) return false
      return true
    })
  }, [movements, search, typeFilter])

  return (
    <div>
      <PageHeader
        title="Movimientos de Stock"
        description="Registro completo de todas las entradas y salidas"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Todos los tipos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            {Object.entries(MOVEMENT_TYPES).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No hay movimientos registrados"
        columns={[
          {
            key: 'type',
            header: 'Tipo',
            cell: (row) => {
              const type = MOVEMENT_TYPES[row.movement_type]
              const Icon = type?.icon ?? PenLine
              return (
                <div className={`flex items-center gap-1.5 ${type?.color ?? 'text-gray-500'}`}>
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium whitespace-nowrap">{type?.label}</span>
                </div>
              )
            },
          },
          {
            key: 'product',
            header: 'Producto',
            cell: (row) => {
              const product = row.products as { name: string; unit: string } | null
              return <span className="font-medium text-sm">{product?.name ?? '—'}</span>
            },
          },
          {
            key: 'quantity',
            header: 'Cantidad',
            cell: (row) => {
              const product = row.products as { unit: string } | null
              return (
                <span className={`font-mono font-medium text-sm ${row.quantity > 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {row.quantity > 0 ? '+' : ''}{row.quantity} {product?.unit}
                </span>
              )
            },
          },
          {
            key: 'warehouse',
            header: 'Depósito',
            cell: (row) => {
              const warehouse = row.warehouses as { name: string } | null
              return <Badge variant="outline" className="text-xs">{warehouse?.name ?? '—'}</Badge>
            },
          },
          {
            key: 'price',
            header: 'Precio unit.',
            cell: (row) => row.unit_price != null ? (
              <span className="text-sm text-gray-600 font-mono">
                {row.currency} {row.unit_price.toLocaleString('es-AR')}
              </span>
            ) : <span className="text-gray-300 text-sm">—</span>,
          },
          {
            key: 'user',
            header: 'Usuario',
            cell: (row) => {
              const profile = row.profiles as { full_name: string } | null
              return <span className="text-xs text-gray-500">{profile?.full_name ?? '—'}</span>
            },
          },
          {
            key: 'date',
            header: 'Fecha',
            cell: (row) => (
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {format(new Date(row.created_at), "dd MMM yyyy, HH:mm", { locale: es })}
              </span>
            ),
          },
        ]}
      />
    </div>
  )
}
