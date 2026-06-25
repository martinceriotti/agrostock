'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentStock } from '@/lib/hooks/use-stock'
import { useWarehouses, useCategories } from '@/lib/hooks/use-products'
import { useUser } from '@/lib/hooks/use-user'
import { AlertTriangle, Package2, Search, LayoutGrid, List, Truck } from 'lucide-react'

type StockItem = {
  product_id: string
  warehouse_id: string
  quantity: number
  product: { id: string; name: string; brand: string | null; unit: string; min_stock_alert: number | null; category_id: string; product_categories: { id: string; name: string; type: string } | null } | null
  warehouse: { id: string; name: string } | null
  isLow: boolean
  isNegative: boolean
}

export default function StockPage() {
  const router = useRouter()
  const { data: user } = useUser()
  const { data: stockData = [], isLoading } = useCurrentStock()
  const { data: warehouses = [] } = useWarehouses()
  const { data: categories = [] } = useCategories()
  const canManage = user?.role === 'admin' || user?.role === 'manager'

  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [alertOnly, setAlertOnly] = useState(false)
  const [view, setView] = useState<'cards' | 'list'>('list')
  const [groupBy, setGroupBy] = useState<'none' | 'warehouse' | 'category'>('warehouse')

  const items = useMemo<StockItem[]>(() => {
    return stockData.map(entry => {
      const product = entry.products as StockItem['product']
      const warehouse = entry.warehouses as { id: string; name: string } | null
      const isLow = !!(product?.min_stock_alert != null && entry.quantity > 0 && entry.quantity <= product.min_stock_alert)
      const isNegative = entry.quantity < 0
      return { ...entry, product, warehouse, isLow, isNegative }
    })
  }, [stockData])

  const filtered = useMemo(() => {
    return items
      .filter(e => {
        if (!e.product) return false
        if (search) {
          const q = search.toLowerCase()
          if (!e.product.name.toLowerCase().includes(q) && !(e.product.brand ?? '').toLowerCase().includes(q)) return false
        }
        if (warehouseFilter !== 'all' && e.warehouse_id !== warehouseFilter) return false
        if (categoryFilter !== 'all' && e.product.category_id !== categoryFilter) return false
        if (alertOnly && !e.isLow && !e.isNegative) return false
        return true
      })
      .sort((a, b) => (a.product?.name ?? '').localeCompare(b.product?.name ?? '', 'es'))
  }, [items, search, warehouseFilter, categoryFilter, alertOnly])

  const alertCount = items.filter(e => e.isLow || e.isNegative).length

  // Agrupar items
  const grouped = useMemo(() => {
    if (groupBy === 'none') return [{ key: '', label: '', items: filtered }]
    const map = new Map<string, { key: string; label: string; items: StockItem[] }>()
    filtered.forEach(e => {
      const key = groupBy === 'warehouse'
        ? (e.warehouse?.id ?? '')
        : (e.product?.product_categories?.id ?? 'sin-categoria')
      const label = groupBy === 'warehouse'
        ? (e.warehouse?.name ?? 'Sin depósito')
        : (e.product?.product_categories?.name ?? 'Sin categoría')
      if (!map.has(key)) map.set(key, { key, label, items: [] })
      map.get(key)!.items.push(e)
    })
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label))
  }, [filtered, groupBy])

  function stockColor(e: StockItem) {
    if (e.isNegative) return 'text-red-600'
    if (e.isLow) return 'text-amber-600'
    return 'text-green-700'
  }

  function rowBg(e: StockItem) {
    if (e.isNegative) return 'bg-red-50 border-red-200'
    if (e.isLow) return 'border-amber-200 bg-amber-50'
    return ''
  }

  return (
    <div>
      <PageHeader
        title="Stock Actual"
        description="Inventario en tiempo real por depósito y producto"
        action={
          canManage ? (
            <Button variant="outline" size="sm" className="gap-2" onClick={() => router.push('/movements/transfer')}>
              <Truck className="h-4 w-4" />
              Transferir
            </Button>
          ) : undefined
        }
      />

      {alertCount > 0 && (
        <div
          className="flex items-center gap-3 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg cursor-pointer"
          onClick={() => setAlertOnly(!alertOnly)}
        >
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800 flex-1">
            <strong>{alertCount} producto(s)</strong> con stock negativo o bajo el mínimo.
          </p>
          <Badge variant="outline" className="text-red-700 border-red-300 shrink-0">
            {alertOnly ? 'Ver todos' : 'Filtrar'}
          </Badge>
        </div>
      )}

      {/* Controles */}
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

        <Select value={warehouseFilter} onValueChange={(v) => setWarehouseFilter(v ?? 'all')}
          items={[{ value: 'all', label: 'Todos los depósitos' }, ...warehouses.map(w => ({ value: w.id, label: w.name }))]}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Depósitos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los depósitos</SelectItem>
            {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}
          items={[{ value: 'all', label: 'Todas las categorías' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={groupBy} onValueChange={(v) => setGroupBy((v ?? 'warehouse') as typeof groupBy)}
          items={{ none: 'Sin agrupar', warehouse: 'Por depósito', category: 'Por categoría' }}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin agrupar</SelectItem>
            <SelectItem value="warehouse">Por depósito</SelectItem>
            <SelectItem value="category">Por categoría</SelectItem>
          </SelectContent>
        </Select>

        {/* Vista toggle */}
        <div className="flex border border-gray-200 rounded-md overflow-hidden shrink-0">
          <button
            onClick={() => setView('list')}
            className={`px-3 py-2 ${view === 'list' ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            title="Vista lista"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setView('cards')}
            className={`px-3 py-2 ${view === 'cards' ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            title="Vista tarjetas"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Contenido */}
      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No se encontraron productos con stock.</p>
        </div>
      ) : view === 'list' ? (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.key}>
              {group.label && (
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                  {group.label}
                  <span className="ml-2 font-normal normal-case text-gray-400">({group.items.length})</span>
                </h3>
              )}
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-medium text-gray-600">Producto</th>
                      {groupBy !== 'category' && <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden sm:table-cell">Categoría</th>}
                      {groupBy !== 'warehouse' && <th className="text-left px-4 py-2.5 font-medium text-gray-600 hidden md:table-cell">Depósito</th>}
                      <th className="text-right px-4 py-2.5 font-medium text-gray-600">Stock</th>
                      <th className="w-8 px-2 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {group.items.map((e, i) => (
                      <tr key={`${e.product_id}-${e.warehouse_id}-${i}`} className={`${rowBg(e)} cursor-pointer hover:bg-gray-50`} onClick={() => router.push(`/products/${e.product_id}`)}>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-gray-900">{e.product?.name}</span>
                          {e.product?.brand && <span className="ml-2 text-xs text-gray-400">{e.product.brand}</span>}
                        </td>
                        {groupBy !== 'category' && (
                          <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">
                            {e.product?.product_categories?.name ?? '—'}
                          </td>
                        )}
                        {groupBy !== 'warehouse' && (
                          <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">
                            {e.warehouse?.name ?? '—'}
                          </td>
                        )}
                        <td className={`px-4 py-2.5 text-right font-semibold tabular-nums ${stockColor(e)}`}>
                          {e.quantity.toLocaleString('es-AR')}
                          <span className="ml-1 text-xs font-normal text-gray-400">{e.product?.unit}</span>
                        </td>
                        <td className="px-2 py-2.5 text-center">
                          {e.isNegative && <AlertTriangle className="h-3.5 w-3.5 text-red-500 mx-auto" />}
                          {e.isLow && !e.isNegative && <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mx-auto" />}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Vista cards
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.key}>
              {group.label && (
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">
                  {group.label}
                  <span className="ml-2 font-normal normal-case text-gray-400">({group.items.length})</span>
                </h3>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((e, i) => (
                  <Card key={`${e.product_id}-${e.warehouse_id}-${i}`}
                    className={`transition-shadow hover:shadow-md cursor-pointer ${e.isNegative ? 'border-red-300 bg-red-50' : e.isLow ? 'border-amber-300 bg-amber-50' : ''}`}
                    onClick={() => router.push(`/products/${e.product_id}`)}>
                    <CardContent className="pt-4 pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{e.product?.name}</p>
                          {e.product?.brand && <p className="text-xs text-gray-500">{e.product.brand}</p>}
                        </div>
                        {(e.isLow || e.isNegative) && (
                          <AlertTriangle className={`h-4 w-4 shrink-0 mt-0.5 ${e.isNegative ? 'text-red-500' : 'text-amber-500'}`} />
                        )}
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className={`text-2xl font-bold ${stockColor(e)}`}>
                            {e.quantity.toLocaleString('es-AR')}
                            <span className="text-sm font-normal text-gray-500 ml-1">{e.product?.unit}</span>
                          </p>
                          {e.product?.min_stock_alert != null && (
                            <p className="text-xs text-gray-400">Mínimo: {e.product.min_stock_alert} {e.product.unit}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">{e.warehouse?.name}</Badge>
                          <p className="text-xs text-gray-400 mt-1">{e.product?.product_categories?.name}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
