# Ajustes manuales de stock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar de alta un flujo de "Ajuste de Stock" (`/movements/adjustment`) que permita a Admin/Manager corregir el stock registrado contra un recuento físico real, con motivo obligatorio, reutilizando `stock_movements` y la infraestructura de lotes existente.

**Architecture:** Página cliente (react-hook-form + zod) calcada del patrón de `movements/transfer/page.tsx`, con un hook `useAdjustStock` (mismo patrón que `useTransferStock`/`useReceiveOrder`) que inserta un único registro en `stock_movements` con `movement_type: 'adjustment'`, `quantity` = delta calculado, `lot_id` opcional y una nueva columna `adjustment_reason`.

**Tech Stack:** Next.js 16 App Router, React 19, react-hook-form + zod v4, TanStack Query v5, Supabase (cliente sin generic `Database`), shadcn/ui (@base-ui/react).

**Spec:** [docs/superpowers/specs/2026-08-18-ajustes-manuales-stock-design.md](../specs/2026-08-18-ajustes-manuales-stock-design.md)

## Global Constraints

- Correr `npx tsc --noEmit` sin errores antes de cada commit.
- Zod v4: no existe `invalid_type_error`; usar `z.number()` con `valueAsNumber: true` en el input.
- shadcn `Select.Root` siempre necesita la prop `items` para que `SelectValue` resuelva el label con el popup cerrado.
- Mutaciones de stock: `{ success: true } | { success: false, error: string }` NO aplica acá — este flujo usa mutaciones cliente vía TanStack Query + Supabase directo (mismo patrón que `useTransferStock`/`useReceiveOrder`), no Server Actions.
- El cliente Supabase (`lib/supabase/client.ts`) no pasa el generic `Database` a `createBrowserClient`, así que los `.insert(...)` no se type-checkean contra `database.types.ts` — igual se actualiza ese archivo a mano por consistencia con el resto del proyecto (ver migración 009).
- Cuando se agrega o modifica una funcionalidad, actualizar **ambos** `docs/manual-usuario.md` y `app/(app)/manual/page.tsx`.
- Este repo no tiene test runner (no Jest/Vitest/Playwright en `package.json`) — la verificación existente en todo el proyecto es `npx tsc --noEmit` + QA manual en el navegador. Este plan sigue esa misma convención en vez de introducir un framework de testing nuevo.

---

## File Structure

- **Create:** `supabase/migrations/010_adjustment_reason.sql` — nueva columna `adjustment_reason`.
- **Modify:** `lib/types/database.types.ts` — agrega `adjustment_reason` a `stock_movements` (Row/Insert/Update).
- **Modify:** `lib/hooks/use-stock.ts` — agrega `useAdjustStock`.
- **Modify:** `components/layout/nav-items.ts` — agrega el ítem de menú "Ajuste de Stock".
- **Create:** `app/(app)/movements/adjustment/page.tsx` — el formulario.
- **Modify:** `docs/manual-usuario.md` y `app/(app)/manual/page.tsx` — documentación.

---

### Task 1: Migración + tipos de base de datos

**Files:**
- Create: `supabase/migrations/010_adjustment_reason.sql`
- Modify: `lib/types/database.types.ts:404-450` (bloque `stock_movements`)

**Interfaces:**
- Produces: columna `stock_movements.adjustment_reason: 'recount' | 'breakage' | 'theft_loss' | 'expiry' | 'data_correction' | 'other' | null`, disponible para el `insert` de la Task 2.

- [ ] **Step 1: Crear la migración**

```sql
-- supabase/migrations/010_adjustment_reason.sql
-- Categoría de motivo para ajustes manuales de stock (movement_type = 'adjustment')

ALTER TABLE public.stock_movements
  ADD COLUMN adjustment_reason TEXT
  CHECK (adjustment_reason IS NULL OR adjustment_reason IN (
    'recount', 'breakage', 'theft_loss', 'expiry', 'data_correction', 'other'
  ));
```

- [ ] **Step 2: Aplicar la migración contra la base de Supabase del proyecto**

