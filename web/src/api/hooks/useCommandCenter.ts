// React hooks for Command Center data
import { useState, useEffect, useCallback } from 'react'
import commandCenterApi from '../services/command-center'
import type { AreaSummary, PriorityAlert } from '../../components/sections/command-center/types'
import { isInBypassMode, sampleAreaSummaries, samplePriorityAlerts } from '../sample-data'

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useAreaSummaries(): UseDataState<AreaSummary[]> {
  const [data, setData] = useState<AreaSummary[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const areas = await commandCenterApi.getAreaSummaries()
      setData(areas)
    } catch (err) {
      // Use sample data in bypass mode
      if (isInBypassMode()) {
        setData(sampleAreaSummaries)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch area summaries'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useAlerts(): UseDataState<PriorityAlert[]> & { dismissAlert: (id: string) => Promise<void> } {
  const [data, setData] = useState<PriorityAlert[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const alerts = await commandCenterApi.getAlerts()
      setData(alerts)
    } catch (err) {
      if (isInBypassMode()) {
        setData(samplePriorityAlerts)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch alerts'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const dismissAlert = useCallback(async (id: string) => {
    try {
      await commandCenterApi.dismissAlert(id)
      setData(prev => prev?.filter(a => a.id !== id) ?? null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to dismiss alert'))
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch, dismissAlert }
}

export function useCommandCenter() {
  const areas = useAreaSummaries()
  const alerts = useAlerts()

  return {
    areas: areas.data,
    alerts: alerts.data,
    loading: areas.loading || alerts.loading,
    error: areas.error || alerts.error,
    refetch: async () => {
      await Promise.all([areas.refetch(), alerts.refetch()])
    },
    dismissAlert: alerts.dismissAlert
  }
}
