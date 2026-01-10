// React hooks for Sales data
import { useState, useCallback } from 'react'
import salesApi from '../services/sales'
import type { Product, CreateOrderData, CreateOrderResponse } from '../services/sales'
import type {
  KPIs,
  Customer,
  SalesOrder,
  Opportunity,
  Activity,
  SalesTrends
} from '../../components/sections/sell-in-operations/types'
import {
  isInBypassMode,
  sampleSalesKPIs,
  sampleSalesTrends,
  sampleRecentActivity,
  sampleCustomers,
  sampleOrders,
  sampleOpportunities
} from '../sample-data'
import { createDataHook, type UseDataState } from './createDataHook'

export const useSalesKPIs = createDataHook<KPIs>({
  apiMethod: salesApi.getKPIs,
  sampleData: sampleSalesKPIs,
  errorMessage: 'Failed to fetch KPIs'
})

export const useCustomers = createDataHook<Customer[], { type?: string; status?: string; search?: string }>({
  apiMethod: salesApi.getCustomers,
  sampleData: sampleCustomers,
  errorMessage: 'Failed to fetch customers'
})

export const useOrders = createDataHook<SalesOrder[], { status?: string; customerId?: string; search?: string }>({
  apiMethod: salesApi.getOrders,
  sampleData: sampleOrders as SalesOrder[],
  errorMessage: 'Failed to fetch orders'
})

export const useOpportunities = createDataHook<Opportunity[]>({
  apiMethod: salesApi.getOpportunities,
  sampleData: sampleOpportunities,
  errorMessage: 'Failed to fetch opportunities'
})

export const useRecentActivity = createDataHook<Activity[]>({
  apiMethod: salesApi.getRecentActivity,
  sampleData: sampleRecentActivity as Activity[],
  errorMessage: 'Failed to fetch activity'
})

export const useSalesTrends = createDataHook<SalesTrends>({
  apiMethod: salesApi.getSalesTrends,
  sampleData: sampleSalesTrends as SalesTrends,
  errorMessage: 'Failed to fetch trends'
})

export function useSalesDashboard() {
  const kpis = useSalesKPIs()
  const activity = useRecentActivity()
  const trends = useSalesTrends()

  return {
    kpis: kpis.data,
    recentActivity: activity.data,
    salesTrends: trends.data,
    loading: kpis.loading || activity.loading || trends.loading,
    error: kpis.error || activity.error || trends.error,
    refetch: async () => {
      await Promise.all([kpis.refetch(), activity.refetch(), trends.refetch()])
    }
  }
}

// Sample products for bypass mode
const sampleProducts: Product[] = [
  { name: 'MEZCAL-JOVEN-750', item_name: 'Mezcal Joven 750ml', item_code: 'MEZCAL-JOVEN-750', stock_uom: 'Nos', standard_rate: 1200, image: null, available_stock: 150 },
  { name: 'MEZCAL-REP-750', item_name: 'Mezcal Reposado 750ml', item_code: 'MEZCAL-REP-750', stock_uom: 'Nos', standard_rate: 1400, image: null, available_stock: 80 },
  { name: 'MEZCAL-ANEJO-750', item_name: 'Mezcal Añejo 750ml', item_code: 'MEZCAL-ANEJO-750', stock_uom: 'Nos', standard_rate: 1800, image: null, available_stock: 45 },
  { name: 'MEZCAL-ESP-750', item_name: 'Mezcal Edición Especial 750ml', item_code: 'MEZCAL-ESP-750', stock_uom: 'Nos', standard_rate: 2500, image: null, available_stock: 20 }
]

export const useProducts = createDataHook<Product[], string>({
  apiMethod: salesApi.getProducts,
  sampleData: sampleProducts,
  errorMessage: 'Failed to fetch products',
  bypassTransformer: (data, search) =>
    search ? data.filter(p => p.item_name.toLowerCase().includes(search.toLowerCase())) : data
})

export function useCreateOrder() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createOrder = useCallback(async (orderData: CreateOrderData): Promise<CreateOrderResponse | null> => {
    setLoading(true)
    setError(null)
    try {
      const result = await salesApi.createOrder(orderData)
      return result
    } catch (err) {
      if (isInBypassMode()) {
        // Simulate order creation in bypass mode
        return {
          success: true,
          order_id: `SO-DEMO-${Date.now()}`,
          total: orderData.items.reduce((sum, item) => sum + (item.qty * item.rate), 0)
        }
      }
      setError(err instanceof Error ? err : new Error('Failed to create order'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createOrder, loading, error }
}
