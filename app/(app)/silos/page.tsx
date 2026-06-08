'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSilos, useSiloAlerts, type Silo } from '@/lib/hooks/use-silos'
import {
  Database, Thermometer, Droplets, AlertTriangle, CheckCircle2,
  WifiOff, MapPin, Wheat, Plus, ChevronRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

const STATUS_LABELS: Record<Silo['status'], string> = {
  active: 'Activo',
  empty:  'Vacío',
  closed: 'Cerrado',
}
const STATUS_COLORS: Record<Silo['status'], string> = {
  active: 'bg-green-100 text-green-800 border-green-200',
  empty:  'bg-gray-100 text-gray-600 border-gray-200',
  closed: 'bg-red-100 text-red-700 border-red-200',
}

export default function SilosPage() {
  const { data: silos = [], isLoading } = useSilos()
  const activeSilos = silos.filter(s => s.status === 'active')

  return (
    <div>
      <PageHeader
        title="Silos Bolsa"
        description="Monitoreo de temperatura, humedad y CO₂ por silo"
        action={
          <Button size="sm" className="gap-2 bg-green-700 hover:bg-green-800" disabled>
            <Plus className="h-4 w-4" />
            Nuevo Silo
          </Button>
        }
      />

      {/* Banner próximamente */}
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex items-start gap-3">
        <Database className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">Módulo en desarrollo</p>
          <p className="text-sm text-amber-700 mt-0.5">
            La infraestructura de base de datos y la API de ingesta IoT ya están listas.
            La interfaz completa de gestión y visualización estará disponible próximamente.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : silos.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* KPIs rápidos */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <KPITile label="Activos" value={activeSilos.length} icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
            <KPITile label="Total bolsas" value={silos.length} icon={Database} color="text-blue-600" bg="bg-blue-50" />
            <KPITile
              label="Capacidad (ton)"
              value={(silos.reduce((s, x) => s + (x.capacity_tons ?? 0), 0)).toLocaleString('es-AR', { maximumFractionDigits: 0 })}
              icon={Wheat}
              color="text-amber-600"
              bg="bg-amber-50"
            />
            <KPITile label="Cerrados" value={silos.filter(s => s.status === 'closed').length} icon={WifiOff} color="text-gray-500" bg="bg-gray-50" />
          </div>

          {/* Lista de silos */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {silos.map(silo => (
              <SiloCard key={silo.id} silo={silo} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function SiloCard({ silo }: { silo: Silo }) {
  const { data: alerts = [] } = useSiloAlerts(silo.id)
  const hasAlerts = alerts.length > 0

  return (
    <Card className={`transition-shadow hover:shadow-md ${hasAlerts ? 'border-red-300' : ''}`}>
      <CardContent className="pt-4 pb-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{silo.name}</p>
            {silo.field_name && (
              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {silo.field_name}
              </p>
            )}
          </div>
          <Badge className={`text-xs border shrink-0 ${STATUS_COLORS[silo.status]}`}>
            {STATUS_LABELS[silo.status]}
          </Badge>
        </div>

        {/* Info */}
        <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
          {silo.crop && (
            <div className="flex items-center gap-1.5 text-gray-600">
              <Wheat className="h-3.5 w-3.5 text-amber-500" />
              <span className="truncate">{silo.crop}</span>
            </div>
          )}
          {silo.capacity_tons && (
            <div className="text-gray-600">
              <span className="font-medium">{silo.capacity_tons.toLocaleString('es-AR')}</span>
              <span className="text-xs text-gray-400 ml-1">ton</span>
            </div>
          )}
          {silo.fill_date && (
            <div className="text-xs text-gray-400 col-span-2">
              Llenado {formatDistanceToNow(new Date(silo.fill_date), { addSuffix: true, locale: es })}
            </div>
          )}
        </div>

        {/* Placeholder lecturas — se llenará cuando haya sensores */}
        <div className="flex gap-3 py-2 border-t border-gray-100">
          <ReadingPlaceholder icon={Thermometer} label="Temp." unit="°C" />
          <ReadingPlaceholder icon={Droplets} label="Hum." unit="%" />
        </div>

        {/* Alertas activas */}
        {hasAlerts && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{alerts.length} alerta{alerts.length > 1 ? 's' : ''} activa{alerts.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* API key info (solo visible para admin) */}
        <div className="mt-2 pt-2 border-t border-gray-100">
          <p className="text-xs text-gray-400 font-mono truncate">
            API key: {silo.api_key.slice(0, 16)}…
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ReadingPlaceholder({ icon: Icon, label, unit }: { icon: React.ElementType; label: string; unit: string }) {
  return (
    <div className="flex items-center gap-1.5 text-gray-400">
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs">{label}</span>
      <span className="text-xs font-medium text-gray-300">—{unit}</span>
    </div>
  )
}

function KPITile({ label, value, icon: Icon, color, bg }: {
  label: string; value: string | number; icon: React.ElementType; color: string; bg: string
}) {
  return (
    <div className={`rounded-lg ${bg} px-4 py-3 flex items-center gap-3`}>
      <Icon className={`h-5 w-5 ${color} shrink-0`} />
      <div>
        <p className="text-lg font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20 text-gray-400">
      <Database className="h-14 w-14 mx-auto mb-4 opacity-20" />
      <p className="font-medium text-gray-500">Sin silos registrados</p>
      <p className="text-sm mt-1 max-w-sm mx-auto">
        Cuando se configure el módulo completo, los silos aparecerán aquí con sus lecturas en tiempo real.
      </p>
    </div>
  )
}
