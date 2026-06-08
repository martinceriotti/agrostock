'use client'

import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useCurrentStock } from '@/lib/hooks/use-stock'
import { useWarehouses, useCategories } from '@/lib/hooks/use-products'
import { AlertTriangle, Package2, Search } from 'lucide-react'

export default function StockPage() {
  const { data: stockData = [], isLoading } = useCurrentStock()
  const { data: warehouses = [] } = useWarehouses()
  const { data: categories = [] } = useCategories()

  const [search, setSearch] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [alertOnly, setAlertOnly] = useState(false)

  const enrichedStock = useMemo(() => {
    return stockData.map(entry => {
      const product = entry.products as {
        id: string; name: string; brand: string | null; unit: string
        min_stock_alert: number | null; category_id: string
        product_categories: { id: string; name: string; type: string } | null
      } | null
      const warehouse = entry.warehouses as { id: string; name: string } | null
      const isLow = product?.min_stock_alert != null && entry.quantity <= product.min_stock_alert
      return { ...entry, product, warehouse, isLow }
    })
  }, [stockData])

  const filtered = useMemo(() => {
    return enrichedStock.filter(entry => {
      if (!entry.product) return false
      if (search && !entry.product.name.toLowerCase().includes(search.toLowerCase()) &&
        !(entry.product.brand ?? '').toLowerCase().includes(search.toLowerCase())) return false
      if (warehouseFilter !== 'all' && entry.warehouse_id !== warehouseFilter) return false
      if (categoryFilter !== 'all' && entry.product.category_id !== categoryFilter) return false
      if (alertOnly && !entry.isLow) return false
      return true
    })
  }, [enrichedStock, search, warehouseFilter, categoryFilter, alertOnly])

  const lowStockCount = enrichedStock.filter(e => e.isLow).length

  return (
    <div>
      <PageHeader
        title="Stock Actual"
        description="Inventario en tiempo real por depósito y producto"
      />

      {/* Alerta banner */}
      {lowStockCount > 0 && (
        <div
          className="flex items-center gap-3 p-3 mb-4 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer"
          onClick={() => setAlertOnly(!alertOnly)}
        >
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800 flex-1">
            <strong>{lowStockCount} producto(s)</strong> con stock por debajo del mínimo.
          </p>
          <Badge variant="outline" className="text-amber-700 border-amber-300 shrink-0">
            {alertOnly ? 'Ver todos' : 'Filtrar'}
          </Badge>
        </div>
      )}

      {/* Filtros */}
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
        <Select value={warehouseFilter} onValueChange={(v) => setWarehouseFilter(v ?? 'all')}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Todos los depósitos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los depósitos</SelectItem>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v ?? 'all')}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid de tarjetas de stock */}
      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No se encontraron productos con stock.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((entry, i) => (
            <Card
              key={`${entry.product_id}-${entry.warehouse_id}-${i}`}
              className={`transition-shadow hover:shadow-md ${entry.isLow ? 'border-amber-300 bg-amber-50' : ''}`}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{entry.product?.name}</p>
                    {entry.product?.brand && (
                      <p className="text-xs text-gray-500">{entry.product.brand}</p>
                    )}
                  </div>
                  {entry.isLow && (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  )}
                </div>

                <div className="flex items-end justify-between">
                  <div>
                    <p className={`text-2xl font-bold ${entry.isLow ? 'text-amber-700' : 'text-green-700'}`}>
                      {entry.quantity.toLocaleString('es-AR')}
                      <span className="text-sm font-normal text-gray-500 ml-1">{entry.product?.unit}</span>
                    </p>
                    {entry.product?.min_stock_alert != null && (
                      <p className="text-xs text-gray-400">
                        Mínimo: {entry.product.min_stock_alert} {entry.product.unit}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <Badge variant="outline" className="text-xs">
                      {entry.warehouse?.name}
                    </Badge>
                    <p className="text-xs text-gray-400 mt-1">
                      {entry.product?.product_categories?.name}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
