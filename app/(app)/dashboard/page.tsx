'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { KPICard } from '@/components/dashboard/kpi-card'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useDashboardData } from '@/lib/hooks/use-dashboard'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { ShoppingCart, AlertTriangle, DollarSign, Sprout, ArrowRight, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

const CATEGORY_COLORS: Record<string, string> = {
  'Herbicida':    '#16a34a',
  'Herbicidas':   '#16a34a',
  'Fungicida':    '#f97316',
  'Fungicidas':   '#f97316',
  'Insecticida':  '#3b82f6',
  'Insecticidas': '#3b82f6',
  'Semilla':      '#a855f7',
  'Semillas':     '#a855f7',
  'Otros':        '#94a3b8',
}
function catColor(name: string) {
  return CATEGORY_COLORS[name] ?? '#94a3b8'
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboardData()
  const [consumptionTab, setConsumptionTab] = useState<'litros' | 'kilos'>('litros')

  const consumptionData = data?.consumptionByUnit[consumptionTab] ?? []
  const categories = data?.consumptionByUnit.categories ?? []
  const hasConsumption = consumptionData.some(row =>
    categories.some(cat => (row as Record<string, unknown>)[cat])
  )

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Órdenes activas"
          value={data?.activeOrdersCount ?? 0}
          subtitle="pendientes o parciales"
          icon={ShoppingCart}
          iconColor="text-blue-600"
          iconBg="bg-blue-100"
          isLoading={isLoading}
          alert={(data?.activeOrdersCount ?? 0) > 0}
        />
        <KPICard
          title="Stock negativo"
          value={data?.negativeCount ?? 0}
          subtitle="productos en rojo"
          icon={TrendingDown}
          iconColor="text-red-600"
          iconBg="bg-red-100"
          isLoading={isLoading}
          alert={(data?.negativeCount ?? 0) > 0}
        />
        <KPICard
          title="Gasto del mes"
          value={`U$D ${(data?.monthSpendUSD ?? 0).toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          subtitle="ARS convertido al TC de cada OC"
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-100"
          isLoading={isLoading}
        />
        <KPICard
          title="Aplicaciones del mes"
          value={data?.monthAppsCount ?? 0}
          subtitle="órdenes registradas"
          icon={Sprout}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
          isLoading={isLoading}
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Consumo por categoría — tabs L / KG */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Consumo por categoría (6 meses)</CardTitle>
              <div className="flex border border-gray-200 rounded-md overflow-hidden text-xs">
                <button
                  onClick={() => setConsumptionTab('litros')}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    consumptionTab === 'litros' ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  Litros
                </button>
                <button
                  onClick={() => setConsumptionTab('kilos')}
                  className={`px-3 py-1.5 font-medium transition-colors ${
                    consumptionTab === 'kilos' ? 'bg-green-700 text-white' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  KG
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!hasConsumption ? (
              <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                Sin consumos en {consumptionTab === 'litros' ? 'litros' : 'kg'} en los últimos 6 meses
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={consumptionData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${value.toLocaleString('es-AR')} ${consumptionTab === 'litros' ? 'L' : 'kg'}`,
                      name,
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {categories.map(cat => (
                    <Bar key={cat} dataKey={cat} stackId="a" fill={catColor(cat)} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Gasto en USD por mes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gasto en compras — USD (6 meses)</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">ARS convertido al TC de cada orden</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.spendChart ?? []} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => [`U$D ${v.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, 'Gasto']} />
                <Bar dataKey="USD" fill="#7c3aed" radius={[4, 4, 0, 0]} name="USD" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top consumos + Últimas aplicaciones */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top 5 consumidos este mes */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              Top consumos del mes
            </CardTitle>
            <Link href="/movements" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              Ver todos <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {(data?.topConsumed ?? []).length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">
                Sin consumos registrados este mes.
              </div>
            ) : (
              <div className="space-y-1">
                {data?.topConsumed.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-green-700 tabular-nums">
                      {item.total.toLocaleString('es-AR')}
                      <span className="ml-1 text-xs font-normal text-gray-400">{item.unit}</span>
                    </span>
                  </div>
                ))}
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
              <div className="text-center py-6 text-gray-400 text-sm">
                No hay aplicaciones registradas.
              </div>
            ) : (
              <div className="space-y-1">
                {data?.recentApplications.map(app => {
                  const profile = app.profiles as { full_name: string } | null
                  return (
                    <div key={app.id} className="flex items-center justify-between py-2 border-b last:border-0">
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
