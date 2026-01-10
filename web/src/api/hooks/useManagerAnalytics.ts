// React hooks for Manager Analytics data
import { useState, useEffect, useCallback } from 'react'
import managerAnalyticsApi from '../services/manager-analytics'
import type {
  TeamWorkloadResponse,
  VelocityTrendsResponse,
  BlockerAnalysisResponse,
  OverdueTrendsResponse,
  ManagerDashboardResponse
} from '../services/manager-analytics'
import {
  isInBypassMode,
  sampleTeamWorkload,
  sampleVelocityTrends,
  sampleBlockerAnalysis,
  sampleOverdueTrends
} from '../sample-data'

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// ============== Team Workload Hook ==============

export function useTeamWorkload(department?: string): UseDataState<TeamWorkloadResponse> {
  const [data, setData] = useState<TeamWorkloadResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const workload = await managerAnalyticsApi.getTeamWorkload(department)
      setData(workload)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleTeamWorkload)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch team workload'))
      }
    } finally {
      setLoading(false)
    }
  }, [department])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

// ============== Velocity Trends Hook ==============

export function useVelocityTrends(
  period: 'daily' | 'weekly' = 'daily',
  days: number = 14
): UseDataState<VelocityTrendsResponse> {
  const [data, setData] = useState<VelocityTrendsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const velocity = await managerAnalyticsApi.getVelocityTrends(period, days)
      setData(velocity)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleVelocityTrends)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch velocity trends'))
      }
    } finally {
      setLoading(false)
    }
  }, [period, days])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

// ============== Blocker Analysis Hook ==============

export function useBlockerAnalysis(department?: string): UseDataState<BlockerAnalysisResponse> {
  const [data, setData] = useState<BlockerAnalysisResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const blockers = await managerAnalyticsApi.getBlockerAnalysis(department)
      setData(blockers)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleBlockerAnalysis)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch blocker analysis'))
      }
    } finally {
      setLoading(false)
    }
  }, [department])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

// ============== Overdue Trends Hook ==============

export function useOverdueTrends(weeks: number = 8): UseDataState<OverdueTrendsResponse> {
  const [data, setData] = useState<OverdueTrendsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const overdue = await managerAnalyticsApi.getOverdueTrends(weeks)
      setData(overdue)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleOverdueTrends)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch overdue trends'))
      }
    } finally {
      setLoading(false)
    }
  }, [weeks])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

// ============== Combined Manager Analytics Dashboard Hook ==============

export function useManagerAnalyticsDashboard(department?: string) {
  const [data, setData] = useState<ManagerDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const dashboard = await managerAnalyticsApi.getManagerDashboard(department)
      setData(dashboard)
    } catch (err) {
      if (isInBypassMode()) {
        setData({
          workload: sampleTeamWorkload,
          velocity: sampleVelocityTrends,
          blockers: sampleBlockerAnalysis,
          overdue: sampleOverdueTrends
        })
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch manager dashboard'))
      }
    } finally {
      setLoading(false)
    }
  }, [department])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
