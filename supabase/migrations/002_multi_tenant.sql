-- ============================================================
-- Migration 002: Multi-tenant + Orden de aplicación
-- Correr en: Supabase Dashboard > SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLA ORGANIZATIONS
-- ============================================================
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  cuit TEXT,
  contact_email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Miembros ven su propia org
CREATE POLICY "Miembros ven su org" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  );

-- Admin actualiza su org
CREATE POLICY "Admin actualiza su org" ON public.organizations
  FOR UPDATE USING (
    id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Cualquier usuario autenticado puede crear una org (onboarding)
CREATE POLICY "Usuarios crean org" ON public.organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 2. AGREGAR organization_id A TODAS LAS TABLAS
-- ============================================================
ALTER TABLE public.profiles    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL;
ALTER TABLE public.warehouses  ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.product_categories ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.products    ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.suppliers   ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.purchase_orders ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.field_applications ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
ALTER TABLE public.stock_movements ADD COLUMN organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;

-- ============================================================
-- 3. FUNCIÓN HELPER PARA RLS (SECURITY DEFINER evita recursión)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ============================================================
-- 4. LIMPIAR SEED DATA HUÉRFANA (sin org)
-- ============================================================
DELETE FROM public.product_categories WHERE organization_id IS NULL;
DELETE FROM public.warehouses WHERE organization_id IS NULL;

-- ============================================================
-- 5. ACTUALIZAR POLÍTICAS RLS (org-aware)
-- ============================================================

-- --- PROFILES ---
DROP POLICY IF EXISTS "Usuarios ven su propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Solo admin modifica perfiles" ON public.profiles;

-- Ver perfiles de la misma org (o el propio mientras no tenga org aún)
CREATE POLICY "Ver perfiles de la org" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR organization_id = public.get_my_organization_id()
  );

-- Usuario actualiza su propio perfil (incluyendo asignar org en onboarding)
CREATE POLICY "Usuario actualiza su perfil" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin actualiza cualquier perfil de su org
CREATE POLICY "Admin actualiza perfiles de su org" ON public.profiles
  FOR UPDATE USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- --- WAREHOUSES ---
DROP POLICY IF EXISTS "Todos ven warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Admin y manager modifican warehouses" ON public.warehouses;

CREATE POLICY "Ver warehouses de la org" ON public.warehouses
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Admin/manager gestionan warehouses" ON public.warehouses
  FOR ALL USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- --- PRODUCT CATEGORIES ---
DROP POLICY IF EXISTS "Todos ven categorías" ON public.product_categories;
DROP POLICY IF EXISTS "Solo admin modifica categorías" ON public.product_categories;

CREATE POLICY "Ver categorías de la org" ON public.product_categories
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Admin/manager gestionan categorías" ON public.product_categories
  FOR ALL USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- --- PRODUCTS ---
DROP POLICY IF EXISTS "Todos ven productos" ON public.products;
DROP POLICY IF EXISTS "Admin y manager modifican productos" ON public.products;

CREATE POLICY "Ver productos de la org" ON public.products
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Admin/manager gestionan productos" ON public.products
  FOR ALL USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- --- SUPPLIERS ---
DROP POLICY IF EXISTS "Todos ven proveedores" ON public.suppliers;
DROP POLICY IF EXISTS "Admin y manager modifican proveedores" ON public.suppliers;

CREATE POLICY "Ver proveedores de la org" ON public.suppliers
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Admin/manager gestionan proveedores" ON public.suppliers
  FOR ALL USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- --- PURCHASE ORDERS ---
DROP POLICY IF EXISTS "Todos ven órdenes" ON public.purchase_orders;
DROP POLICY IF EXISTS "Admin y manager gestionan órdenes" ON public.purchase_orders;

CREATE POLICY "Ver órdenes de la org" ON public.purchase_orders
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Admin/manager gestionan órdenes" ON public.purchase_orders
  FOR ALL USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- --- PURCHASE ORDER ITEMS ---
DROP POLICY IF EXISTS "Todos ven ítems de órdenes" ON public.purchase_order_items;
DROP POLICY IF EXISTS "Admin y manager gestionan ítems de órdenes" ON public.purchase_order_items;

CREATE POLICY "Ver ítems de órdenes de la org" ON public.purchase_order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.purchase_orders WHERE organization_id = public.get_my_organization_id())
  );

CREATE POLICY "Admin/manager gestionan ítems de órdenes" ON public.purchase_order_items
  FOR ALL USING (
    order_id IN (SELECT id FROM public.purchase_orders WHERE organization_id = public.get_my_organization_id()) AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- --- FIELD APPLICATIONS ---
DROP POLICY IF EXISTS "Todos ven aplicaciones" ON public.field_applications;
DROP POLICY IF EXISTS "Usuarios autenticados crean aplicaciones" ON public.field_applications;
DROP POLICY IF EXISTS "Admin y manager eliminan aplicaciones" ON public.field_applications;

CREATE POLICY "Ver aplicaciones de la org" ON public.field_applications
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Usuarios crean aplicaciones de su org" ON public.field_applications
  FOR INSERT WITH CHECK (
    organization_id = public.get_my_organization_id() AND
    created_by = auth.uid()
  );

CREATE POLICY "Admin/manager actualizan aplicaciones" ON public.field_applications
  FOR UPDATE USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

CREATE POLICY "Admin/manager eliminan aplicaciones" ON public.field_applications
  FOR DELETE USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager')
  );

