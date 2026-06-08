'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { PageHeader } from '@/components/ui/page-header'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/ui/data-table'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Search } from 'lucide-react'

interface ActivityLog {
  id: string
  action: string
  entity_type: string | null
  entity_name: string | null
  details: Record<string, unknown> | null
  created_at: string
  profiles: { full_name: string } | null
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create_application:  { label: 'Creó orden de aplicación', color: 'bg-blue-100 text-blue-700' },
  execute_application: { label: 'Ejecutó aplicación',        color: 'bg-green-100 text-green-700' },
  send_application:    { label: 'Envió orden al cliente',     color: 'bg-cyan-100 text-cyan-700' },
  create_order:        { label: 'Creó orden de compra',       color: 'bg-purple-100 text-purple-700' },
  receive_order:       { label: 'Registró recepción',         color: 'bg-emerald-100 text-emerald-700' },
  cancel_order:        { label: 'Canceló orden',              color: 'bg-red-100 text-red-700' },
  create_product:      { label: 'Agregó producto',            color: 'bg-amber-100 text-amber-700' },
  create_user:         { label: 'Creó usuario',               color: 'bg-indigo-100 text-indigo-700' },
  delete_user:         { label: 'Eliminó usuario',            color: 'bg-rose-100 text-rose-700' },
  update_user_role:    { label: 'Cambió rol de usuario',      color: 'bg-orange-100 text-orange-700' },
}

export default function ActivityPage() {
  const supabase = createClient()
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['activity-logs'],
    queryFn: async (): Promise<ActivityLog[]> => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      return (data ?? []) as unknown as ActivityLog[]
    },
    refetchInterval: 30_000,
  })

  const uniqueActions = useMemo(() => [...new Set(logs.map(l => l.action))], [logs])

  const filtered = useMemo(() => {
    return logs.filter(log => {
      if (actionFilter !== 'all' && log.action !== actionFilter) return false
      if (search) {
        const q = search.toLowerCase()
        const name = log.profiles?.full_name?.toLowerCase() ?? ''
        const entity = log.entity_name?.toLowerCase() ?? ''
        if (!name.includes(q) && !entity.includes(q)) return false
      }
      return true
    })
  }, [logs, actionFilter, search])

  const actionItems = useMemo(() => {
    const items: Record<string, string> = { all: 'Todas las acciones' }
    uniqueActions.forEach(a => { items[a] = ACTION_LABELS[a]?.label ?? a })
    return items
  }, [uniqueActions])

  return (
    <div>
      <PageHeader
        title="Actividad de Usuarios"
        description="Historial de acciones realizadas por cada miembro del equipo"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por usuario o entidad..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={actionFilter}
          onValueChange={(v) => setActionFilter(v ?? 'all')}
          items={actionItems}
        >
          <SelectTrigger className="sm:w-56">
            <SelectValue placeholder="Todas las acciones" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las acciones</SelectItem>
            {uniqueActions.map(a => (
              <SelectItem key={a} value={a}>{ACTION_LABELS[a]?.label ?? a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage="No hay actividad registrada"
        columns={[
          {
            key: 'date',
            header: 'Fecha y hora',
            className: 'w-40',
            cell: (row) => (
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {format(new Date(row.created_at), "dd MMM · HH:mm", { locale: es })}
              </span>
            ),
          },
          {
            key: 'user',
            header: 'Usuario',
            className: 'w-40',
            cell: (row) => (
              <span className="text-sm font-medium">{row.profiles?.full_name ?? '—'}</span>
            ),
          },
          {
            key: 'action',
            header: 'Acción',
            cell: (row) => {
              const cfg = ACTION_LABELS[row.action]
              return (
                <Badge className={`text-xs font-medium ${cfg?.color ?? 'bg-gray-100 text-gray-600'}`}>
                  {cfg?.label ?? row.action}
                </Badge>
              )
            },
          },
          {
            key: 'entity',
            header: 'Referencia',
            cell: (row) => (
              <span className="text-sm text-gray-600">{row.entity_name ?? '—'}</span>
            ),
          },
        ]}
      />
    </div>
  )
}
