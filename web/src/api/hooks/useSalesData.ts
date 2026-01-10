// React hooks for Sales data
import { useState, useEffect, useCallback } from 'react'
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

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useSalesKPIs(): UseDataState<KPIs> {
  const [data, setData] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const kpis = await salesApi.getKPIs()
      setData(kpis)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleSalesKPIs)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch KPIs'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useCustomers(filters?: { type?: string; status?: string; search?: string }): UseDataState<Customer[]> {
  const [data, setData] = useState<Customer[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const customers = await salesApi.getCustomers(filters)
      setData(customers)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleCustomers)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch customers'))
      }
    } finally {
      setLoading(false)
    }
  }, [filters?.type, filters?.status, filters?.search])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useOrders(filters?: { status?: string; customerId?: string; search?: string }): UseDataState<SalesOrder[]> {
  const [data, setData] = useState<SalesOrder[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orders = await salesApi.getOrders(filters)
      setData(orders)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleOrders as SalesOrder[])
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch orders'))
      }
    } finally {
      setLoading(false)
    }
  }, [filters?.status, filters?.customerId, filters?.search])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useOpportunities(): UseDataState<Opportunity[]> {
  const [data, setData] = useState<Opportunity[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const opps = await salesApi.getOpportunities()
      setData(opps)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleOpportunities)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch opportunities'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useRecentActivity(): UseDataState<Activity[]> {
  const [data, setData] = useState<Activity[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const activity = await salesApi.getRecentActivity()
      setData(activity)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleRecentActivity as Activity[])
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch activity'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useSalesTrends(): UseDataState<SalesTrends> {
  const [data, setData] = useState<SalesTrends | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const trends = await salesApi.getSalesTrends()
      setData(trends)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleSalesTrends as SalesTrends)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch trends'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

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

export function useProducts(search?: string): UseDataState<Product[]> {
  const [data, setData] = useState<Product[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const products = await salesApi.getProducts(search)
      setData(products)
    } catch (err) {
      if (isInBypassMode()) {
        // Filter sample products by search term
        const filtered = search
          ? sampleProducts.filter(p => p.item_name.toLowerCase().includes(search.toLowerCase()))
          : sampleProducts
        setData(filtered)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch products'))
      }
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

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
