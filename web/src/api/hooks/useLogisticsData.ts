/**
 * React hooks for Logistics data
 * ===============================
 * Follows the same UseDataState<T> pattern as useSalesData.ts.
 */

import { useState, useEffect, useCallback } from 'react'
import logisticsApi from '../services/logistics'
import type {
  OperationsKPIs,
  OperationsActivity,
  DeliveryNote,
  DeliveryDetail,
  DeliveryFilters,
} from '../../components/sections/operations/types'

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// ==========================================================================
// Dashboard Hooks
// ==========================================================================

export function useOperationsKPIs(): UseDataState<OperationsKPIs> {
  const [data, setData] = useState<OperationsKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const kpis = await logisticsApi.getOperationsKPIs()
      setData(kpis)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch operations KPIs'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useRecentOperations(limit = 10): UseDataState<OperationsActivity[]> {
  const [data, setData] = useState<OperationsActivity[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const activities = await logisticsApi.getRecentOperations(limit)
      setData(activities)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch operations activity'))
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useOperationsDashboard() {
  const kpis = useOperationsKPIs()
  const activity = useRecentOperations()

  return {
    kpis: kpis.data,
    recentActivity: activity.data,
    loading: kpis.loading || activity.loading,
    error: kpis.error || activity.error,
    refetch: async () => {
      await Promise.all([kpis.refetch(), activity.refetch()])
    }
  }
}

// ==========================================================================
// Delivery Notes Hooks
// ==========================================================================

export function useDeliveryNotes(filters?: DeliveryFilters): UseDataState<DeliveryNote[]> {
  const [data, setData] = useState<DeliveryNote[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const notes = await logisticsApi.getDeliveryNotes(filters)
      setData(notes)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch delivery notes'))
    } finally {
      setLoading(false)
    }
  }, [filters?.status, filters?.customer, filters?.search])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useDeliveryDetail(deliveryNoteId: string | null): UseDataState<DeliveryDetail> {
  const [data, setData] = useState<DeliveryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    if (!deliveryNoteId) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const detail = await logisticsApi.getDeliveryDetail(deliveryNoteId)
      setData(detail)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch delivery detail'))
    } finally {
      setLoading(false)
    }
  }, [deliveryNoteId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
