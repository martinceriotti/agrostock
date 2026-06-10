'use client'

import { use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useApplication, useExecuteApplication, useUpdateApplicationStatus } from '@/lib/hooks/use-applications'
import { useUser } from '@/lib/hooks/use-user'
import { useOrganization } from '@/lib/hooks/use-organization'
import { PageHeader } from '@/components/ui/page-header'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Printer, Play, Send, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

const statusConfig = {
  draft: { label: 'Borrador', class: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Enviada', class: 'bg-blue-100 text-blue-700' },
  sent_engineer: { label: 'Pendiente aprobación', class: 'bg-amber-100 text-amber-700' },
  executed: { label: 'Ejecutada', class: 'bg-green-100 text-green-700' },
}

export default function ApplicationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: app, isLoading } = useApplication(id)
  const { data: user } = useUser()
  const { data: org } = useOrganization()
  const executeApp = useExecuteApplication()
  const updateStatus = useUpdateApplicationStatus()

  const canManage = user?.role === 'admin' || user?.role === 'manager'
  const isMyDraft = user?.role === 'engineer' && app?.order_status === 'draft' && app?.created_by === user.id

  if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando...</div>
  if (!app) return <div className="p-8 text-center text-gray-500">Orden no encontrada</div>

  const statusKey = app.order_status === 'sent' && user?.role === 'engineer' ? 'sent_engineer' : app.order_status
  const statusInfo = statusConfig[statusKey as keyof typeof statusConfig] ?? statusConfig.draft

  async function handleExecute() {
    if (!user?.organization_id) return
    await executeApp.mutateAsync({
      applicationId: id,
      userId: user.id,
      orgId: user.organization_id,
    })
  }

  async function handleMarkSent() {
    await updateStatus.mutateAsync({ id, status: 'sent' })
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/applications" className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2 mb-2 -ml-2')}>
          <ArrowLeft className="h-4 w-4" />Volver
        </Link>
        <div className="flex items-start justify-between gap-3">
          <PageHeader title={`Orden: ${app.field_name}`} />
          <Badge className={cn('shrink-0 mt-1', statusInfo.class)}>{statusInfo.label}</Badge>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          {format(new Date(app.application_date), "d 'de' MMMM 'de' yyyy", { locale: es })}
          {app.profiles && ` · ${app.profiles.full_name}`}
        </p>
      </div>

      {/* Acciones */}
      {(canManage || app.order_status !== 'executed') && (
        <div className="flex flex-wrap gap-2 mb-6">
          <Link
            href={`/applications/${id}/print`}
            target="_blank"
            className={cn(buttonVariants({ variant: 'outline' }), 'gap-2')}
          >
            <Printer className="h-4 w-4" />Imprimir / PDF
          </Link>

          {canManage && app.order_status === 'draft' && (
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleMarkSent}
              disabled={updateStatus.isPending}
            >
              <Send className="h-4 w-4" />Marcar como enviada
            </Button>
          )}

          {isMyDraft && (
            <Button
              variant="outline"
              className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={handleMarkSent}
              disabled={updateStatus.isPending}
            >
              <Send className="h-4 w-4" />Enviar para aprobación
            </Button>
          )}

          {canManage && app.order_status !== 'executed' && (
            <Button
              className="gap-2 bg-green-700 hover:bg-green-800"
              onClick={handleExecute}
              disabled={executeApp.isPending}
            >
              {executeApp.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" />Ejecutando...</>
              ) : (
                <><Play className="h-4 w-4" />Ejecutar y descontar stock</>
              )}
            </Button>
          )}
        </div>
      )}

      {/* Datos de la orden */}
      <div className="space-y-4">
        {/* Lote y cultivo */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Datos del lote</CardTitle></CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
            <Detail label="Lote / Campo" value={app.field_name} />
            <Detail label="Fecha" value={format(new Date(app.application_date), "dd/MM/yyyy")} />
            {app.crop && <Detail label="Cultivo" value={app.crop} />}
            {app.crop_variety && <Detail label="Variedad" value={app.crop_variety} />}
            {app.cycle && <Detail label="Ciclo" value={app.cycle} />}
            {app.area_ha && <Detail label="Superficie" value={`${app.area_ha} ha`} />}
            {(app.latitude != null && app.longitude != null) && (
              <Detail label="Coordenadas" value={`${app.latitude}, ${app.longitude}`} />
            )}
          </CardContent>
        </Card>

        {/* Destinatario */}
        {(app.client_name || app.contractor || app.machine) && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Destinatario</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
              {app.client_name && <Detail label="Productor" value={app.client_name} />}
              {app.client_email && <Detail label="Email" value={app.client_email} />}
              {app.contractor && <Detail label="Contratista" value={app.contractor} />}
              {app.machine && <Detail label="Máquina" value={app.machine} />}
            </CardContent>
          </Card>
        )}

        {/* Condiciones */}
        {(app.nozzle_type || app.application_rate_lha || app.min_humidity || app.max_temperature || app.max_wind_speed) && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Condiciones de aplicación</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
              {app.nozzle_type && <Detail label="Pastilla" value={app.nozzle_type} />}
              {app.application_rate_lha && <Detail label="Tasa" value={`${app.application_rate_lha} L/ha`} />}
              {app.min_humidity && <Detail label="HR mínima" value={`> ${app.min_humidity}%`} />}
              {app.max_temperature && <Detail label="Temperatura máx." value={`< ${app.max_temperature}°C`} />}
              {app.max_wind_speed && <Detail label="Viento máx." value={`< ${app.max_wind_speed} km/h`} />}
              {app.wind_direction && <Detail label="Dirección viento" value={app.wind_direction} />}
              {app.withholding_period && <Detail label="Carencia" value={app.withholding_period} />}
            </CardContent>
          </Card>
        )}

        {/* Insumos */}
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Insumos</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Producto</th>
                    <th className="pb-2 pr-4 font-medium">Ingrediente activo</th>
                    <th className="pb-2 pr-4 font-medium text-right">Dosis/ha</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {app.field_application_items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-4 font-medium">
                        {item.products?.name}
                        {item.warehouses && (
                          <span className="block text-xs text-gray-400">{item.warehouses.name}</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-gray-500 text-xs">
                        {item.products?.active_ingredient ?? '—'}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {item.dose_per_ha ? `${item.dose_per_ha} ${item.products?.unit}/ha` : '—'}
                      </td>
                      <td className="py-2 text-right font-medium">
                        {item.quantity_used} {item.products?.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {app.notes && (
          <Card>
            <CardHeader><CardTitle className="text-sm font-medium text-gray-600">Observaciones</CardTitle></CardHeader>
            <CardContent className="text-sm text-gray-700">{app.notes}</CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}
