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
