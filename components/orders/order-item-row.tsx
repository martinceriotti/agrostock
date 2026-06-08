'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import type { PurchaseOrderFormData } from '@/lib/validations'

interface Product {
  id: string
  name: string
  unit: string
  brand: string | null
}

interface Warehouse {
  id: string
  name: string
}

interface OrderItemRowProps {
  index: number
  form: UseFormReturn<PurchaseOrderFormData>
  products: Product[]
  warehouses: Warehouse[]
  onRemove: () => void
}

export function OrderItemRow({ index, form, products, warehouses, onRemove }: OrderItemRowProps) {
  const currency = form.watch('currency')

  return (
    <div className="grid gap-2 grid-cols-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto] items-start p-3 bg-gray-50 rounded-lg border">
      {/* Producto */}
      <div className="col-span-2 sm:col-span-1">
        <Select
          value={form.watch(`items.${index}.product_id`)}
          onValueChange={(v) => form.setValue(`items.${index}.product_id`, v ?? '')}
          items={products.map(p => ({ value: p.id, label: `${p.name}${p.brand ? ` — ${p.brand}` : ''} (${p.unit})` }))}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Producto" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}{p.brand ? ` — ${p.brand}` : ''} ({p.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.items?.[index]?.product_id && (
          <p className="text-xs text-red-500 mt-1">Requerido</p>
        )}
      </div>

      {/* Depósito */}
      <div>
        <Select
          value={form.watch(`items.${index}.warehouse_id`)}
          onValueChange={(v) => form.setValue(`items.${index}.warehouse_id`, v ?? '')}
          items={warehouses.map(w => ({ value: w.id, label: w.name }))}
        >
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Depósito" />
          </SelectTrigger>
          <SelectContent>
            {warehouses.map((w) => (
              <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Cantidad */}
      <div>
        <Input
          type="number"
          min="0"
          step="0.01"
          placeholder="Cantidad"
          className="bg-white"
          {...form.register(`items.${index}.quantity_ordered`, { valueAsNumber: true })}
        />
        {form.formState.errors.items?.[index]?.quantity_ordered && (
          <p className="text-xs text-red-500 mt-1">Requerido</p>
        )}
      </div>

      {/* Precio */}
      <div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 shrink-0">{currency}</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Precio unit."
            className="bg-white"
            {...form.register(`items.${index}.unit_price`, { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* Eliminar */}
      <div className="flex justify-end sm:justify-center">
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
