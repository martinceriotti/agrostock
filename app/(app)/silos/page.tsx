'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSilos, useSiloAlerts, useSiloReadings, useCreateSilo, type Silo } from '@/lib/hooks/use-silos'
import {
  Database, Thermometer, Droplets, AlertTriangle, CheckCircle2,
  WifiOff, MapPin, Wheat, Plus, Clock, Copy, Check, KeyRound, Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'

// ── Constantes ────────────────────────────────────────────────
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

// ── Schema del formulario ─────────────────────────────────────
const siloSchema = z.object({
  name:          z.string().min(1, 'Nombre requerido'),
  field_name:    z.string().optional(),
  crop:          z.string().optional(),
  capacity_tons: z.number().positive('Debe ser mayor a 0').optional(),
  fill_date:     z.string().optional(),
  status:        z.enum(['active', 'empty', 'closed']),
  notes:         z.string().optional(),
})
type SiloFormData = z.infer<typeof siloSchema>

// ── Componente copiar al portapapeles ─────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="ml-2 rounded p-1 text-gray-400 hover:text-gray-700 transition-colors"
      title="Copiar"
    >
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

// ── Dialog: API key tras crear silo ──────────────────────────
function ApiKeyStep({ silo, onClose }: { silo: Silo; onClose: () => void }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-green-700">
        <CheckCircle2 className="h-5 w-5" />
        <p className="font-semibold">Silo creado correctamente</p>
      </div>

      <div className="rounded-lg border-2 border-amber-200 bg-amber-50 px-4 py-4 space-y-3">
        <div className="flex items-center gap-2 text-amber-800">
          <KeyRound className="h-4 w-4 shrink-0" />
          <p className="text-sm font-semibold">API key del silo — guardala ahora</p>
        </div>
        <p className="text-xs text-amber-700">
          Esta clave autentica al dispositivo IoT. La podés ver siempre desde la tarjeta del silo,
          pero es conveniente copiarla ahora para configurar el gateway.
        </p>
        <div className="flex items-center gap-1 rounded bg-white border border-amber-200 px-3 py-2">
          <code className="text-xs font-mono break-all text-gray-800 flex-1">{silo.api_key}</code>
          <CopyButton text={silo.api_key} />
        </div>
      </div>

      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3 space-y-1">
        <p className="font-medium text-gray-700">Uso en curl / gateway:</p>
        <code className="text-xs text-gray-600 block">
          Authorization: Bearer {silo.api_key.slice(0, 20)}…
        </code>
      </div>

      <div className="flex justify-end">
        <Button onClick={onClose} className="bg-green-700 hover:bg-green-800">
          Listo
        </Button>
      </div>
    </div>
  )
}

