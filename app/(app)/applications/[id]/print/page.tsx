'use client'

import { use } from 'react'
import { useApplication } from '@/lib/hooks/use-applications'
import { useOrganization } from '@/lib/hooks/use-organization'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Loader2, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PrintApplicationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data: app, isLoading } = useApplication(id)
  const { data: org } = useOrganization()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!app) return <div className="p-8 text-center">Orden no encontrada</div>

  return (
    <>
      {/* Botón imprimir — se oculta al imprimir */}
      <div className="print:hidden fixed top-4 right-4 z-10">
        <Button onClick={() => window.print()} className="gap-2 bg-green-700 hover:bg-green-800">
          <Printer className="h-4 w-4" />Imprimir / Guardar PDF
        </Button>
      </div>

      <div className="max-w-[800px] mx-auto p-8 print:p-6 font-sans text-sm text-gray-900">

        {/* Encabezado */}
        <div className="flex items-start justify-between mb-6 border-b-2 border-green-700 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-green-700">Orden de Aplicación</h1>
            <p className="text-gray-500 mt-0.5">
              Emitida: {format(new Date(app.created_at), "dd/MM/yyyy HH:mm")}
            </p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{org?.name ?? ''}</p>
            {org?.cuit && <p className="text-gray-500">CUIT: {org.cuit}</p>}
            {org?.address && <p className="text-gray-500">{org.address}</p>}
            {org?.contact_email && <p className="text-gray-500">{org.contact_email}</p>}
          </div>
        </div>

        {/* Condiciones generales */}
        <section className="mb-6">
          <h2 className="text-base font-semibold text-green-700 border-b border-green-200 pb-1 mb-3">
            Condiciones
          </h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            <Row label="Lote / Campo" value={app.field_name} />
            <Row label="Fecha de emisión" value={format(new Date(app.application_date), "dd/MM/yyyy")} />
            {app.crop && <Row label="Cultivo" value={app.crop} />}
            {app.crop_variety && <Row label="Variedad / Híbrido" value={app.crop_variety} />}
            {app.cycle && <Row label="Ciclo" value={app.cycle} />}
            {app.area_ha && <Row label="Área" value={`${app.area_ha} ha`} />}
            {app.client_name && <Row label="Productor" value={app.client_name} />}
            {app.contractor && <Row label="Contratista" value={app.contractor} />}
            {app.machine && <Row label="Máquina" value={app.machine} />}
            {app.nozzle_type && <Row label="Pastilla" value={app.nozzle_type} />}
            {app.application_rate_lha && <Row label="Tasa" value={`${app.application_rate_lha} L/ha`} />}
            {app.min_humidity != null && <Row label="Humedad relativa mayor a" value={`${app.min_humidity} %`} />}
            {app.max_temperature != null && <Row label="Temperatura menor que" value={`${app.max_temperature} °C`} />}
            {app.max_wind_speed != null && <Row label="Velocidad viento menor que" value={`${app.max_wind_speed} km/h`} />}
            {app.wind_direction && <Row label="Dirección viento" value={app.wind_direction} />}
            {app.withholding_period && <Row label="Carencia" value={app.withholding_period} />}
            <Row label="Usuario" value={app.profiles?.full_name ?? ''} />
          </div>
        </section>

        {/* Lotes */}
        {(app.crop || app.area_ha) && (
          <section className="mb-6">
            <h2 className="text-base font-semibold text-green-700 border-b border-green-200 pb-1 mb-3">
              Lotes
            </h2>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium">Lote</th>
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium">Cultivo</th>
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium">Variedad / Híbrido</th>
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium">Ciclo</th>
                  <th className="border border-gray-200 px-3 py-2 text-right font-medium">Área</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-200 px-3 py-2">{app.field_name}</td>
                  <td className="border border-gray-200 px-3 py-2">{app.crop ?? ''}</td>
                  <td className="border border-gray-200 px-3 py-2">{app.crop_variety ?? ''}</td>
                  <td className="border border-gray-200 px-3 py-2">{app.cycle ?? ''}</td>
                  <td className="border border-gray-200 px-3 py-2 text-right">{app.area_ha ? `${app.area_ha} ha` : ''}</td>
                </tr>
              </tbody>
            </table>
          </section>
        )}

        {/* Insumos */}
        <section className="mb-6">
          <h2 className="text-base font-semibold text-green-700 border-b border-green-200 pb-1 mb-3">
            Insumo
          </h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left font-medium">Nombre Comercial</th>
                <th className="border border-gray-200 px-3 py-2 text-left font-medium">Ingrediente activo</th>
                <th className="border border-gray-200 px-3 py-2 text-right font-medium">Dosis/ha</th>
                <th className="border border-gray-200 px-3 py-2 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {app.field_application_items.map((item) => (
                <tr key={item.id}>
                  <td className="border border-gray-200 px-3 py-2 font-medium">
                    {item.products?.name}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-gray-600">
                    {item.products?.active_ingredient ?? '—'}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right">
                    {item.dose_per_ha != null
                      ? `${item.dose_per_ha} ${item.products?.unit}/ha`
                      : '—'}
                  </td>
                  <td className="border border-gray-200 px-3 py-2 text-right font-medium">
                    {item.quantity_used} {item.products?.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Observaciones */}
        {app.notes && (
          <section className="mb-6">
            <h2 className="text-base font-semibold text-green-700 border-b border-green-200 pb-1 mb-3">
              Observación
            </h2>
            <p className="text-gray-700">{app.notes}</p>
          </section>
        )}

        {/* Firma */}
        <div className="mt-16 grid grid-cols-2 gap-16 print:mt-20">
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              <p className="text-gray-500 text-xs">Firma Ingeniero / Asesor</p>
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-gray-400 pt-2">
              <p className="text-gray-500 text-xs">Firma Contratista / Responsable</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { background: white; }
          @page { margin: 1.5cm; size: A4; }
        }
      `}</style>
    </>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="font-medium text-gray-600 whitespace-nowrap">{label}:</span>
      <span>{value}</span>
    </div>
  )
}
