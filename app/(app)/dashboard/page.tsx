'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { KPICard } from '@/components/dashboard/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useDashboardData } from '@/lib/hooks/use-dashboard'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import {
  ShoppingCart, AlertTriangle, DollarSign, Package2, Sprout, ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default function DashboardPage() {
  const { data, isLoading } = useDashboardData()

  const lowStockItems = (data?.lowStockItems ?? []) as Array<{
    product_id: string
    warehouse_id: string
    quantity: number
    products: {
      name: string
      unit: string
      min_stock_alert: number | null
      brand: string | null
      product_categories: { name: string; type: string } | null
    } | null
    warehouses?: { name: string } | null
  }>

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Órdenes pendientes"
          value={data?.pendingOrdersCount ?? 0}
          subtitle="por recibir"
          icon={ShoppingCart}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          isLoading={isLoading}
          alert={(data?.pendingOrdersCount ?? 0) > 0}
        />
        <KPICard
          title="Stock bajo mínimo"
          value={data?.lowStockItems.length ?? 0}
          subtitle="productos con alerta"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
          isLoading={isLoading}
          alert={(data?.lowStockItems.length ?? 0) > 0}
        />
        <KPICard
          title="Gasto del mes (ARS)"
          value={`$ ${(data?.monthSpendARS ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })}`}
          subtitle="compras recibidas"
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-100"
          isLoading={isLoading}
        />
        <KPICard
          title="Gasto del mes (USD)"
          value={`U$D ${(data?.monthSpendUSD ?? 0).toLocaleString('es-AR', { maximumFractionDigits: 2 })}`}
          subtitle="compras recibidas"
          icon={DollarSign}
          iconColor="text-purple-600"
          iconBg="bg-purple-100"
          isLoading={isLoading}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Consumo por mes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Consumo mensual (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.consumptionChart ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="cantidad" fill="#16a34a" radius={[4, 4, 0, 0]} name="Unidades consumidas" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gasto ARS + USD por mes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gasto en compras (últimos 6 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.spendChart ?? []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ARS" fill="#16a34a" radius={[4, 4, 0, 0]} name="ARS" />
                <Bar dataKey="USD" fill="#7c3aed" radius={[4, 4, 0, 0]} name="USD" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Alertas y actividad reciente */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Stock bajo */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Stock por debajo del mínimo
            </CardTitle>
            <Link href="/stock" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Ver stock <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Package2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Todo el stock está sobre los mínimos.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {lowStockItems.slice(0, 6).map((entry, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{entry.products?.name}</p>
                      <p className="text-xs text-gray-400">{entry.products?.product_categories?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-amber-700">
                        {entry.quantity} {entry.products?.unit}
                      </p>
                      <p className="text-xs text-gray-400">
                        mín: {entry.products?.min_stock_alert} {entry.products?.unit}
                      </p>
                    </div>
                  </div>
                ))}
                {lowStockItems.length > 6 && (
                  <p className="text-xs text-center text-gray-400 pt-1">
                    +{lowStockItems.length - 6} productos más
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Últimas aplicaciones */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sprout className="h-4 w-4 text-green-600" />
              Últimas aplicaciones
            </CardTitle>
            <Link href="/applications" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Ver todas <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {(data?.recentApplications ?? []).length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <Sprout className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No hay aplicaciones registradas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data?.recentApplications.map((app) => {
                  const profile = app.profiles as { full_name: string } | null
                  return (
                    <div key={app.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{app.field_name}</p>
                        <p className="text-xs text-gray-400">{profile?.full_name}</p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {format(new Date(app.application_date), 'dd MMM', { locale: es })}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
