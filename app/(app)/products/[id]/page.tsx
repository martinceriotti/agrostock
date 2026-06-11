'use client'

import { use, useMemo } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useProducts } from '@/lib/hooks/use-products'
import { useProductDetail } from '@/lib/hooks/use-products'
import { useCurrentStock, useLotsByProduct } from '@/lib/hooks/use-stock'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'

const SUPPLIER_COLORS = ['#16a34a', '#2563eb', '#d97706', '#7c3aed', '#db2777', '#0891b2']

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: products = [], isLoading: loadingProduct } = useProducts()
  const { data: history = [], isLoading: loadingHistory } = useProductDetail(id)
  const { data: stockData = [] } = useCurrentStock()
  const { data: lots = [] } = useLotsByProduct(id)

  const product = products.find(p => p.id === id)

  const totalStock = useMemo(() => {
    return stockData
      .filter(s => s.product_id === id)
      .reduce((sum, s) => sum + s.quantity, 0)
  }, [stockData, id])

  const pricesWithUSD = useMemo(() => history.filter(h => h.price_usd != null), [history])

  const stats = useMemo(() => {
    if (!pricesWithUSD.length) return null
    const prices = pricesWithUSD.map(h => h.price_usd!)
    return {
      last: prices[0],
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
    }
  }, [pricesWithUSD])

  const suppliers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; firstDate: string; lastDate: string }>()
    history.forEach(h => {
      if (!h.supplier) return
      const existing = map.get(h.supplier.id)
      if (!existing) {
        map.set(h.supplier.id, { id: h.supplier.id, name: h.supplier.name, firstDate: h.order.ordered_at, lastDate: h.order.ordered_at })
      } else {
        if (h.order.ordered_at < existing.firstDate) existing.firstDate = h.order.ordered_at
        if (h.order.ordered_at > existing.lastDate) existing.lastDate = h.order.ordered_at
      }
    })
    return [...map.values()]
  }, [history])

  const supplierNames = useMemo(() => suppliers.map(s => s.name), [suppliers])

  const chartData = useMemo(() => {
    const byDate = new Map<string, Record<string, number>>()
    pricesWithUSD.forEach(h => {
      const date = h.order.ordered_at.slice(0, 10)
      const supplierName = h.supplier?.name ?? 'Sin proveedor'
      if (!byDate.has(date)) byDate.set(date, {})
      byDate.get(date)![supplierName] = h.price_usd!
    })
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({ date, ...values }))
  }, [pricesWithUSD])

  const allSupplierLines = useMemo(() => {
    const names = new Set<string>()
    pricesWithUSD.forEach(h => names.add(h.supplier?.name ?? 'Sin proveedor'))
    return [...names]
  }, [pricesWithUSD])

  if (loadingProduct || loadingHistory) {
    return <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-200 rounded w-1/3" /><div className="h-48 bg-gray-200 rounded" /></div>
  }

  if (!product) {
    return <div className="text-center py-12 text-gray-500">Producto no encontrado.</div>
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/stock" className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2 mb-4 -ml-2')}>
          <ArrowLeft className="h-4 w-4" />Volver a stock
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            {product.brand && <p className="text-gray-500 text-sm mt-0.5">{product.brand}</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {product.product_categories && (
              <Badge variant="secondary">{product.product_categories.name}</Badge>
            )}
            <Badge variant="outline" className="font-mono">{product.unit}</Badge>
            <Badge className={totalStock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
              Stock: {totalStock} {product.unit}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard
            label="Último precio USD"
            value={`$${stats.last.toFixed(2)}`}
            icon={stats.last <= stats.avg ? <TrendingDown className="h-4 w-4 text-green-600" /> : <TrendingUp className="h-4 w-4 text-red-500" />}
          />
          <StatCard label="Promedio USD" value={`$${stats.avg.toFixed(2)}`} icon={<Minus className="h-4 w-4 text-gray-400" />} />
          <StatCard label="Mínimo USD" value={`$${stats.min.toFixed(2)}`} icon={<TrendingDown className="h-4 w-4 text-green-600" />} />
          <StatCard label="Máximo USD" value={`$${stats.max.toFixed(2)}`} icon={<TrendingUp className="h-4 w-4 text-red-500" />} />
        </div>
      )}

      {/* Gráfico */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolución de precio (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => format(new Date(v), 'MMM yy', { locale: es })}
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  tickFormatter={(v) => `$${Number(v ?? 0).toFixed(0)}`}
                  tick={{ fontSize: 11 }}
                  width={50}
                />
                <Tooltip
                  formatter={(value) => [`$${Number(value ?? 0).toFixed(2)}`, '']}
                  labelFormatter={(label) => format(new Date(label as string), 'dd MMM yyyy', { locale: es })}
                />
                {allSupplierLines.length > 1 && <Legend />}
                {allSupplierLines.map((name, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={SUPPLIER_COLORS[i % SUPPLIER_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Historial */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de compras</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">Sin compras registradas</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-4 font-medium">Fecha</th>
                    <th className="pb-2 pr-4 font-medium">N° OC</th>
                    <th className="pb-2 pr-4 font-medium">Proveedor</th>
                    <th className="pb-2 pr-4 font-medium text-right">Cantidad</th>
                    <th className="pb-2 pr-4 font-medium text-right">Precio original</th>
                    <th className="pb-2 pr-4 font-medium text-right">Precio USD</th>
                    <th className="pb-2 font-medium">Lote</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-50">
                      <td className="py-2.5 pr-4 text-gray-500">
                        {format(new Date(h.order.ordered_at), 'dd MMM yyyy', { locale: es })}
                      </td>
                      <td className="py-2.5 pr-4">
                        <Link href={`/orders/${h.order.id}`} className="font-mono text-green-700 hover:underline">
                          {h.order.order_number}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700">{h.supplier?.name ?? '—'}</td>
                      <td className="py-2.5 pr-4 text-right font-medium">
                        {h.quantity_ordered} {product.unit}
                      </td>
                      <td className="py-2.5 pr-4 text-right text-gray-500">
                        {h.unit_price != null ? `${h.currency} ${h.unit_price.toLocaleString('es-AR')}` : '—'}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium">
                        {h.price_usd != null ? `$${h.price_usd.toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2.5 text-gray-500 font-mono text-xs">{h.lote ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Lotes disponibles */}
      {lots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lotes disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                    <th className="pb-2 pr-4 font-medium">Lote</th>
                    <th className="pb-2 pr-4 font-medium">Depósito</th>
                    <th className="pb-2 pr-4 font-medium">Vencimiento</th>
                    <th className="pb-2 pr-4 font-medium text-right">Cantidad</th>
                    <th className="pb-2 font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {lots.map((lot) => {
                    const today = new Date()
                    const expiry = lot.fecha_vencimiento ? new Date(lot.fecha_vencimiento) : null
                    const isExpired = expiry && expiry < today
                    const isExpiringSoon = expiry && !isExpired && expiry < new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000)
                    return (
                      <tr key={lot.lot_id} className="hover:bg-gray-50">
                        <td className="py-2.5 pr-4 font-mono text-xs font-medium">{lot.lote}</td>
                        <td className="py-2.5 pr-4 text-gray-600">{lot.warehouses?.name ?? '—'}</td>
                        <td className="py-2.5 pr-4">
                          {expiry ? (
                            <span className={isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-amber-600' : 'text-gray-600'}>
                              {format(expiry, 'dd MMM yyyy', { locale: es })}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">
                          {lot.quantity.toLocaleString('es-AR')}
                          <span className="ml-1 text-xs font-normal text-gray-400">{product.unit}</span>
                        </td>
                        <td className="py-2.5">
                          {isExpired ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">Vencido</span>
                          ) : isExpiringSoon ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Por vencer</span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Vigente</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Proveedores */}
      {suppliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proveedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {suppliers.map((s, i) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: SUPPLIER_COLORS[i % SUPPLIER_COLORS.length] }}
                    />
                    <span className="font-medium">{s.name}</span>
                  </div>
                  <span className="text-gray-500 text-xs">
                    {format(new Date(s.firstDate), 'dd MMM yyyy', { locale: es })}
                    {s.firstDate !== s.lastDate && ` — ${format(new Date(s.lastDate), 'dd MMM yyyy', { locale: es })}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-gray-500">{label}</p>
          {icon}
        </div>
        <p className="text-xl font-bold text-gray-900">{value}</p>
      </CardContent>
    </Card>
  )
}
