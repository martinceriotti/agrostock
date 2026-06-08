'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export type Silo = {
  id: string
  organization_id: string
  name: string
  field_name: string | null
  crop: string | null
  capacity_tons: number | null
  fill_date: string | null
  empty_date: string | null
  latitude: number | null
  longitude: number | null
  status: 'active' | 'empty' | 'closed'
  notes: string | null
  api_key: string
  created_at: string
}

export type SiloSensor = {
  id: string
  silo_id: string
  label: string
  position_m: number | null
  active: boolean
}

export type SiloReading = {
  id: string
  silo_id: string
  sensor_id: string | null
  recorded_at: string
  temperature_c: number | null
  humidity_pct: number | null
  co2_ppm: number | null
  battery_pct: number | null
  silo_sensors: { label: string; position_m: number | null } | null
}

export type SiloAlert = {
  id: string
  silo_id: string
  sensor_id: string | null
  alert_type: 'high_temperature' | 'high_humidity' | 'high_co2' | 'low_battery'
  value: number
  threshold: number
  triggered_at: string
  resolved_at: string | null
  acknowledged_at: string | null
}

// ── Lista de silos ────────────────────────────────────────────
export function useSilos() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['silos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('silos')
        .select('*')
        .order('name')
      if (error) throw error
      return (data ?? []) as unknown as Silo[]
    },
  })
}

// ── Lecturas recientes de un silo (últimas N) ─────────────────
export function useSiloReadings(siloId: string, limit = 100) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['silo-readings', siloId, limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('silo_readings')
        .select('*, silo_sensors:sensor_id(label, position_m)')
        .eq('silo_id', siloId)
        .order('recorded_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return (data ?? []) as unknown as SiloReading[]
    },
    enabled: !!siloId,
    refetchInterval: 60_000, // refresca cada 60s
  })
}

// ── Alertas activas de un silo ────────────────────────────────
export function useSiloAlerts(siloId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['silo-alerts', siloId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('silo_alerts')
        .select('*')
        .eq('silo_id', siloId)
        .is('resolved_at', null)
        .order('triggered_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as SiloAlert[]
    },
    enabled: !!siloId,
    refetchInterval: 30_000,
  })
}

// ── Sensores de un silo ───────────────────────────────────────
export function useSiloSensors(siloId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['silo-sensors', siloId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('silo_sensors')
        .select('*')
        .eq('silo_id', siloId)
        .eq('active', true)
        .order('position_m')
      if (error) throw error
      return (data ?? []) as unknown as SiloSensor[]
    },
    enabled: !!siloId,
  })
}

// ── Crear silo ────────────────────────────────────────────────
export function useCreateSilo() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Silo, 'id' | 'organization_id' | 'api_key' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('silos')
        .insert(values)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['silos'] })
      toast.success('Silo creado correctamente')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Actualizar estado del silo ────────────────────────────────
export function useUpdateSiloStatus() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Silo['status'] }) => {
      const { error } = await supabase
        .from('silos')
        .update({ status })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['silos'] })
      toast.success('Estado actualizado')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}

// ── Reconocer alerta ──────────────────────────────────────────
export function useAcknowledgeAlert() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('silo_alerts')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', alertId)
      if (error) throw error
    },
    onSuccess: (_data, alertId) => {
      qc.invalidateQueries({ queryKey: ['silo-alerts'] })
      toast.success('Alerta reconocida')
    },
    onError: (e: Error) => toast.error(e.message),
  })
}
