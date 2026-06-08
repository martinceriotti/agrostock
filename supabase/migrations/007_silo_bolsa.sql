-- ============================================================
-- Migration 007: Módulo Silo Bolsa + API IoT
-- Correr en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. SILOS (tabla maestra de bolsas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.silos (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,                        -- ej: "Bolsa 1 - Lote Norte"
  field_name      TEXT,                                 -- campo / establecimiento
  crop            TEXT,                                 -- cultivo almacenado
  capacity_tons   NUMERIC(10,2),                        -- capacidad estimada en toneladas
  fill_date       DATE,                                 -- fecha de llenado
  empty_date      DATE,                                 -- fecha de vaciado (null = activo)
  latitude        NUMERIC(10,7),
  longitude       NUMERIC(10,7),
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'empty', 'closed')),
  notes           TEXT,
  -- API key que usa el gateway IoT para autenticarse
  api_key         TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.silos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. SENSORES (puntos de medición dentro de cada silo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.silo_sensors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  silo_id         UUID NOT NULL REFERENCES public.silos(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,          -- ej: "Sensor A - 10m", "Centro"
  position_m      NUMERIC(6,1),           -- posición en metros desde el inicio de la bolsa
  active          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.silo_sensors ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. LECTURAS (time-series de datos IoT)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.silo_readings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  silo_id         UUID NOT NULL REFERENCES public.silos(id) ON DELETE CASCADE,
  sensor_id       UUID REFERENCES public.silo_sensors(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),   -- timestamp del dispositivo
  temperature_c   NUMERIC(5,2),                         -- temperatura en °C
  humidity_pct    NUMERIC(5,2),                         -- humedad relativa %
  co2_ppm         NUMERIC(8,2),                         -- CO2 en ppm (opcional)
  battery_pct     NUMERIC(5,2),                         -- batería del sensor (opcional)
  raw_payload     JSONB                                  -- payload original del dispositivo
);

-- Índice para consultas time-series por silo
CREATE INDEX IF NOT EXISTS silo_readings_silo_time_idx
  ON public.silo_readings (silo_id, recorded_at DESC);

-- Índice para consultas por sensor
CREATE INDEX IF NOT EXISTS silo_readings_sensor_time_idx
  ON public.silo_readings (sensor_id, recorded_at DESC);

ALTER TABLE public.silo_readings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. CONFIGURACIÓN DE ALERTAS (umbrales por silo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.silo_alert_configs (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  silo_id             UUID NOT NULL UNIQUE REFERENCES public.silos(id) ON DELETE CASCADE,
  organization_id     UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  max_temperature_c   NUMERIC(5,2) DEFAULT 35,    -- alerta si temp supera este valor
  max_humidity_pct    NUMERIC(5,2) DEFAULT 14,    -- alerta si humedad supera (14% = umbral crítico para granos)
  max_co2_ppm         NUMERIC(8,2) DEFAULT 5000,
  min_battery_pct     NUMERIC(5,2) DEFAULT 20,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.silo_alert_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. HISTORIAL DE ALERTAS DISPARADAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.silo_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  silo_id         UUID NOT NULL REFERENCES public.silos(id) ON DELETE CASCADE,
  sensor_id       UUID REFERENCES public.silo_sensors(id) ON DELETE SET NULL,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  alert_type      TEXT NOT NULL
                    CHECK (alert_type IN ('high_temperature', 'high_humidity', 'high_co2', 'low_battery')),
  value           NUMERIC(10,2) NOT NULL,          -- valor que disparó la alerta
  threshold       NUMERIC(10,2) NOT NULL,          -- umbral configurado
  triggered_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ,                     -- null = alerta activa
  acknowledged_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS silo_alerts_silo_active_idx
  ON public.silo_alerts (silo_id, resolved_at)
  WHERE resolved_at IS NULL;

ALTER TABLE public.silo_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. POLÍTICAS RLS
-- ============================================================

-- SILOS
CREATE POLICY "Ver silos de la org" ON public.silos
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Admin/manager gestionan silos" ON public.silos
  FOR ALL USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- SILO_SENSORS
CREATE POLICY "Ver sensores de la org" ON public.silo_sensors
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Admin/manager gestionan sensores" ON public.silo_sensors
  FOR ALL USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- SILO_READINGS (lectura para todos, escritura solo via service role desde la API IoT)
CREATE POLICY "Ver lecturas de la org" ON public.silo_readings
  FOR SELECT USING (organization_id = public.get_my_organization_id());

-- SILO_ALERT_CONFIGS
CREATE POLICY "Ver config de alertas de la org" ON public.silo_alert_configs
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Admin/manager configuran alertas" ON public.silo_alert_configs
  FOR ALL USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- SILO_ALERTS
CREATE POLICY "Ver alertas de la org" ON public.silo_alerts
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Admin/manager gestionan alertas" ON public.silo_alerts
  FOR ALL USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );
