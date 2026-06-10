'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { ProductFormData, ProductCategoryFormData, WarehouseFormData, SupplierFormData } from '@/lib/validations'
import type { ProductCategory, Warehouse, Supplier } from '@/lib/types/database.types'
import { toast } from 'sonner'

export interface ProductWithCategory {
  id: string
  name: string
  brand: string | null
  active_ingredient: string | null
  category_id: string
  unit: 'L' | 'kg' | 'unidad' | 'bolsa'
  description: string | null
  min_stock_alert: number | null
  created_at: string
  product_categories: { id: string; name: string; type: string } | null
}

// ─── Products ─────────────────────────────────────────────

export function useProducts() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<ProductWithCategory[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('*, product_categories(id, name, type)')
        .order('name')
      if (error) throw error
      return (data ?? []) as unknown as ProductWithCategory[]
    },
  })
}

export function useCreateProduct() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ values, orgId }: { values: ProductFormData; orgId: string }) => {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...values, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto creado')
    },
    onError: () => toast.error('Error al crear el producto'),
  })
}

export function useUpdateProduct() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<ProductFormData> }) => {
      const { data, error } = await supabase.from('products').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto actualizado')
    },
    onError: () => toast.error('Error al actualizar el producto'),
  })
}

export function useDeleteProduct() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      toast.success('Producto eliminado')
    },
    onError: () => toast.error('Error al eliminar. El producto puede tener movimientos asociados.'),
  })
}

// ─── Product Detail (price history) ──────────────────────

export interface ProductPurchaseEntry {
  id: string
  quantity_ordered: number
  unit_price: number | null
  currency: 'ARS' | 'USD'
  lote: string | null
  fecha_vencimiento: string | null
  price_usd: number | null
  order: {
    id: string
    order_number: string
    ordered_at: string
    currency: 'ARS' | 'USD'
    exchange_rate: number | null
  }
  supplier: { id: string; name: string } | null
}

export function useProductDetail(productId: string) {
  const supabase = createClient()
  return useQuery({
    queryKey: ['product-detail', productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProductPurchaseEntry[]> => {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          id, quantity_ordered, unit_price, currency, lote, fecha_vencimiento,
          purchase_orders!inner(id, order_number, ordered_at, currency, exchange_rate, status, suppliers(id, name))
        `)
        .eq('product_id', productId)

      if (error) throw error

      type RawItem = {
        id: string
        quantity_ordered: number
        unit_price: number | null
        currency: 'ARS' | 'USD'
        lote: string | null
        fecha_vencimiento: string | null
        purchase_orders: {
          id: string
          order_number: string
          ordered_at: string
          currency: 'ARS' | 'USD'
          exchange_rate: number | null
          status: string
          suppliers: { id: string; name: string } | null
        }
      }

      return ((data ?? []) as unknown as RawItem[])
        .filter(item => item.purchase_orders.status !== 'cancelled')
        .map(item => {
          const po = item.purchase_orders
          let price_usd: number | null = null
          if (item.unit_price != null) {
            if (item.currency === 'USD') {
              price_usd = item.unit_price
            } else if (po.exchange_rate && po.exchange_rate > 0) {
              price_usd = item.unit_price / po.exchange_rate
            }
          }
          return {
            id: item.id,
            quantity_ordered: item.quantity_ordered,
            unit_price: item.unit_price,
            currency: item.currency,
            lote: item.lote,
            fecha_vencimiento: item.fecha_vencimiento,
            price_usd,
            order: {
              id: po.id,
              order_number: po.order_number,
              ordered_at: po.ordered_at,
              currency: po.currency,
              exchange_rate: po.exchange_rate,
            },
            supplier: po.suppliers,
          }
        })
        .sort((a, b) => new Date(b.order.ordered_at).getTime() - new Date(a.order.ordered_at).getTime())
    },
  })
}

// ─── Categories ───────────────────────────────────────────

export function useCategories() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['categories'],
    queryFn: async (): Promise<ProductCategory[]> => {
      const { data, error } = await supabase.from('product_categories').select('*').order('name')
      if (error) throw error
      return (data ?? []) as ProductCategory[]
    },
  })
}

export function useCreateCategory() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ values, orgId }: { values: ProductCategoryFormData; orgId: string }) => {
      const { data, error } = await supabase
        .from('product_categories')
        .insert({ ...values, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría creada')
    },
    onError: () => toast.error('Error al crear la categoría'),
  })
}

// ─── Warehouses ───────────────────────────────────────────

export function useWarehouses() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async (): Promise<Warehouse[]> => {
      const { data, error } = await supabase.from('warehouses').select('*').order('name')
      if (error) throw error
      return (data ?? []) as Warehouse[]
    },
  })
}

export function useCreateWarehouse() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ values, orgId }: { values: WarehouseFormData; orgId: string }) => {
      const { data, error } = await supabase
        .from('warehouses')
        .insert({ ...values, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Depósito creado')
    },
    onError: () => toast.error('Error al crear el depósito'),
  })
}

export function useUpdateWarehouse() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: WarehouseFormData }) => {
      const { data, error } = await supabase.from('warehouses').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Depósito actualizado')
    },
    onError: () => toast.error('Error al actualizar'),
  })
}

// ─── Suppliers ────────────────────────────────────────────

export function useSuppliers() {
  const supabase = createClient()
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async (): Promise<Supplier[]> => {
      const { data, error } = await supabase.from('suppliers').select('*').order('name')
      if (error) throw error
      return (data ?? []) as Supplier[]
    },
  })
}

export function useCreateSupplier() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ values, orgId }: { values: SupplierFormData; orgId: string }) => {
      const { data, error } = await supabase
        .from('suppliers')
        .insert({ ...values, organization_id: orgId })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Proveedor creado')
    },
    onError: () => toast.error('Error al crear el proveedor'),
  })
}

export function useUpdateSupplier() {
  const supabase = createClient()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: SupplierFormData }) => {
      const { data, error } = await supabase.from('suppliers').update(values).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Proveedor actualizado')
    },
    onError: () => toast.error('Error al actualizar'),
  })
}