-- --- FIELD APPLICATION ITEMS ---
DROP POLICY IF EXISTS "Todos ven ítems de aplicaciones" ON public.field_application_items;
DROP POLICY IF EXISTS "Usuarios autenticados crean ítems de aplicaciones" ON public.field_application_items;

CREATE POLICY "Ver ítems de aplicaciones de la org" ON public.field_application_items
  FOR SELECT USING (
    application_id IN (SELECT id FROM public.field_applications WHERE organization_id = public.get_my_organization_id())
  );

CREATE POLICY "Usuarios crean ítems de sus aplicaciones" ON public.field_application_items
  FOR ALL USING (
    application_id IN (SELECT id FROM public.field_applications WHERE organization_id = public.get_my_organization_id())
  );

-- --- STOCK MOVEMENTS ---
DROP POLICY IF EXISTS "Todos ven movimientos" ON public.stock_movements;
DROP POLICY IF EXISTS "Admin y manager crean movimientos" ON public.stock_movements;
DROP POLICY IF EXISTS "Solo admin elimina movimientos" ON public.stock_movements;

CREATE POLICY "Ver movimientos de la org" ON public.stock_movements
  FOR SELECT USING (organization_id = public.get_my_organization_id());

CREATE POLICY "Admin/manager crean movimientos" ON public.stock_movements
  FOR INSERT WITH CHECK (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager') AND
    created_by = auth.uid()
  );

CREATE POLICY "Solo admin elimina movimientos" ON public.stock_movements
  FOR DELETE USING (
    organization_id = public.get_my_organization_id() AND
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- 6. NUEVOS CAMPOS PARA ORDEN DE APLICACIÓN
-- ============================================================

-- Ingrediente activo en productos
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS active_ingredient TEXT;

-- Campos de la orden en field_applications
ALTER TABLE public.field_applications
  ADD COLUMN IF NOT EXISTS crop TEXT,
  ADD COLUMN IF NOT EXISTS crop_variety TEXT,
  ADD COLUMN IF NOT EXISTS cycle TEXT,
  ADD COLUMN IF NOT EXISTS area_ha NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS client_name TEXT,
  ADD COLUMN IF NOT EXISTS client_email TEXT,
  ADD COLUMN IF NOT EXISTS contractor TEXT,
  ADD COLUMN IF NOT EXISTS machine TEXT,
  ADD COLUMN IF NOT EXISTS nozzle_type TEXT,
  ADD COLUMN IF NOT EXISTS application_rate_lha NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS min_humidity NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS max_temperature NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS max_wind_speed NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS wind_direction TEXT,
  ADD COLUMN IF NOT EXISTS withholding_period TEXT,
  ADD COLUMN IF NOT EXISTS order_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (order_status IN ('draft', 'sent', 'executed'));

-- Dosis por hectárea en ítems
ALTER TABLE public.field_application_items
  ADD COLUMN IF NOT EXISTS dose_per_ha NUMERIC(10,4);

-- ============================================================
-- 7. FUNCIÓN DE ONBOARDING: crear org y asignar al usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_organization_for_user(
  org_name TEXT,
  org_cuit TEXT DEFAULT NULL,
  org_email TEXT DEFAULT NULL,
  org_phone TEXT DEFAULT NULL,
  org_address TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Crear la organización
  INSERT INTO public.organizations (name, cuit, contact_email, phone, address)
  VALUES (org_name, org_cuit, org_email, org_phone, org_address)
  RETURNING id INTO new_org_id;

  -- Asignar la org al usuario actual y promoverlo a admin
  UPDATE public.profiles
  SET organization_id = new_org_id, role = 'admin'
  WHERE id = auth.uid();

  -- Seed: categorías por defecto
  INSERT INTO public.product_categories (name, type, organization_id) VALUES
    ('Herbicida', 'agroquimico', new_org_id),
    ('Fungicida', 'agroquimico', new_org_id),
    ('Insecticida', 'agroquimico', new_org_id),
    ('Fertilizante', 'agroquimico', new_org_id),
    ('Coadyuvante', 'agroquimico', new_org_id),
    ('Semilla de Soja', 'semilla', new_org_id),
    ('Semilla de Maíz', 'semilla', new_org_id),
    ('Semilla de Trigo', 'semilla', new_org_id),
    ('Semilla de Girasol', 'semilla', new_org_id);

  -- Seed: depósito por defecto
  INSERT INTO public.warehouses (name, location, description, organization_id) VALUES
    ('Depósito Principal', 'Campo', 'Depósito central de agroquímicos', new_org_id);

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
