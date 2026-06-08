-- ============================================================
-- AgroStock - Schema inicial
-- Correr en: Supabase Dashboard > SQL Editor
-- ============================================================

-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLAS
-- ============================================================

-- Perfiles de usuario (extiende auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'engineer' CHECK (role IN ('admin', 'manager', 'engineer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Depósitos / warehouses
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  location TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categorías de productos
CREATE TABLE public.product_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('agroquimico', 'semilla'))
);

-- Catálogo de productos
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT,
  category_id UUID NOT NULL REFERENCES public.product_categories(id),
  unit TEXT NOT NULL CHECK (unit IN ('L', 'kg', 'unidad', 'bolsa')),
  description TEXT,
  min_stock_alert NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Proveedores
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Órdenes de compra
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number TEXT NOT NULL UNIQUE DEFAULT 'OC-' || to_char(NOW(), 'YYYYMMDD') || '-' || floor(random() * 9000 + 1000)::TEXT,
  supplier_id UUID REFERENCES public.suppliers(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'received', 'cancelled')),
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD')),
  exchange_rate NUMERIC,
  notes TEXT,
  ordered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expected_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ítems de órdenes de compra
CREATE TABLE public.purchase_order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  quantity_ordered NUMERIC NOT NULL CHECK (quantity_ordered > 0),
  quantity_received NUMERIC NOT NULL DEFAULT 0 CHECK (quantity_received >= 0),
  unit_price NUMERIC,
  currency TEXT NOT NULL DEFAULT 'ARS' CHECK (currency IN ('ARS', 'USD'))
);

-- Aplicaciones en campo (salidas por lote)
CREATE TABLE public.field_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_name TEXT NOT NULL,
  application_date DATE NOT NULL,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ítems de aplicaciones en campo
CREATE TABLE public.field_application_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES public.field_applications(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  quantity_used NUMERIC NOT NULL CHECK (quantity_used > 0)
);

-- Movimientos de stock (fuente de verdad)
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('purchase_receipt', 'consumption', 'transfer', 'adjustment', 'initial')),
  product_id UUID NOT NULL REFERENCES public.products(id),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id),
  quantity NUMERIC NOT NULL, -- positivo=entrada, negativo=salida
  unit_price NUMERIC,
  currency TEXT CHECK (currency IN ('ARS', 'USD')),
  reference_id UUID, -- FK a order_item o application_item
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_warehouse ON public.stock_movements(warehouse_id);
CREATE INDEX idx_stock_movements_created_at ON public.stock_movements(created_at);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);
CREATE INDEX idx_products_category ON public.products(category_id);

-- ============================================================
-- VISTA: stock actual
-- ============================================================
CREATE OR REPLACE VIEW public.current_stock AS
  SELECT
    product_id,
    warehouse_id,
    COALESCE(SUM(quantity), 0) AS quantity
  FROM public.stock_movements
  GROUP BY product_id, warehouse_id;

-- ============================================================
-- FUNCIÓN: crear perfil automáticamente al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'engineer')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.field_application_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Función helper para obtener rol del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- PROFILES
CREATE POLICY "Usuarios ven su propio perfil" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.get_user_role() IN ('admin', 'manager'));

CREATE POLICY "Solo admin modifica perfiles" ON public.profiles
  FOR ALL USING (public.get_user_role() = 'admin');

-- WAREHOUSES (todos ven, solo admin/manager modifican)
CREATE POLICY "Todos ven warehouses" ON public.warehouses
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y manager modifican warehouses" ON public.warehouses
  FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));

-- PRODUCT CATEGORIES (todos ven, solo admin modifica)
CREATE POLICY "Todos ven categorías" ON public.product_categories
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Solo admin modifica categorías" ON public.product_categories
  FOR ALL USING (public.get_user_role() = 'admin');

-- PRODUCTS (todos ven, admin/manager modifican)
CREATE POLICY "Todos ven productos" ON public.products
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y manager modifican productos" ON public.products
  FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));

-- SUPPLIERS (todos ven, admin/manager modifican)
CREATE POLICY "Todos ven proveedores" ON public.suppliers
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y manager modifican proveedores" ON public.suppliers
  FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));

-- PURCHASE ORDERS (todos ven, admin/manager crean/modifican)
CREATE POLICY "Todos ven órdenes" ON public.purchase_orders
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y manager gestionan órdenes" ON public.purchase_orders
  FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));

-- PURCHASE ORDER ITEMS
CREATE POLICY "Todos ven ítems de órdenes" ON public.purchase_order_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y manager gestionan ítems de órdenes" ON public.purchase_order_items
  FOR ALL USING (public.get_user_role() IN ('admin', 'manager'));

-- FIELD APPLICATIONS (todos ven, todos crean, solo admin elimina)
CREATE POLICY "Todos ven aplicaciones" ON public.field_applications
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados crean aplicaciones" ON public.field_applications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth.uid());

CREATE POLICY "Admin y manager eliminan aplicaciones" ON public.field_applications
  FOR DELETE USING (public.get_user_role() IN ('admin', 'manager'));

-- FIELD APPLICATION ITEMS
CREATE POLICY "Todos ven ítems de aplicaciones" ON public.field_application_items
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Usuarios autenticados crean ítems de aplicaciones" ON public.field_application_items
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- STOCK MOVEMENTS (todos ven, admin/manager crean)
CREATE POLICY "Todos ven movimientos" ON public.stock_movements
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin y manager crean movimientos" ON public.stock_movements
  FOR INSERT WITH CHECK (public.get_user_role() IN ('admin', 'manager') AND created_by = auth.uid());

CREATE POLICY "Solo admin elimina movimientos" ON public.stock_movements
  FOR DELETE USING (public.get_user_role() = 'admin');

-- ============================================================
-- DATOS INICIALES (seed)
-- ============================================================

INSERT INTO public.product_categories (name, type) VALUES
  ('Herbicida', 'agroquimico'),
  ('Fungicida', 'agroquimico'),
  ('Insecticida', 'agroquimico'),
  ('Fertilizante', 'agroquimico'),
  ('Coadyuvante', 'agroquimico'),
  ('Semilla de Soja', 'semilla'),
  ('Semilla de Maíz', 'semilla'),
  ('Semilla de Trigo', 'semilla'),
  ('Semilla de Girasol', 'semilla');

INSERT INTO public.warehouses (name, location, description) VALUES
  ('Depósito Principal', 'Campo Norte', 'Depósito central de agroquímicos'),
  ('Depósito Sur', 'Campo Sur', 'Depósito secundario');