// ── Dialog: Crear silo ────────────────────────────────────────
function CreateSiloDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [createdSilo, setCreatedSilo] = useState<Silo | null>(null)
  const createSilo = useCreateSilo()

  const form = useForm<SiloFormData>({
    resolver: zodResolver(siloSchema),
    defaultValues: { status: 'active' },
  })

  function onSubmit(data: SiloFormData) {
    const clean = {
      ...data,
      capacity_tons: isNaN(data.capacity_tons as number) ? null : (data.capacity_tons ?? null),
      field_name:    data.field_name    || null,
      crop:          data.crop          || null,
      fill_date:     data.fill_date     || null,
      notes:         data.notes         || null,
      empty_date:    null,
      latitude:      null,
      longitude:     null,
    }
    createSilo.mutate(clean, {
      onSuccess: (silo) => setCreatedSilo(silo as Silo),
    })
  }

  function handleClose() {
    setCreatedSilo(null)
    form.reset({ status: 'active' })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {createdSilo ? 'Silo creado' : 'Nuevo Silo Bolsa'}
          </DialogTitle>
        </DialogHeader>

        {createdSilo ? (
          <ApiKeyStep silo={createdSilo} onClose={handleClose} />
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-1">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input {...form.register('name')} placeholder="Bolsa 1 - Lote Norte" autoFocus />
              {form.formState.errors.name && (
                <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
              )}
            </div>

            {/* Campo y cultivo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Campo / lote</Label>
                <Input {...form.register('field_name')} placeholder="La Esperanza" />
              </div>
              <div className="space-y-1.5">
                <Label>Cultivo</Label>
                <Input {...form.register('crop')} placeholder="Soja, Maíz…" />
              </div>
            </div>

            {/* Capacidad y fecha llenado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Capacidad (ton)</Label>
                <Input
                  type="number"
                  step="0.1"
                  placeholder="180"
                  {...form.register('capacity_tons', { valueAsNumber: true })}
                />
                {form.formState.errors.capacity_tons && (
                  <p className="text-xs text-red-500">{form.formState.errors.capacity_tons.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Fecha de llenado</Label>
                <Input type="date" {...form.register('fill_date')} />
              </div>
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select
                value={form.watch('status')}
                onValueChange={(v) => form.setValue('status', v as SiloFormData['status'])}
                items={{ active: 'Activo', empty: 'Vacío', closed: 'Cerrado' }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="empty">Vacío</SelectItem>
                  <SelectItem value="closed">Cerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Notas */}
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Input {...form.register('notes')} placeholder="Observaciones opcionales" />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button
                type="submit"
                disabled={createSilo.isPending}
                className="bg-green-700 hover:bg-green-800 gap-2"
              >
                {createSilo.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Creando…</>
                  : 'Crear silo'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Página principal ──────────────────────────────────────────
export default function SilosPage() {
  const { data: silos = [], isLoading } = useSilos()
  const [showCreate, setShowCreate] = useState(false)
  const activeSilos = silos.filter(s => s.status === 'active')

  return (
    <div>
      <PageHeader
        title="Silos Bolsa"
        description="Monitoreo de temperatura, humedad y CO₂ por silo"
        action={
          <Button
            size="sm"
            className="gap-2 bg-green-700 hover:bg-green-800"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="h-4 w-4" />
            Nuevo Silo
          </Button>
        }
      />

      <CreateSiloDialog open={showCreate} onClose={() => setShowCreate(false)} />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : silos.length === 0 ? (
        <EmptyState onNew={() => setShowCreate(true)} />
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <KPITile label="Activos"        value={activeSilos.length}                                                               icon={CheckCircle2} color="text-green-600" bg="bg-green-50" />
            <KPITile label="Total bolsas"   value={silos.length}                                                                     icon={Database}     color="text-blue-600"  bg="bg-blue-50"  />
            <KPITile label="Capacidad (ton)" value={silos.reduce((s, x) => s + (x.capacity_tons ?? 0), 0).toLocaleString('es-AR', { maximumFractionDigits: 0 })} icon={Wheat} color="text-amber-600" bg="bg-amber-50" />
            <KPITile label="Cerrados"       value={silos.filter(s => s.status === 'closed').length}                                  icon={WifiOff}      color="text-gray-500"  bg="bg-gray-50"  />
          </div>

          {/* Lista */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {silos.map(silo => <SiloCard key={silo.id} silo={silo} />)}
          </div>
        </>
      )}
    </div>
  )
}

// ── Tarjeta de silo ───────────────────────────────────────────
function SiloCard({ silo }: { silo: Silo }) {
  const { data: alerts  = [] } = useSiloAlerts(silo.id)
  const { data: readings = [] } = useSiloReadings(silo.id, 1)
  const [showKey, setShowKey] = useState(false)
  const latest    = readings[0] ?? null
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

        {/* Lecturas */}
        <div className="flex gap-4 py-2 border-t border-gray-100">
          <ReadingValue icon={Thermometer} value={latest?.temperature_c} unit="°C" alert={latest?.temperature_c != null && latest.temperature_c > 35} />
          <ReadingValue icon={Droplets}    value={latest?.humidity_pct}  unit="%" alert={latest?.humidity_pct  != null && latest.humidity_pct  > 14} />
        </div>
        {latest && (
          <div className="flex items-center gap-1 text-xs text-gray-400 -mt-1 mb-2">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(latest.recorded_at), { addSuffix: true, locale: es })}
          </div>
        )}

        {/* Alertas activas */}
        {hasAlerts && (
          <div className="flex items-center gap-1.5 text-xs text-red-600 mb-2">
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>{alerts.length} alerta{alerts.length > 1 ? 's' : ''} activa{alerts.length > 1 ? 's' : ''}</span>
          </div>
        )}

        {/* API key */}
        <div className="pt-2 border-t border-gray-100">
          {showKey ? (
            <div className="flex items-center gap-1">
              <code className="text-xs font-mono text-gray-600 break-all flex-1">{silo.api_key}</code>
              <CopyButton text={silo.api_key} />
            </div>
          ) : (
            <button
              onClick={() => setShowKey(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <KeyRound className="h-3 w-3" />
              Ver API key
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function ReadingValue({ icon: Icon, value, unit, alert }: {
  icon: React.ElementType; value: number | null | undefined; unit: string; alert?: boolean
}) {
  const hasValue = value != null
  return (
    <div className={`flex items-center gap-1.5 ${hasValue ? (alert ? 'text-red-600' : 'text-gray-700') : 'text-gray-400'}`}>
      <Icon className="h-3.5 w-3.5" />
      <span className={`text-sm font-semibold ${!hasValue ? 'text-gray-300' : ''}`}>
        {hasValue ? `${value!.toFixed(1)}${unit}` : `—${unit}`}
      </span>
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

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="text-center py-20 text-gray-400">
      <Database className="h-14 w-14 mx-auto mb-4 opacity-20" />
      <p className="font-medium text-gray-500">Sin silos registrados</p>
      <p className="text-sm mt-1 mb-6 max-w-sm mx-auto">
        Creá el primer silo para empezar a recibir lecturas IoT.
      </p>
      <Button onClick={onNew} className="bg-green-700 hover:bg-green-800 gap-2">
        <Plus className="h-4 w-4" /> Nuevo Silo
      </Button>
    </div>
  )
}
