'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns'

export function useDashboardData() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const now = new Date()
      const monthStart = startOfMonth(now).toISOString()
      const monthEnd = endOfMonth(now).toISOString()
      const sixMonthsAgo = subMonths(now, 5)

      // ── 1. Órdenes activas (pending + partial) ───────────────────
      const { data: activeOrders } = await supabase
        .from('purchase_orders')
        .select('id, status')
        .in('status', ['pending', 'partial'])

      // ── 2. Stock (negativos + bajos) ─────────────────────────────
      const { data: allStock } = await supabase
        .from('current_stock')
        .select(`
          product_id, warehouse_id, quantity,
          products:product_id (id, name, unit, min_stock_alert, brand,
            product_categories:category_id (name, type)
          ),
          warehouses:warehouse_id (id, name)
        `)

      type StockRow = {
        product_id: string; warehouse_id: string; quantity: number
        products: { id: string; name: string; unit: string; min_stock_alert: number | null; brand: string | null; product_categories: { name: string; type: string } | null } | null
        warehouses: { id: string; name: string } | null
      }
      const typedStock = (allStock ?? []) as unknown as StockRow[]
      const negativeItems = typedStock.filter(e => e.quantity < 0)
      const lowStockItems = typedStock.filter(e =>
        e.products?.min_stock_alert != null && e.quantity > 0 && e.quantity <= e.products.min_stock_alert
      )

      // ── 3. Gasto del mes en USD (ARS convertido via exchange_rate) ─
      const { data: monthOrders } = await supabase
        .from('purchase_orders')
        .select('id, exchange_rate, purchase_order_items(quantity_received, unit_price, currency)')
        .not('status', 'eq', 'cancelled')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)

      type OrderWithItems = {
        id: string; exchange_rate: number | null
        purchase_order_items: Array<{ quantity_received: number; unit_price: number | null; currency: string | null }>
      }
      const monthSpendUSD = ((monthOrders ?? []) as unknown as OrderWithItems[]).reduce((total, order) => {
        const rate = order.exchange_rate ?? 1
        return total + (order.purchase_order_items ?? []).reduce((sum, item) => {
          if (!item.unit_price || !item.quantity_received) return sum
          const amount = item.quantity_received * item.unit_price
          return sum + (item.currency === 'ARS' ? amount / rate : amount)
        }, 0)
      }, 0)

      // ── 4. Aplicaciones del mes ───────────────────────────────────
      const { data: monthApps } = await supabase
        .from('field_applications')
        .select('id')
        .gte('application_date', monthStart.slice(0, 10))
        .lte('application_date', monthEnd.slice(0, 10))

      // ── 5. Consumo por categoría + unidad — últimos 6 meses ───────
      const { data: consumptionMovements } = await supabase
        .from('stock_movements')
        .select('quantity, created_at, products:product_id(unit, product_categories:category_id(name))')
        .eq('movement_type', 'consumption')
        .gte('created_at', sixMonthsAgo.toISOString())

      type ConsMov = {
        quantity: number; created_at: string
        products: { unit: string; product_categories: { name: string } | null } | null
      }

      // Meses base
      const months: string[] = []
      for (let i = 5; i >= 0; i--) months.push(format(subMonths(now, i), 'MMM yy'))

      // Acumular por mes × categoría × unidad
      const byLitre: Record<string, Record<string, number>> = {}
      const byKilo: Record<string, Record<string, number>> = {}
      const categorySet = new Set<string>()
      months.forEach(m => { byLitre[m] = {}; byKilo[m] = {} })

      ;((consumptionMovements ?? []) as unknown as ConsMov[]).forEach(m => {
        const monthKey = format(new Date(m.created_at), 'MMM yy')
        if (!months.includes(monthKey)) return
        const cat = m.products?.product_categories?.name ?? 'Otros'
        const unit = m.products?.unit ?? ''
        const qty = Math.abs(m.quantity)
        categorySet.add(cat)
        if (unit === 'kg') {
          byKilo[monthKey][cat] = (byKilo[monthKey][cat] ?? 0) + qty
        } else {
          byLitre[monthKey][cat] = (byLitre[monthKey][cat] ?? 0) + qty
        }
      })

      const categories = [...categorySet].sort()

      const consumptionByUnit = {
        litros: months.map(m => ({ month: m, ...byLitre[m] })),
        kilos:  months.map(m => ({ month: m, ...byKilo[m] })),
        categories,
      }

      // ── 6. Gasto en USD por mes ───────────────────────────────────
      const { data: spendOrders } = await supabase
        .from('purchase_orders')
        .select('id, exchange_rate, created_at, purchase_order_items(quantity_received, unit_price, currency)')
        .not('status', 'eq', 'cancelled')
        .gte('created_at', sixMonthsAgo.toISOString())

      const monthlySpendUSD: Record<string, number> = {}
      months.forEach(m => { monthlySpendUSD[m] = 0 })

      ;((spendOrders ?? []) as unknown as (OrderWithItems & { created_at: string })[]).forEach(order => {
        const monthKey = format(new Date(order.created_at), 'MMM yy')
        if (!(monthKey in monthlySpendUSD)) return
        const rate = order.exchange_rate ?? 1
        const total = (order.purchase_order_items ?? []).reduce((sum, item) => {
          if (!item.unit_price || !item.quantity_received) return sum
          const amount = item.quantity_received * item.unit_price
          return sum + (item.currency === 'ARS' ? amount / rate : amount)
        }, 0)
        monthlySpendUSD[monthKey] += total
      })

      const spendChart = months.map(m => ({
        month: m,
        USD: Number(monthlySpendUSD[m].toFixed(2)),
      }))

      // ── 7. Top 5 productos más consumidos este mes ────────────────
      const { data: topMovements } = await supabase
        .from('stock_movements')
        .select('quantity, products:product_id(name, unit)')
        .eq('movement_type', 'consumption')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)

      type TopMov = { quantity: number; products: { name: string; unit: string } | null }
      const productTotals = new Map<string, { name: string; unit: string; total: number }>()
      ;((topMovements ?? []) as unknown as TopMov[]).forEach(m => {
        if (!m.products) return
        const key = m.products.name
        const prev = productTotals.get(key) ?? { name: m.products.name, unit: m.products.unit, total: 0 }
        productTotals.set(key, { ...prev, total: prev.total + Math.abs(m.quantity) })
      })
      const topConsumed = [...productTotals.values()]
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)

      // ── 8. Últimas aplicaciones ───────────────────────────────────
      const { data: recentApplications } = await supabase
        .from('field_applications')
        .select('id, field_name, application_date, profiles:created_by(full_name)')
        .order('application_date', { ascending: false })
        .limit(5)

      return {
        activeOrdersCount: activeOrders?.length ?? 0,
        negativeCount: negativeItems.length,
        lowStockItems,
        monthSpendUSD,
        monthAppsCount: monthApps?.length ?? 0,
        consumptionByUnit,
        spendChart,
        topConsumed,
        recentApplications: (recentApplications ?? []) as unknown as Array<{
          id: string; field_name: string; application_date: string
          profiles: { full_name: string } | null
        }>,
      }
    },
    refetchInterval: 60_000,
  })
}
