'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormData } from '@/lib/validations'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useCategories } from '@/lib/hooks/use-products'
import type { Product } from '@/lib/types/database.types'
import { Loader2 } from 'lucide-react'

interface ProductFormProps {
  defaultValues?: Partial<Product>
  onSubmit: (data: ProductFormData) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
}

export function ProductForm({ defaultValues, onSubmit, onCancel, isLoading }: ProductFormProps) {
  const { data: categories = [] } = useCategories()

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: defaultValues?.name ?? '',
      brand: defaultValues?.brand ?? '',
      category_id: defaultValues?.category_id ?? '',
      unit: defaultValues?.unit ?? 'L',
      description: defaultValues?.description ?? '',
      min_stock_alert: defaultValues?.min_stock_alert ?? null,
    },
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Nombre *</Label>
          <Input id="name" {...form.register('name')} placeholder="Ej: Roundup Max" />
          {form.formState.errors.name && (
            <p className="text-xs text-red-500">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="brand">Marca</Label>
          <Input id="brand" {...form.register('brand')} placeholder="Ej: Monsanto" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Categoría *</Label>
          <Select
            value={form.watch('category_id')}
            onValueChange={(v) => form.setValue('category_id', v ?? '')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccioná una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.formState.errors.category_id && (
            <p className="text-xs text-red-500">{form.formState.errors.category_id.message}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label>Unidad *</Label>
          <Select
            value={form.watch('unit')}
            onValueChange={(v) => form.setValue('unit', v as ProductFormData['unit'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="L">Litros (L)</SelectItem>
              <SelectItem value="kg">Kilogramos (kg)</SelectItem>
              <SelectItem value="unidad">Unidad</SelectItem>
              <SelectItem value="bolsa">Bolsa</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="min_stock_alert">Stock mínimo para alerta</Label>
        <Input
          id="min_stock_alert"
          type="number"
          step="0.1"
          min="0"
          placeholder="Ej: 10"
          {...form.register('min_stock_alert', { valueAsNumber: true })}
        />
        <p className="text-xs text-gray-500">Se mostrará una alerta cuando el stock baje de este valor.</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" {...form.register('description')} rows={2} placeholder="Observaciones adicionales..." />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading} className="bg-green-700 hover:bg-green-800">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
        </Button>
      </div>
    </form>
  )
}
