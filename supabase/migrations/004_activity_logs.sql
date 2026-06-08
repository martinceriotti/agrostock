-- ============================================================
-- Migration 004: Tabla de logs de actividad de usuarios
-- Correr en: Supabase Dashboard > SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID        REFERENCES public.organizations(id) ON DELETE CASCADE,
  action          TEXT        NOT NULL,
  entity_type     TEXT,
  entity_id       UUID,
  entity_name     TEXT,
  details         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS activity_logs_org_idx  ON public.activity_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_user_idx ON public.activity_logs(user_id, created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Admin y manager ven todos los logs de su org
CREATE POLICY "Admin/manager ven logs de la org" ON public.activity_logs
  FOR SELECT USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- Cualquier usuario autenticado puede insertar sus propios logs
CREATE POLICY "Usuarios insertan sus propios logs" ON public.activity_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    organization_id = public.get_my_organization_id()
  );