Run: `npx supabase db push`
Expected: la migración `010_adjustment_reason.sql` se aplica sin error y queda listada como aplicada.

- [ ] **Step 3: Actualizar `lib/types/database.types.ts` — bloque `Row`**

Old string (dentro de `stock_movements`):
```ts
        Row: {
          id: string
          movement_type: 'purchase_receipt' | 'consumption' | 'transfer' | 'adjustment' | 'initial'
          product_id: string
          warehouse_id: string
          quantity: number
          unit_price: number | null
          currency: 'ARS' | 'USD' | null
          reference_id: string | null
          notes: string | null
          created_by: string
          organization_id: string | null
          created_at: string
          lot_id: string | null
        }
```

New string:
```ts
        Row: {
          id: string
          movement_type: 'purchase_receipt' | 'consumption' | 'transfer' | 'adjustment' | 'initial'
          product_id: string
          warehouse_id: string
          quantity: number
          unit_price: number | null
          currency: 'ARS' | 'USD' | null
          reference_id: string | null
          notes: string | null
          created_by: string
          organization_id: string | null
          created_at: string
          lot_id: string | null
          adjustment_reason: 'recount' | 'breakage' | 'theft_loss' | 'expiry' | 'data_correction' | 'other' | null
        }
```

- [ ] **Step 4: Actualizar el bloque `Insert` de `stock_movements`**

Old string:
```ts
        Insert: {
          id?: string
          movement_type: 'purchase_receipt' | 'consumption' | 'transfer' | 'adjustment' | 'initial'
          product_id: string
          warehouse_id: string
          quantity: number
          unit_price?: number | null
          currency?: 'ARS' | 'USD' | null
          reference_id?: string | null
          notes?: string | null
          created_by: string
          organization_id?: string | null
          created_at?: string
          lot_id?: string | null
        }
```

New string:
```ts
        Insert: {
          id?: string
          movement_type: 'purchase_receipt' | 'consumption' | 'transfer' | 'adjustment' | 'initial'
          product_id: string
          warehouse_id: string
          quantity: number
          unit_price?: number | null
          currency?: 'ARS' | 'USD' | null
          reference_id?: string | null
          notes?: string | null
          created_by: string
          organization_id?: string | null
          created_at?: string
          lot_id?: string | null
          adjustment_reason?: 'recount' | 'breakage' | 'theft_loss' | 'expiry' | 'data_correction' | 'other' | null
        }
```

- [ ] **Step 5: Actualizar el bloque `Update` de `stock_movements`**

