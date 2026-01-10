// React hooks for Distributors data
import { useState, useEffect, useCallback } from 'react'
import distributorsApi from '../services/distributors'
import type {
  NetworkKPIs,
  Distributor,
  MyOrder,
  InventoryItem,
  SellOutRecord,
  PortalAnalytics
} from '../../components/sections/distributor-network/types'
import {
  isInBypassMode,
  sampleNetworkKPIs,
  sampleDistributors,
  samplePortalData
} from '../sample-data'

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useDistributorKPIs(): UseDataState<NetworkKPIs> {
  const [data, setData] = useState<NetworkKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const kpis = await distributorsApi.getKPIs()
      setData(kpis)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleNetworkKPIs)
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

export function useDistributors(): UseDataState<Distributor[]> {
  const [data, setData] = useState<Distributor[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const distributors = await distributorsApi.getDistributors()
      setData(distributors)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleDistributors)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch distributors'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useDistributorDashboard() {
  const kpis = useDistributorKPIs()
  const distributors = useDistributors()

  return {
    kpis: kpis.data,
    distributors: distributors.data,
    loading: kpis.loading || distributors.loading,
    error: kpis.error || distributors.error,
    refetch: async () => {
      await Promise.all([kpis.refetch(), distributors.refetch()])
    }
  }
}

// Portal hooks (for distributor users)
export function useMyOrders(): UseDataState<MyOrder[]> {
  const [data, setData] = useState<MyOrder[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const orders = await distributorsApi.getMyOrders()
      setData(orders)
    } catch (err) {
      if (isInBypassMode()) {
        setData(samplePortalData.myOrders)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch orders'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useMyInventory(): UseDataState<InventoryItem[]> {
  const [data, setData] = useState<InventoryItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const inventory = await distributorsApi.getMyInventory()
      setData(inventory)
    } catch (err) {
      if (isInBypassMode()) {
        setData(samplePortalData.myInventory)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch inventory'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useMySellOutRecords(): UseDataState<SellOutRecord[]> {
  const [data, setData] = useState<SellOutRecord[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const records = await distributorsApi.getMySellOutRecords()
      setData(records)
    } catch (err) {
      if (isInBypassMode()) {
        setData(samplePortalData.sellOutRecords)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch sell out records'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function usePortalAnalytics(): UseDataState<PortalAnalytics> {
  const [data, setData] = useState<PortalAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const analytics = await distributorsApi.getPortalAnalytics()
      setData(analytics)
    } catch (err) {
      if (isInBypassMode()) {
        setData(samplePortalData.analytics)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch analytics'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useDistributorPortal() {
  const orders = useMyOrders()
  const inventory = useMyInventory()
  const sellOut = useMySellOutRecords()
  const analytics = usePortalAnalytics()

  return {
    orders: orders.data,
    inventory: inventory.data,
    sellOutRecords: sellOut.data,
    analytics: analytics.data,
    loading: orders.loading || inventory.loading || sellOut.loading || analytics.loading,
    error: orders.error || inventory.error || sellOut.error || analytics.error,
    refetch: async () => {
      await Promise.all([orders.refetch(), inventory.refetch(), sellOut.refetch(), analytics.refetch()])
    },
    submitSellOut: distributorsApi.submitSellOut,
    uploadCSV: distributorsApi.uploadCSV
  }
}
