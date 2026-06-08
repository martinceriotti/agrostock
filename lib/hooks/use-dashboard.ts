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

      // 1. Órdenes pendientes
      const { data: pendingOrders } = await supabase
        .from('purchase_orders')
        .select('id', { count: 'exact' })
        .in('status', ['pending', 'partial'])

      // 2. Stock bajo mínimo
      const { data: allStock } = await supabase
        .from('current_stock')
        .select(`
          product_id, warehouse_id, quantity,
          products:product_id (id, name, unit, min_stock_alert, brand,
            product_categories:category_id (name, type)
          )
        `)

      type StockRow = { product_id: string; warehouse_id: string; quantity: number; products: { id: string; name: string; unit: string; min_stock_alert: number | null; brand: string | null; product_categories: { name: string; type: string } | null } | null }
      const typedStock = (allStock ?? []) as unknown as StockRow[]
      const lowStockItems = typedStock.filter(entry => {
        return entry.products?.min_stock_alert != null && entry.quantity <= entry.products.min_stock_alert
      })

      // 3. Gasto del mes (por moneda)
      const { data: monthMovements } = await supabase
        .from('stock_movements')
        .select('quantity, unit_price, currency')
        .eq('movement_type', 'purchase_receipt')
        .gte('created_at', monthStart)
        .lte('created_at', monthEnd)

      type MovRow = { quantity: number; unit_price: number | null; currency: string | null }
      const typedMonth = (monthMovements ?? []) as unknown as MovRow[]
      const monthSpendARS = typedMonth
        .filter(m => m.currency === 'ARS' && m.unit_price)
        .reduce((sum, m) => sum + Math.abs(m.quantity) * (m.unit_price ?? 0), 0)

      const monthSpendUSD = typedMonth
        .filter(m => m.currency === 'USD' && m.unit_price)
        .reduce((sum, m) => sum + Math.abs(m.quantity) * (m.unit_price ?? 0), 0)

      // 4. Consumo últimos 6 meses (para gráfico)
      const sixMonthsAgo = subMonths(now, 5)
      const { data: consumptionMovements } = await supabase
        .from('stock_movements')
        .select('quantity, created_at, products:product_id(name)')
        .eq('movement_type', 'consumption')
        .gte('created_at', sixMonthsAgo.toISOString())

      const monthlyConsumption: Record<string, number> = {}
      for (let i = 5; i >= 0; i--) {
        const monthKey = format(subMonths(now, i), 'MMM yy')
        monthlyConsumption[monthKey] = 0
      }
      type ConsRow = { quantity: number; created_at: string }
      ;((consumptionMovements ?? []) as unknown as ConsRow[]).forEach(m => {
        const monthKey = format(new Date(m.created_at), 'MMM yy')
        if (monthKey in monthlyConsumption) {
          monthlyConsumption[monthKey] += Math.abs(m.quantity)
        }
      })

      const consumptionChart = Object.entries(monthlyConsumption).map(([month, value]) => ({
        month,
        cantidad: Number(value.toFixed(2)),
      }))

      // 5. Gasto últimos 6 meses ARS + USD
      const { data: spendMovements } = await supabase
        .from('stock_movements')
        .select('quantity, unit_price, currency, created_at')
        .eq('movement_type', 'purchase_receipt')
        .gte('created_at', sixMonthsAgo.toISOString())

      const monthlySpend: Record<string, { ARS: number; USD: number }> = {}
      for (let i = 5; i >= 0; i--) {
        const monthKey = format(subMonths(now, i), 'MMM yy')
        monthlySpend[monthKey] = { ARS: 0, USD: 0 }
      }
      type SpendRow = { quantity: number; unit_price: number | null; currency: string | null; created_at: string }
      ;((spendMovements ?? []) as unknown as SpendRow[]).forEach(m => {
        const monthKey = format(new Date(m.created_at), 'MMM yy')
        if (monthKey in monthlySpend && m.unit_price) {
          const cur = (m.currency ?? 'ARS') as 'ARS' | 'USD'
          monthlySpend[monthKey][cur] += Math.abs(m.quantity) * m.unit_price
        }
      })

      const spendChart = Object.entries(monthlySpend).map(([month, values]) => ({
        month,
        ARS: Number(values.ARS.toFixed(0)),
        USD: Number(values.USD.toFixed(2)),
      }))

      // 6. Últimas aplicaciones
      const { data: recentApplications } = await supabase
        .from('field_applications')
        .select('id, field_name, application_date, profiles:created_by(full_name)')
        .order('application_date', { ascending: false })
        .limit(5)

      type RecentApp = {
        id: string
        field_name: string
        application_date: string
        profiles: { full_name: string } | null
      }

      return {
        pendingOrdersCount: pendingOrders?.length ?? 0,
        lowStockItems,
        monthSpendARS,
        monthSpendUSD,
        consumptionChart,
        spendChart,
        recentApplications: (recentApplications ?? []) as unknown as RecentApp[],
        totalProducts: typedStock.length,
      }
    },
    staleTime: 2 * 60 * 1000,
  })
}
