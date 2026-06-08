-- ============================================================
-- Seed: Productos + Stock inicial
-- Pegar en: Supabase Dashboard > SQL Editor > Run
-- ============================================================
-- Categorías inferidas para productos sin categoría en el listado:
--   QUINTAL      → Insecticida
--   DASEN PLUS   → Fungicida
--   resto        → Herbicida
-- Ajustá si es necesario antes de correr.
-- ============================================================

DO $$
DECLARE
  v_org    uuid;
  v_wh     uuid;
  v_user   uuid;
  v_herb   uuid;
  v_insect uuid;
  v_fung   uuid;
  v_pid    uuid;
  rec      record;
BEGIN
  -- ── Referencias de la organización ─────────────────────────
  SELECT id INTO v_org  FROM public.organizations                               LIMIT 1;
  SELECT id INTO v_wh   FROM public.warehouses    WHERE organization_id = v_org LIMIT 1;
  SELECT id INTO v_user FROM public.profiles      WHERE organization_id = v_org LIMIT 1;

  -- ── IDs de categoría (creadas por el onboarding) ───────────
  SELECT id INTO v_herb   FROM public.product_categories
    WHERE organization_id = v_org AND LOWER(name) = 'herbicida'   LIMIT 1;
  SELECT id INTO v_insect FROM public.product_categories
    WHERE organization_id = v_org AND LOWER(name) = 'insecticida' LIMIT 1;
  SELECT id INTO v_fung   FROM public.product_categories
    WHERE organization_id = v_org AND LOWER(name) = 'fungicida'   LIMIT 1;

  -- ── Validación mínima ──────────────────────────────────────
  IF v_org IS NULL   THEN RAISE EXCEPTION 'No se encontró ninguna organización. Corré el onboarding primero.'; END IF;
  IF v_wh IS NULL    THEN RAISE EXCEPTION 'No se encontró ningún depósito para la organización.'; END IF;
  IF v_user IS NULL  THEN RAISE EXCEPTION 'No se encontró ningún usuario en la organización.'; END IF;
  IF v_herb IS NULL  THEN RAISE EXCEPTION 'Categoría "Herbicida" no encontrada.'; END IF;
  IF v_insect IS NULL THEN RAISE EXCEPTION 'Categoría "Insecticida" no encontrada.'; END IF;
  IF v_fung IS NULL  THEN RAISE EXCEPTION 'Categoría "Fungicida" no encontrada.'; END IF;

  -- ── Datos: (nombre, principio_activo, categoria, unidad, stock) ──
  FOR rec IN
    SELECT *
    FROM (VALUES
      ('GLIFO 66%',         'Glifosato',           v_herb,   'L',   330  ),
      ('QUINTAL',            NULL::text,            v_insect, 'L',   15   ),
      ('ABACMECTINA',       'Abamectina',           v_insect, 'L',   30   ),
      ('PARACUAT',          'Paraquat',              v_herb,   'L',   440  ),
      ('DICAMBA',           'Dicamba',               v_herb,   'L',   30   ),
      ('FLUMIOXAZIN',       'Flumioxazin',           v_herb,   'L',   15   ),
      ('2.4D',              '2,4-D',                 v_herb,   'L',   59   ),
      ('ALOXIFOP',          'Haloxyfop',             v_herb,   'L',   10   ),
      ('BIFERTRIN',         'Bifentrina',            v_insect, 'L',   25   ),
      ('DASEN PLUS',         NULL::text,             v_fung,   'L',   40   ),
      ('SULFENTRAZONE',     'Sulfentrazone',          v_herb,   'L',   20   ),
      ('AZOXI PRO',         'Azoxistrobina',          v_fung,   'L',   50   ),
      ('CLORIMURON',        'Clorimurón etil',        v_herb,   'kg',  1.2  ),
      ('METSULFURON METIL', 'Metsulfurón metil',      v_herb,   'kg',  2    ),
      ('CORAGEN',           'Clorantraniliprole',     v_insect, 'L',   1    ),
      ('IMASAPIR',          'Imazapir',               v_herb,   'L',   5    ),
      ('DIFLUFENICAM',      'Diflufenicam',           v_herb,   'L',   20   ),
      ('ATRAZINA',          'Atrazina',               v_herb,   'kg',  30   ),
      ('DICLUSULAN',        'Diclosulam',             v_herb,   'L',   2.5  )
    ) AS t(nombre, principio_activo, categoria_id, unidad, stock_qty)
  LOOP
    INSERT INTO public.products
      (name, active_ingredient, category_id, unit, organization_id)
    VALUES
      (rec.nombre, rec.principio_activo, rec.categoria_id, rec.unidad, v_org)
    RETURNING id INTO v_pid;

    INSERT INTO public.stock_movements
      (movement_type, product_id, warehouse_id, quantity, notes, created_by, organization_id)
    VALUES
      ('initial', v_pid, v_wh, rec.stock_qty, 'Carga inicial de stock', v_user, v_org);
  END LOOP;

  RAISE NOTICE 'Listo: 19 productos cargados en depósito "%".',
    (SELECT name FROM public.warehouses WHERE id = v_wh);
END;
$$;
