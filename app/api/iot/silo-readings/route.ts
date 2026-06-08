import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente con service_role para saltear RLS — solo se usa en este endpoint server-side
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(url, key)
}

export interface SiloReadingPayload {
  sensor_id?: string          // UUID del sensor (si el gateway lo conoce)
  recorded_at?: string        // ISO 8601 — si no viene, se usa NOW()
  temperature_c?: number
  humidity_pct?: number
  co2_ppm?: number
  battery_pct?: number
  [key: string]: unknown      // campos extra que guarda raw_payload
}

/**
 * POST /api/iot/silo-readings
 *
 * Autenticación: Authorization: Bearer <silo.api_key>
 *
 * Body (JSON):
 * {
 *   "sensor_id": "uuid-opcional",
 *   "recorded_at": "2025-06-08T14:00:00Z",  // opcional
 *   "temperature_c": 28.4,
 *   "humidity_pct": 13.2,
 *   "co2_ppm": 1200,
 *   "battery_pct": 85
 * }
 *
 * También acepta un array de lecturas para envío en lote:
 * [{ ... }, { ... }]
 *
 * Respuesta 200: { inserted: N, alerts: [...] }
 * Respuesta 401: api_key inválida
 * Respuesta 400: payload inválido
 */
export async function POST(request: NextRequest) {
  // 1. Autenticación por API key
  const auth = request.headers.get('authorization') ?? ''
  const apiKey = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''

  if (!apiKey) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 })
  }

  const supabase = getAdminClient()

  const { data: silo, error: siloError } = await supabase
    .from('silos')
    .select('id, organization_id, status')
    .eq('api_key', apiKey)
    .single()

  if (siloError || !silo) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
  }

  if (silo.status === 'closed') {
    return NextResponse.json({ error: 'Silo is closed' }, { status: 403 })
  }

  // 2. Parsear payload (objeto único o array)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const payloads: SiloReadingPayload[] = Array.isArray(body) ? body : [body as SiloReadingPayload]

  if (payloads.length === 0) {
    return NextResponse.json({ error: 'Empty payload' }, { status: 400 })
  }

  // 3. Construir filas para insertar
  const rows = payloads.map((p) => ({
    silo_id:         silo.id,
    organization_id: silo.organization_id,
    sensor_id:       p.sensor_id ?? null,
    recorded_at:     p.recorded_at ?? new Date().toISOString(),
    temperature_c:   p.temperature_c ?? null,
    humidity_pct:    p.humidity_pct ?? null,
    co2_ppm:         p.co2_ppm ?? null,
    battery_pct:     p.battery_pct ?? null,
    raw_payload:     p,
  }))

  const { error: insertError } = await supabase
    .from('silo_readings')
    .insert(rows)

  if (insertError) {
    console.error('[iot/silo-readings] insert error:', insertError.message)
    return NextResponse.json({ error: 'Failed to store readings' }, { status: 500 })
  }

  // 4. Evaluar alertas contra los umbrales configurados
  const firedAlerts: string[] = []

  const { data: config } = await supabase
    .from('silo_alert_configs')
    .select('max_temperature_c, max_humidity_pct, max_co2_ppm, min_battery_pct')
    .eq('silo_id', silo.id)
    .single()

  if (config) {
    for (const p of payloads) {
      const alertsToInsert: {
        silo_id: string; sensor_id: string | null; organization_id: string
        alert_type: string; value: number; threshold: number
      }[] = []

      if (p.temperature_c != null && config.max_temperature_c != null && p.temperature_c > config.max_temperature_c) {
        alertsToInsert.push({ silo_id: silo.id, sensor_id: p.sensor_id ?? null, organization_id: silo.organization_id, alert_type: 'high_temperature', value: p.temperature_c, threshold: config.max_temperature_c })
        firedAlerts.push(`high_temperature: ${p.temperature_c}°C`)
      }
      if (p.humidity_pct != null && config.max_humidity_pct != null && p.humidity_pct > config.max_humidity_pct) {
        alertsToInsert.push({ silo_id: silo.id, sensor_id: p.sensor_id ?? null, organization_id: silo.organization_id, alert_type: 'high_humidity', value: p.humidity_pct, threshold: config.max_humidity_pct })
        firedAlerts.push(`high_humidity: ${p.humidity_pct}%`)
      }
      if (p.co2_ppm != null && config.max_co2_ppm != null && p.co2_ppm > config.max_co2_ppm) {
        alertsToInsert.push({ silo_id: silo.id, sensor_id: p.sensor_id ?? null, organization_id: silo.organization_id, alert_type: 'high_co2', value: p.co2_ppm, threshold: config.max_co2_ppm })
        firedAlerts.push(`high_co2: ${p.co2_ppm}ppm`)
      }
      if (p.battery_pct != null && config.min_battery_pct != null && p.battery_pct < config.min_battery_pct) {
        alertsToInsert.push({ silo_id: silo.id, sensor_id: p.sensor_id ?? null, organization_id: silo.organization_id, alert_type: 'low_battery', value: p.battery_pct, threshold: config.min_battery_pct })
        firedAlerts.push(`low_battery: ${p.battery_pct}%`)
      }

      if (alertsToInsert.length > 0) {
        await supabase.from('silo_alerts').insert(alertsToInsert)
      }
    }
  }

  return NextResponse.json({ inserted: rows.length, alerts: firedAlerts })
}
