# Ajustes manuales de stock — Diseño

**Fecha:** 2026-08-18
**Estado:** Aprobado, pendiente de implementación

## Contexto y objetivo

Hoy `stock_movements.movement_type` ya incluye `'adjustment'` en el CHECK del schema y la
pantalla de historial (`app/(app)/movements/page.tsx`) ya lo sabe mostrar (ícono, label "Ajuste"),
pero no existe ninguna pantalla ni acción para *crear* un ajuste. Un usuario de la app lo pidió
explícitamente: necesita poder corregir el stock registrado contra un recuento físico real (por
recuento, rotura, robo/pérdida, vencimiento de un lote, o corrección de una carga anterior mal
hecha), sin tener que pasar por una orden de compra o una transferencia.

**Objetivo:** dar de alta un flujo de "Ajuste de Stock" que reutilice al máximo la infraestructura
existente de movimientos y lotes, con trazabilidad de motivo suficiente para auditoría.

**Fuera de alcance:** deshacer/editar un ajuste ya cargado (se corrige con un ajuste nuevo, igual
que cualquier otro movimiento); ajustes masivos/por lote de múltiples productos a la vez.

## Flujo y UI

- Nuevo ítem de menú **"Ajuste de Stock"** en `components/layout/nav-items.ts` → ruta
  `/movements/adjustment`, roles `['admin', 'manager']` (mismo criterio de permisos que
  "Transferencia" — es una operación que pisa el stock sin respaldo documental, no se habilita
  para `engineer`). Se ubica como hermano de "Transferencia" en el sidebar.
- Página nueva `app/(app)/movements/adjustment/page.tsx`, calcada del patrón existente en
  `app/(app)/movements/transfer/page.tsx` (react-hook-form + zod + shadcn `Select`, mismo estilo
  de layout en `Card`).
- Selección en cascada:
  1. **Producto** (limitado a productos con stock existente, vía `useCurrentStock`, igual que
     Transferencia).
  2. **Depósito**.
  3. **Lote** — si el producto tiene lotes activos en ese depósito (`useActiveLots`), se listan
     con vencimiento + cantidad, más la opción **"Sin lote específico — ajuste general"**. Si el
     producto no tiene lotes, este paso se salta.
- Se muestra el stock actual de la combinación exacta elegida (producto+depósito+lote vía
  `current_lot_stock`, o producto+depósito vía `current_stock` si no hay lote) junto al input
  **"Cantidad real contada"** (`min={0}`, nunca negativa).
- **Motivo** (obligatorio):
  - Select con categoría: `Recuento físico`, `Rotura/derrame`, `Robo o pérdida`, `Vencimiento`,
    `Corrección de carga`, `Otro`.
  - Campo de texto obligatorio con el detalle (mínimo unos caracteres, validado con zod).
- Al enviar:
  - Si `cantidad contada === stock actual` de esa combinación, se bloquea el submit (no hay nada
    que ajustar) mostrando un error de validación en el campo de cantidad.
  - Si el valor difiere, se calcula `delta = cantidad_contada - stock_actual` y se muestra un
    resumen de confirmación ("Se registrará un ajuste de -5 L") antes de disparar la mutación —
    mismo patrón de confirmación que ya usa Transferencia.

## Modelo de datos

- Se reutiliza `stock_movements` sin cambiar su forma general (`movement_type: 'adjustment'`,
  columna `lot_id` ya agregada en `009_stock_lots.sql`).
- **Migración nueva** (`010_adjustment_reason.sql` — el 009 ya está tomado por `009_stock_lots.sql`):
  ```sql
  ALTER TABLE public.stock_movements
    ADD COLUMN adjustment_reason TEXT
    CHECK (adjustment_reason IS NULL OR adjustment_reason IN (
      'recount', 'breakage', 'theft_loss', 'expiry', 'data_correction', 'other'
    ));
  ```
  Queda `NULL` para todo movimiento que no sea `adjustment`. El detalle en texto libre sigue
  yendo en la columna `notes` que ya existe (obligatoria solo para este flujo, a nivel de
  validación de formulario — no a nivel de constraint de DB, para no romper otros movimientos que
  hoy insertan `notes` opcional).
- **Nuevo hook** `useAdjustStock` en `lib/hooks/use-stock.ts`, mismo patrón que
  `useTransferStock`: inserta un único registro en `stock_movements` con `quantity = delta`
  (positivo o negativo), `lot_id` (nullable), `adjustment_reason`, `notes`. En `onSuccess`
  invalida `['current-stock']`, `['stock-movements']` y `['lot-stock']`, llama a `logActivity`
  (acción `adjust_stock`) y muestra un toast de éxito. En `onError`, toast de error, sin lanzar
  excepción hacia la UI (consistente con el resto de mutaciones de stock).

## Validación y casos límite

- La cantidad contada nunca puede ser negativa (`min={0}` en el input) — como el delta se deriva
  de un conteo real y no de un valor +/- ingresado a mano, es imposible generar un stock final
  negativo.
- Condición de carrera (dos personas ajustando la misma combinación a la vez): no se agrega
  optimistic locking ni bloqueo pesimista. Es el mismo riesgo teórico que ya existe hoy sin
  resolver en Transferencia, y no se justifica una solución más pesada para el volumen de uso de
  esta app.
- Acceso con rol `engineer`: redirige a `/stock`, igual que hace hoy `movements/transfer/page.tsx`.

## Testing

- Verificación obligatoria antes de cada commit: `npx tsc --noEmit` (regla del proyecto en
  `CLAUDE.md`).
- Casos a probar manualmente en `run`/preview antes de dar por cerrado:
  1. Ajuste de un producto sin lotes (flujo corto, sin selector de lote).
  2. Ajuste de un lote específico de un producto con varios lotes activos.
  3. Intento de ajuste sin cambio real de cantidad → debe bloquear el submit.
  4. Acceso a `/movements/adjustment` con un usuario `engineer` → debe redirigir a `/stock`.
  5. El movimiento cargado aparece correctamente en `/movements` con ícono y label "Ajuste".
- Documentación: actualizar **ambos** `docs/manual-usuario.md` y `app/(app)/manual/page.tsx` con
  el nuevo flujo (regla del proyecto), incluyendo quién puede usarlo (admin/manager), los pasos
  numerados, y la nota de que la cantidad final se calcula automáticamente a partir del recuento.
