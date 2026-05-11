// React hooks for Custom KPIs
import { useState, useEffect, useCallback } from 'react'
import customKPIApi from '../services/custom-kpis'
import type {
  CustomKPI,
  KPIMetric,
  CreateCustomKPIData,
  UpdateCustomKPIData,
  Department
} from '../../types/custom-kpi'

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Hook to fetch custom KPIs for a department
 * @param department - Filter by department (optional)
 * @param includeShared - Include shared KPIs (default: true)
 * @returns Custom KPIs with loading/error state and refetch function
 */
export function useCustomKPIs(
  department?: Department,
  includeShared = true
): UseDataState<CustomKPI[]> {
  const [data, setData] = useState<CustomKPI[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const kpis = await customKPIApi.getCustomKPIs(department, includeShared)
      setData(kpis)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch custom KPIs'))
    } finally {
      setLoading(false)
    }
  }, [department, includeShared])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

/**
 * Hook to fetch available metrics for the KPI builder
 * @param department - Filter by department (optional)
 * @returns Available metrics with loading/error state and refetch function
 */
export function useAvailableMetrics(department?: Department): UseDataState<KPIMetric[]> {
  const [data, setData] = useState<KPIMetric[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const metrics = await customKPIApi.getAvailableMetrics(department)
      setData(metrics)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch available metrics'))
    } finally {
      setLoading(false)
    }
  }, [department])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}

/**
 * Hook for custom KPI mutations (create, update, delete, reorder)
 * Provides mutation functions with loading/error state
 * @param onSuccess - Optional callback to run after successful mutation (e.g., refetch)
 */
export function useCustomKPIMutations(onSuccess?: () => void | Promise<void>) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createKPI = useCallback(
    async (kpiData: CreateCustomKPIData): Promise<CustomKPI | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await customKPIApi.createCustomKPI(kpiData)
        if (onSuccess) {
          await onSuccess()
        }
        return result
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create KPI'))
        return null
      } finally {
        setLoading(false)
      }
    },
    [onSuccess]
  )

  const updateKPI = useCallback(
    async (name: string, updates: UpdateCustomKPIData): Promise<CustomKPI | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await customKPIApi.updateCustomKPI(name, updates)
        if (onSuccess) {
          await onSuccess()
        }
        return result
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update KPI'))
        return null
      } finally {
        setLoading(false)
      }
    },
    [onSuccess]
  )

  const deleteKPI = useCallback(
    async (name: string): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await customKPIApi.deleteCustomKPI(name)
        if (onSuccess) {
          await onSuccess()
        }
        return true
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete KPI'))
        return false
      } finally {
        setLoading(false)
      }
    },
    [onSuccess]
  )

  const reorderKPIs = useCallback(
    async (kpiOrder: string[]): Promise<boolean> => {
      setLoading(true)
      setError(null)
      try {
        await customKPIApi.updateKPIOrder(kpiOrder)
        if (onSuccess) {
          await onSuccess()
        }
        return true
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to reorder KPIs'))
        return false
      } finally {
        setLoading(false)
      }
    },
    [onSuccess]
  )

  return {
    createKPI,
    updateKPI,
    deleteKPI,
    reorderKPIs,
    loading,
    error
  }
}