Agregar la misma línea `adjustment_reason?: 'recount' | 'breakage' | 'theft_loss' | 'expiry' | 'data_correction' | 'other' | null` al final del bloque `Update`, siguiendo el mismo patrón que las otras columnas opcionales de ese bloque (ej. `lot_id?: string | null`).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/010_adjustment_reason.sql lib/types/database.types.ts
git commit -m "feat: columna adjustment_reason para ajustes manuales de stock"
```

---

### Task 2: Hook `useAdjustStock`

**Files:**
- Modify: `lib/hooks/use-stock.ts`

**Interfaces:**
- Consumes: `createClient` de `@/lib/supabase/client`, `toast` de `sonner`, `logActivity` de `@/lib/utils/log-activity`, columna `adjustment_reason` de la Task 1.
- Produces: `useAdjustStock()` — hook de mutación que la Task 3 (página) usa así:
  ```ts
  const adjust = useAdjustStock()
  await adjust.mutateAsync({
    productId: string,
    warehouseId: string,
    lotId: string | null,
    delta: number,
    reasonCategory: 'recount' | 'breakage' | 'theft_loss' | 'expiry' | 'data_correction' | 'other',
    notes: string,
    userId: string,
    orgId: string,
  })
  ```
  Expone `adjust.isPending: boolean`.

- [ ] **Step 1: Agregar `useAdjustStock` al final de `lib/hooks/use-stock.ts`**

```ts
export function useAdjustStock() {
  const supabase = createClient()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      productId,
      warehouseId,
      lotId,
      delta,
      reasonCategory,
      notes,
      userId,
      orgId,
    }: {
      productId: string
      warehouseId: string
      lotId: string | null
      delta: number
      reasonCategory: 'recount' | 'breakage' | 'theft_loss' | 'expiry' | 'data_correction' | 'other'
      notes: string
      userId: string
      orgId: string
    }) => {
      const { error } = await supabase.from('stock_movements').insert({
        movement_type: 'adjustment',
        product_id: productId,
        warehouse_id: warehouseId,
        lot_id: lotId,
        quantity: delta,
        adjustment_reason: reasonCategory,
        notes,
        created_by: userId,
        organization_id: orgId,
      })
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['current-stock'] })
      qc.invalidateQueries({ queryKey: ['stock-movements'] })
      qc.invalidateQueries({ queryKey: ['lot-stock'] })
      toast.success('Ajuste registrado. Stock actualizado.')
      logActivity({
        action: 'adjust_stock',
        entityType: 'stock_movement',
        userId: variables.userId,
        orgId: variables.orgId,
      })
    },
    onError: () => toast.error('Error al registrar el ajuste'),
  })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores (el `insert` no está type-checkeado contra `Database` porque el cliente no pasa ese generic — ver Global Constraints — así que este paso valida el resto del archivo, no el `insert` en sí).

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-stock.ts
git commit -m "feat: hook useAdjustStock para registrar ajustes manuales"
```

---

### Task 3: Ítem de menú + página de Ajuste de Stock

**Files:**
- Modify: `components/layout/nav-items.ts`
- Create: `app/(app)/movements/adjustment/page.tsx`

**Interfaces:**
- Consumes:
  - `useCurrentStock()` de `@/lib/hooks/use-stock` → `StockEntry[]` (`{ product_id, warehouse_id, quantity, products, warehouses }`).
  - `useActiveLots(productId, warehouseId)` de `@/lib/hooks/use-stock` → `CurrentLotStock[]` (`{ lot_id, product_id, warehouse_id, lote, fecha_vencimiento, quantity }`), ya filtrado a `quantity > 0`.
  - `useWarehouses()` de `@/lib/hooks/use-products` → `Warehouse[]` (`{ id, name, ... }`).
  - `useAdjustStock()` de la Task 2.
  - `useUser()` de `@/lib/hooks/use-user` → `{ id, role, organization_id, ... } | null`.
- Produces: nada consumido por otras tasks (es la hoja del árbol de dependencias).

- [ ] **Step 1: Importar el ícono `PenLine`**

Old string:
```ts
import {
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
  Sprout,
  ArrowLeftRight,
  Settings,
  Warehouse,
  Package,
  ActivitySquare,
  BookOpen,
  Truck,
  Database,
} from 'lucide-react'
```

New string:
```ts
import {
  LayoutDashboard,
  PackageSearch,
  ShoppingCart,
  Sprout,
  ArrowLeftRight,
  Settings,
  Warehouse,
  Package,
  ActivitySquare,
  BookOpen,
  Truck,
  Database,
  PenLine,
} from 'lucide-react'
```

- [ ] **Step 2: Agregar el ítem "Ajuste de Stock" después de "Transferencia"**

Old string:
```ts
  {
    label: 'Transferencia',
    href: '/movements/transfer',
    icon: Truck,
    roles: ['admin', 'manager'],
  },
  {
    label: 'Silos Bolsa',
```

New string:
```ts
  {
    label: 'Transferencia',
    href: '/movements/transfer',
    icon: Truck,
    roles: ['admin', 'manager'],
  },
  {
    label: 'Ajuste de Stock',
    href: '/movements/adjustment',
    icon: PenLine,
    roles: ['admin', 'manager'],
  },
  {
    label: 'Silos Bolsa',
```

- [ ] **Step 3: Crear la página**

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCurrentStock, useActiveLots, useAdjustStock } from '@/lib/hooks/use-stock'
import { useWarehouses } from '@/lib/hooks/use-products'
import { useUser } from '@/lib/hooks/use-user'
import { ClipboardCheck, Loader2 } from 'lucide-react'

const REASON_CATEGORIES: { value: string; label: string }[] = [
  { value: 'recount', label: 'Recuento físico' },
  { value: 'breakage', label: 'Rotura/derrame' },
  { value: 'theft_loss', label: 'Robo o pérdida' },
  { value: 'expiry', label: 'Vencimiento' },
  { value: 'data_correction', label: 'Corrección de carga' },
  { value: 'other', label: 'Otro' },
]

const NO_LOT = '__no_lot__'

const adjustmentSchema = z.object({
  product_id:        z.string().min(1, 'Seleccioná un producto'),
  warehouse_id:      z.string().min(1, 'Seleccioná el depósito'),
  lot_id:            z.string().min(1),
  counted_quantity:  z.number().min(0, 'La cantidad no puede ser negativa'),
  reason_category:   z.enum(['recount', 'breakage', 'theft_loss', 'expiry', 'data_correction', 'other']),
  reason_detail:     z.string().min(3, 'Contá brevemente el motivo'),
})
type AdjustmentData = z.infer<typeof adjustmentSchema>

export default function AdjustmentPage() {
  const router = useRouter()
  const { data: user } = useUser()

  if (user && user.role === 'engineer') {
    router.replace('/stock')
    return null
  }

  const { data: stockData = [] } = useCurrentStock()
  const { data: allWarehouses = [] } = useWarehouses()
  const adjust = useAdjustStock()

  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null)

  const form = useForm<AdjustmentData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      product_id: '', warehouse_id: '', lot_id: NO_LOT,
      counted_quantity: undefined, reason_category: undefined, reason_detail: '',
    },
  })

  const { data: activeLots = [] } = useActiveLots(selectedProduct, selectedWarehouse)

  // Productos únicos que tienen stock en algún depósito
  const products = useMemo(() => {
    const map = new Map<string, { id: string; name: string; brand: string | null; unit: string }>()
    stockData.forEach(e => {
      const p = e.products as { id: string; name: string; brand: string | null; unit: string } | null
      if (p && !map.has(p.id)) map.set(p.id, p)
    })
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [stockData])

  const warehouses = useMemo(
    () => [...allWarehouses].sort((a, b) => a.name.localeCompare(b.name)),
    [allWarehouses]
  )

  const selectedUnit = useMemo(() => {
    const p = products.find(p => p.id === selectedProduct)
    return p?.unit ?? ''
  }, [products, selectedProduct])

  const selectedLotId = form.watch('lot_id')

  // Stock actual de la combinación elegida (por lote, o producto+depósito si no hay lote)
  const currentQuantity = useMemo(() => {
    if (!selectedProduct || !selectedWarehouse) return null
    if (selectedLotId && selectedLotId !== NO_LOT) {
      const lot = activeLots.find(l => l.lot_id === selectedLotId)
      return lot?.quantity ?? 0
    }
    const entry = stockData.find(e => e.product_id === selectedProduct && e.warehouse_id === selectedWarehouse)
    return entry?.quantity ?? 0
  }, [stockData, activeLots, selectedProduct, selectedWarehouse, selectedLotId])

  const countedQuantity = form.watch('counted_quantity')
  const delta = useMemo(() => {
    if (currentQuantity === null || countedQuantity === undefined || Number.isNaN(countedQuantity)) return null
    return countedQuantity - currentQuantity
  }, [currentQuantity, countedQuantity])

  async function onSubmit(data: AdjustmentData) {
    if (!user?.id || !user?.organization_id) return
    if (currentQuantity === null) return
    const finalDelta = data.counted_quantity - currentQuantity
    if (finalDelta === 0) {
      form.setError('counted_quantity', { message: 'La cantidad contada es igual al stock actual — no hay nada para ajustar' })
      return
    }
    await adjust.mutateAsync({
      productId: data.product_id,
      warehouseId: data.warehouse_id,
      lotId: data.lot_id === NO_LOT ? null : data.lot_id,
      delta: finalDelta,
      reasonCategory: data.reason_category,
      notes: data.reason_detail,
      userId: user.id,
      orgId: user.organization_id,
    })
    router.push('/movements')
  }

  return (
    <div className="max-w-xl">
      <PageHeader
        title="Ajuste de Stock"
        description="Corregir el stock registrado contra un recuento físico real"
      />

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* Producto */}
            <div className="space-y-1.5">
              <Label>Producto *</Label>
              <Select
                value={form.watch('product_id')}
                onValueChange={(v) => {
                  form.setValue('product_id', v ?? '')
                  form.setValue('warehouse_id', '')
                  form.setValue('lot_id', NO_LOT)
                  setSelectedProduct(v ?? null)
                  setSelectedWarehouse(null)
                }}
                items={Object.fromEntries(products.map(p => [p.id, `${p.name}${p.brand ? ` — ${p.brand}` : ''}`]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un producto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{p.brand ? ` — ${p.brand}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.product_id && (
                <p className="text-xs text-red-500">{form.formState.errors.product_id.message}</p>
              )}
            </div>

            {/* Depósito */}
            <div className="space-y-1.5">
              <Label>Depósito *</Label>
              <Select
                value={form.watch('warehouse_id')}
                onValueChange={(v) => {
                  form.setValue('warehouse_id', v ?? '')
                  form.setValue('lot_id', NO_LOT)
                  setSelectedWarehouse(v ?? null)
                }}
                items={Object.fromEntries(warehouses.map(w => [w.id, w.name]))}
                disabled={!selectedProduct}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un depósito..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.warehouse_id && (
                <p className="text-xs text-red-500">{form.formState.errors.warehouse_id.message}</p>
              )}
            </div>

            {/* Lote (solo si hay lotes activos) */}
            {activeLots.length > 0 && (
              <div className="space-y-1.5">
                <Label>Lote</Label>
                <Select
                  value={selectedLotId}
                  onValueChange={(v) => form.setValue('lot_id', v ?? NO_LOT)}
                  items={{
                    [NO_LOT]: 'Sin lote específico — ajuste general',
                    ...Object.fromEntries(activeLots.map(l => [l.lot_id, `${l.lote} (${l.quantity} ${selectedUnit})`])),
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin lote específico..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_LOT}>Sin lote específico — ajuste general</SelectItem>
                    {activeLots.map(l => (
                      <SelectItem key={l.lot_id} value={l.lot_id}>
                        {l.lote}
                        <span className="ml-1 text-gray-400 text-xs">
                          ({l.quantity} {selectedUnit}{l.fecha_vencimiento ? ` · vence ${l.fecha_vencimiento}` : ''})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Cantidad real contada */}
            <div className="space-y-1.5">
              <Label>
                Cantidad real contada *
                {currentQuantity !== null && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    Stock actual: {currentQuantity} {selectedUnit}
                  </span>
                )}
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  type="number"
                  step="any"
                  min={0}
                  placeholder="0"
                  disabled={!selectedWarehouse}
                  {...form.register('counted_quantity', { valueAsNumber: true })}
                />
                {selectedUnit && (
                  <span className="text-sm text-gray-500 shrink-0">{selectedUnit}</span>
                )}
              </div>
              {form.formState.errors.counted_quantity && (
                <p className="text-xs text-red-500">{form.formState.errors.counted_quantity.message}</p>
              )}
              {delta !== null && delta !== 0 && (
                <p className={delta > 0 ? 'text-xs text-green-600' : 'text-xs text-red-500'}>
                  Se registrará un ajuste de {delta > 0 ? '+' : ''}{delta} {selectedUnit}
                </p>
              )}
            </div>

            {/* Motivo */}
            <div className="space-y-1.5">
              <Label>Motivo *</Label>
              <Select
                value={form.watch('reason_category')}
                onValueChange={(v) => form.setValue('reason_category', v as AdjustmentData['reason_category'])}
                items={Object.fromEntries(REASON_CATEGORIES.map(r => [r.value, r.label]))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccioná un motivo..." />
                </SelectTrigger>
                <SelectContent>
                  {REASON_CATEGORIES.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.reason_category && (
                <p className="text-xs text-red-500">{form.formState.errors.reason_category.message}</p>
              )}
            </div>

            {/* Detalle del motivo */}
            <div className="space-y-1.5">
              <Label>Detalle *</Label>
              <Input placeholder="Ej.: bidón roto en descarga del 12/08" {...form.register('reason_detail')} />
              {form.formState.errors.reason_detail && (
                <p className="text-xs text-red-500">{form.formState.errors.reason_detail.message}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={adjust.isPending}
                className="bg-green-700 hover:bg-green-800 gap-2"
              >
                {adjust.isPending
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <ClipboardCheck className="h-4 w-4" />}
                Confirmar ajuste
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Levantar el servidor de desarrollo y probar manualmente**

Run: `npm run dev`

Casos a verificar en el navegador (logueado como `admin` o `manager`):
1. Ir a "Ajuste de Stock" en el menú → carga sin errores.
2. Elegir un producto sin lotes activos → el selector de Lote no aparece, se puede cargar cantidad y motivo directo.
3. Elegir un producto con lotes activos → aparece el selector de Lote con "Sin lote específico" + cada lote y su cantidad/vencimiento.
4. Cargar la misma cantidad que el stock actual → al enviar, error "no hay nada para ajustar", no se crea movimiento.
5. Cargar una cantidad distinta → aparece el texto "Se registrará un ajuste de +/-N", se puede confirmar, redirige a `/movements` y el nuevo movimiento aparece con ícono/label "Ajuste".
6. Loguearse como `engineer` y navegar a `/movements/adjustment` directamente → redirige a `/stock`.

Expected: los 6 casos se comportan como se describe.

- [ ] **Step 6: Commit**

```bash
git add components/layout/nav-items.ts "app/(app)/movements/adjustment/page.tsx"
git commit -m "feat: pagina y menu de ajuste manual de stock"
```

---

### Task 4: Documentación

**Files:**
- Modify: `docs/manual-usuario.md`
- Modify: `app/(app)/manual/page.tsx`

**Interfaces:**
- Consumes: nada (tarea de documentación, no de código).
- Produces: nada.

- [ ] **Step 1: `docs/manual-usuario.md` — agregar el ítem al índice**

Old string:
```
12. [Módulo Silos Bolsa (IoT)](#12-módulo-silos-bolsa-iot)
```

New string:
```
12. [Módulo Silos Bolsa (IoT)](#12-módulo-silos-bolsa-iot)
13. [Flujo: Ajuste manual de stock](#13-flujo-ajuste-manual-de-stock)
```

- [ ] **Step 2: `docs/manual-usuario.md` — agregar la fila a la tabla de roles**

Old string:
```
| Transferir stock entre depósitos | — | ✓ | ✓ |
```

New string:
```
| Transferir stock entre depósitos | — | ✓ | ✓ |
| Ajustar stock manualmente | — | ✓ | ✓ |
```

- [ ] **Step 3: `docs/manual-usuario.md` — agregar la sección al final del documento**

Old string:
```
---

*Para soporte técnico o reportar un problema, contactar al administrador del sistema.*
```

New string:
```
---

## 13. Flujo: Ajuste manual de stock

**Quién lo hace:** Manager o Admin

Permite corregir el stock registrado contra un recuento físico real (por recuento, rotura/derrame, robo o pérdida, vencimiento de un lote, o corrección de una carga anterior mal hecha), sin pasar por una orden de compra ni una transferencia.

1. En el menú lateral, ir a **Ajuste de Stock**.
2. Seleccionar el **producto**.
3. Seleccionar el **depósito**.
4. Si el producto tiene lotes activos en ese depósito, seleccionar el **lote** a ajustar, o "Sin lote específico" para un ajuste general.
5. Ingresar la **cantidad real contada**. El sistema calcula automáticamente la diferencia contra el stock actual — no hace falta calcular el ajuste a mano.
6. Seleccionar el **motivo** (Recuento físico, Rotura/derrame, Robo o pérdida, Vencimiento, Corrección de carga, Otro) y agregar un **detalle** obligatorio.
7. Hacer clic en **Confirmar ajuste**.

Si la cantidad contada es igual al stock actual, el sistema no permite confirmar (no hay nada que ajustar).

Los movimientos quedan registrados en el historial con tipo **Ajuste** y pueden verse en la sección Movimientos.

---

*Para soporte técnico o reportar un problema, contactar al administrador del sistema.*
```

- [ ] **Step 4: `app/(app)/manual/page.tsx` — agregar la fila a la tabla de roles**

Old string:
```tsx
                ['Transferir stock entre depósitos', false, true, true],
```

New string:
```tsx
                ['Transferir stock entre depósitos', false, true, true],
                ['Ajustar stock manualmente', false, true, true],
```

- [ ] **Step 5: `app/(app)/manual/page.tsx` — agregar la nueva sección antes del footer**

Old string:
```tsx
        <div className="border-t border-gray-200 mt-10 pt-4 text-xs text-gray-400 text-center">
          Para soporte técnico o reportar un problema, contactar al administrador del sistema.
        </div>
```

New string:
```tsx
        <Section title="13. Ajuste manual de stock">
          <p className="text-xs text-gray-500 mb-3">Quién lo hace: Manager o Admin — menú: Ajuste de Stock</p>
          <p className="text-sm text-gray-700 mb-3">
            Permite corregir el stock registrado contra un recuento físico real (recuento, rotura/derrame, robo o
            pérdida, vencimiento de un lote, o corrección de una carga anterior), sin pasar por una orden de compra
            ni una transferencia.
          </p>
          <Steps steps={[
            'En el menú lateral, ir a Ajuste de Stock.',
            'Seleccionar el producto y el depósito.',
            'Si el producto tiene lotes activos, seleccionar el lote a ajustar (o "Sin lote específico").',
            'Ingresar la cantidad real contada — el sistema calcula la diferencia automáticamente.',
            'Seleccionar el motivo y agregar un detalle obligatorio.',
            'Hacer clic en Confirmar ajuste.',
          ]} />
          <Note>Si la cantidad contada es igual al stock actual, el sistema no permite confirmar. Los movimientos quedan en el historial con tipo Ajuste.</Note>
        </Section>

        <div className="border-t border-gray-200 mt-10 pt-4 text-xs text-gray-400 text-center">
          Para soporte técnico o reportar un problema, contactar al administrador del sistema.
        </div>
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 7: Revisión visual del manual**

Run: `npm run dev`, ir a `/manual` logueado, confirmar que la sección 13 se ve bien y la tabla de roles muestra la fila nueva.

- [ ] **Step 8: Commit**

```bash
git add docs/manual-usuario.md "app/(app)/manual/page.tsx"
git commit -m "docs: documentar ajuste manual de stock"
```

---

## Self-Review Notes

- **Cobertura del spec:** flujo/UI → Task 3; modelo de datos (`adjustment_reason`, reutilización de `stock_movements`/`lot_id`) → Task 1 + 2; nav/permisos → Task 3 (ítem de menú + guard de rol en la página, en el mismo commit para no dejar un link roto); validación (cantidad no negativa, bloqueo si delta=0, redirect `engineer`) → Task 3; testing → pasos manuales en Task 3 (no hay test runner en el repo); documentación → Task 4. Sin gaps.
- **Placeholders:** ninguno — todos los pasos de código tienen el código completo, no hay "TBD" ni "similar a la Task N" sin repetir el contenido.
- **Consistencia de tipos:** `reasonCategory`/`adjustment_reason` usa el mismo union literal en las tasks que lo tocan (migración, `database.types.ts`, hook, página). `lotId: string | null` en el hook coincide con `lot_id: string | null` de la columna. `delta: number` coincide entre lo que la página calcula y lo que el hook recibe.
- **Fix aplicado en autorevisión:** la Task 3 (ítem de menú) y la Task 4 original (página) se fusionaron en una sola Task 3, porque el ítem de menú solo dejaba un link a una ruta 404 hasta que existiera la página — violaba "cada task termina en un entregable probable de forma independiente". La Task de documentación pasó a ser la Task 4.
