'use client'

import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { fieldApplicationSchema, type FieldApplicationFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useProducts, useWarehouses } from '@/lib/hooks/use-products'
import { useCurrentStock } from '@/lib/hooks/use-stock'
import { useCreateApplication } from '@/lib/hooks/use-applications'
import { useUser } from '@/lib/hooks/use-user'
import { PageHeader } from '@/components/ui/page-header'
import { Plus, Trash2, Loader2, ArrowLeft, AlertTriangle, LocateFixed } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'

export default function NewApplicationPage() {
  const router = useRouter()
  const { data: user } = useUser()
  const { data: products = [] } = useProducts()
  const { data: warehouses = [] } = useWarehouses()
  const { data: stockData = [] } = useCurrentStock()
  const createApplication = useCreateApplication()

  const form = useForm<FieldApplicationFormData>({
    resolver: zodResolver(fieldApplicationSchema),
    defaultValues: {
      field_name: '',
      application_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      crop: '',
      crop_variety: '',
      cycle: '',
      area_ha: null,
      client_name: '',
      client_email: '',
      contractor: '',
      machine: '',
      nozzle_type: '',
      application_rate_lha: null,
      min_humidity: null,
      max_temperature: null,
      max_wind_speed: null,
      wind_direction: '',
      withholding_period: '',
      latitude: null,
      longitude: null,
      items: [{ product_id: '', warehouse_id: '', dose_per_ha: null, quantity_used: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'items' })
  const areaHa = form.watch('area_ha')

  function detectLocation() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        form.setValue('latitude', parseFloat(pos.coords.latitude.toFixed(6)))
        form.setValue('longitude', parseFloat(pos.coords.longitude.toFixed(6)))
      },
      () => {},
    )
  }

  function getAvailableStock(productId: string, warehouseId: string) {
    if (!productId || !warehouseId) return null
    const entry = stockData.find(s => s.product_id === productId && s.warehouse_id === warehouseId)
    return entry?.quantity ?? 0
  }

  function handleDoseChange(index: number, dose: number) {
    if (areaHa && dose > 0) {
      form.setValue(`items.${index}.quantity_used`, Number((dose * areaHa).toFixed(3)))
    }
  }

  async function onSubmit(data: FieldApplicationFormData) {
    if (!user?.organization_id) return

    await createApplication.mutateAsync({
      values: data,
      userId: user.id,
      orgId: user.organization_id,
    })
    router.push('/applications')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <Link href="/applications" className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2 mb-2 -ml-2')}>
          <ArrowLeft className="h-4 w-4" />Volver
        </Link>
        <PageHeader title="Nueva Orden de Aplicación" />
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* Datos del lote */}
        <Card>
          <CardHeader><CardTitle className="text-base">Datos del lote</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="field_name">Lote / campo *</Label>
              <Input id="field_name" {...form.register('field_name')} placeholder="Ej: Garnero 38" />
              {form.formState.errors.field_name && (
                <p className="text-xs text-red-500">{form.formState.errors.field_name.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="application_date">Fecha *</Label>
              <Input id="application_date" type="date" {...form.register('application_date')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crop">Cultivo</Label>
              <Input id="crop" {...form.register('crop')} placeholder="Ej: Trigo, Soja, Maíz" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="crop_variety">Variedad / Híbrido</Label>
              <Input id="crop_variety" {...form.register('crop_variety')} placeholder="Ej: DM 4615" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cycle">Ciclo</Label>
              <Input id="cycle" {...form.register('cycle')} placeholder="Ej: 2026/2027" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="area_ha">Superficie (ha)</Label>
              <Input
                id="area_ha"
                type="number"
                step="0.1"
                min="0"
                {...form.register('area_ha', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                placeholder="Ej: 38"
              />
            </div>
          </CardContent>
        </Card>

        {/* Destinatario */}
        <Card>
          <CardHeader><CardTitle className="text-base">Destinatario</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="client_name">Nombre / Productor</Label>
              <Input id="client_name" {...form.register('client_name')} placeholder="Nombre del productor" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="client_email">Email</Label>
              <Input id="client_email" type="email" {...form.register('client_email')} placeholder="Para enviar la orden" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contractor">Contratista</Label>
              <Input id="contractor" {...form.register('contractor')} placeholder="Nombre del contratista" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="machine">Máquina</Label>
              <Input id="machine" {...form.register('machine')} placeholder="Ej: Pulverizadora John Deere" />
            </div>
          </CardContent>
        </Card>

        {/* Condiciones de aplicación */}
        <Card>
          <CardHeader><CardTitle className="text-base">Condiciones de aplicación</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="nozzle_type">Pastilla</Label>
              <Input id="nozzle_type" {...form.register('nozzle_type')} placeholder="Ej: Cono hueco" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="application_rate_lha">Tasa (L/ha)</Label>
              <Input
                id="application_rate_lha"
                type="number"
                step="1"
                {...form.register('application_rate_lha', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                placeholder="Ej: 70"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="min_humidity">HR mínima (%)</Label>
              <Input
                id="min_humidity"
                type="number"
                {...form.register('min_humidity', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                placeholder="Ej: 50"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max_temperature">Temperatura máx. (°C)</Label>
              <Input
                id="max_temperature"
                type="number"
                {...form.register('max_temperature', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                placeholder="Ej: 30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="max_wind_speed">Viento máx. (km/h)</Label>
              <Input
                id="max_wind_speed"
                type="number"
                {...form.register('max_wind_speed', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
                placeholder="Ej: 10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wind_direction">Dirección del viento</Label>
              <Input id="wind_direction" {...form.register('wind_direction')} placeholder="Ej: Norte" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
              <Label htmlFor="withholding_period">Carencia</Label>
              <Input id="withholding_period" {...form.register('withholding_period')} placeholder="Ej: 21 días" />
            </div>
          </CardContent>
        </Card>

        {/* Coordenadas del lote */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Coordenadas del lote</CardTitle>
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={detectLocation}>
                <LocateFixed className="h-4 w-4" />
                Detectar ubicación
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="latitude">Latitud</Label>
              <Input
                id="latitude"
                type="number"
                step="0.000001"
                min="-90"
                max="90"
                placeholder="Ej: -34.603722"
                {...form.register('latitude', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="longitude">Longitud</Label>
              <Input
                id="longitude"
                type="number"
                step="0.000001"
                min="-180"
                max="180"
                placeholder="Ej: -58.381592"
                {...form.register('longitude', { valueAsNumber: true, setValueAs: v => v === '' ? null : Number(v) })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Insumos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Insumos</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => append({ product_id: '', warehouse_id: '', dose_per_ha: null, quantity_used: 0 })}
            >
              <Plus className="h-4 w-4" />Agregar
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.formState.errors.root && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                {form.formState.errors.root.message}
              </div>
            )}

            {fields.map((field, index) => {
              const productId = form.watch(`items.${index}.product_id`)
              const warehouseId = form.watch(`items.${index}.warehouse_id`)
              const availableStock = getAvailableStock(productId, warehouseId)
              const selectedProduct = products.find(p => p.id === productId)

              return (
                <div key={field.id} className="p-3 bg-gray-50 rounded-lg border space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Producto *</Label>
                      <Select
                        value={form.watch(`items.${index}.product_id`)}
                        onValueChange={(v) => form.setValue(`items.${index}.product_id`, v ?? '')}
                        items={products.map(p => ({ value: p.id, label: `${p.name}${p.brand ? ` — ${p.brand}` : ''} (${p.unit})` }))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Seleccionar producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}{p.brand ? ` — ${p.brand}` : ''} ({p.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Depósito origen *</Label>
                      <Select
                        value={form.watch(`items.${index}.warehouse_id`)}
                        onValueChange={(v) => form.setValue(`items.${index}.warehouse_id`, v ?? '')}
                        items={warehouses.map(w => ({ value: w.id, label: w.name }))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Depósito" />
                        </SelectTrigger>
                        <SelectContent>
                          {warehouses.map((w) => (
                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 items-end">
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Dosis/ha {selectedProduct ? `(${selectedProduct.unit}/ha)` : ''}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.001"
                        className="bg-white"
                        placeholder="Ej: 1.8"
                        {...form.register(`items.${index}.dose_per_ha`, {
                          valueAsNumber: true,
                          setValueAs: v => v === '' ? null : Number(v),
                          onChange: (e) => handleDoseChange(index, Number(e.target.value)),
                        })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">
                        Total {selectedProduct ? `(${selectedProduct.unit})` : ''}
                        {areaHa ? ` — ${areaHa} ha` : ''}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="bg-white"
                        {...form.register(`items.${index}.quantity_used`, { valueAsNumber: true })}
                      />
                      {availableStock !== null && (
                        <p className={`text-xs ${availableStock === 0 ? 'text-red-500' : 'text-gray-500'}`}>
                          Stock disponible: {availableStock} {selectedProduct?.unit}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />Quitar
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Notas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Observaciones</CardTitle></CardHeader>
          <CardContent>
            <Textarea {...form.register('notes')} rows={2} placeholder="Observaciones adicionales..." />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/applications" className={cn(buttonVariants({ variant: 'outline' }))}>
            Cancelar
          </Link>
          <Button type="submit" disabled={createApplication.isPending} className="bg-green-700 hover:bg-green-800">
            {createApplication.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Guardando...</>
            ) : 'Guardar orden (borrador)'}
          </Button>
        </div>
      </form>
    </div>
  )
}
