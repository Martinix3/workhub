// React hooks for Production and Quality data
import { useState, useEffect, useCallback } from 'react'
import productionApi from '../services/production'
import {
  isInBypassMode,
  sampleProductionKPIs,
  sampleProductionOrders,
  sampleProductionLines,
  sampleQualityKPIs,
  sampleLots,
  sampleHACCPPlans,
  sampleCCPReadings,
  sampleDocumentFolders,
  sampleDocuments,
  sampleInspections,
  sampleNonConformances,
  sampleWeeklyTrend
} from '../sample-data'
import { createDataHook, type UseDataState } from './createDataHook'
import type {
  ProductionKPIs,
  ProductionOrder,
  ProductionLine,
  Lot,
  HACCPPlan,
  CCPReading,
  QualityDocument,
  DocumentFolder,
  QualityKPIs,
  Inspection,
  NonConformance,
  WeeklyTrendPoint
} from '../../components/sections/production-and-quality/types'

// Production Dashboard hooks
export const useProductionKPIs = createDataHook<ProductionKPIs>({
  apiMethod: productionApi.getProductionKPIs,
  sampleData: sampleProductionKPIs,
  errorMessage: 'Failed to fetch KPIs'
})

export const useProductionOrders = createDataHook<ProductionOrder[]>({
  apiMethod: productionApi.getProductionOrders,
  sampleData: sampleProductionOrders,
  errorMessage: 'Failed to fetch orders'
})

export const useProductionLines = createDataHook<ProductionLine[]>({
  apiMethod: productionApi.getProductionLines,
  sampleData: sampleProductionLines,
  errorMessage: 'Failed to fetch lines'
})

export function useProductionDashboard() {
  const kpis = useProductionKPIs()
  const orders = useProductionOrders()
  const lines = useProductionLines()

  return {
    kpis: kpis.data,
    orders: orders.data,
    lines: lines.data,
    loading: kpis.loading || orders.loading || lines.loading,
    error: kpis.error || orders.error || lines.error,
    refetch: async () => {
      await Promise.all([kpis.refetch(), orders.refetch(), lines.refetch()])
    }
  }
}

// Lot Management hooks
export const useLots = createDataHook<Lot[], { status?: string; search?: string }>({
  apiMethod: productionApi.getLots,
  sampleData: sampleLots,
  errorMessage: 'Failed to fetch lots'
})

// HACCP hooks
export function useHACCPPlans(): UseDataState<HACCPPlan[]> {
  const [data, setData] = useState<HACCPPlan[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const plans = await productionApi.getHACCPPlans()
      setData(plans)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleHACCPPlans)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch HACCP plans'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useHACCPReadings(): UseDataState<CCPReading[]> {
  const [data, setData] = useState<CCPReading[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const readings = await productionApi.getRecentReadings()
      setData(readings)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleCCPReadings)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch HACCP readings'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useActiveAlerts(): UseDataState<CCPReading[]> {
  const [data, setData] = useState<CCPReading[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const alerts = await productionApi.getActiveAlerts()
      setData(alerts)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleCCPReadings.filter(r => r.status === 'critical' || r.status === 'warning'))
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch alerts'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useHACCPMonitor() {
  const plans = useHACCPPlans()
  const readings = useHACCPReadings()
  const alerts = useActiveAlerts()

  return {
    plans: plans.data,
    recentReadings: readings.data,
    activeAlerts: alerts.data,
    loading: plans.loading || readings.loading || alerts.loading,
    error: plans.error || readings.error || alerts.error,
    refetch: async () => {
      await Promise.all([plans.refetch(), readings.refetch(), alerts.refetch()])
    },
    recordReading: productionApi.recordReading,
    acknowledgeAlert: productionApi.acknowledgeAlert
  }
}

// Document hooks
export function useDocumentFolders(): UseDataState<DocumentFolder[]> {
  const [data, setData] = useState<DocumentFolder[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const folders = await productionApi.getDocumentFolders()
      setData(folders)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleDocumentFolders)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch folders'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useDocuments(folderId?: string): UseDataState<QualityDocument[]> {
  const [data, setData] = useState<QualityDocument[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const documents = await productionApi.getDocuments(folderId)
      setData(documents)
    } catch (err) {
      if (isInBypassMode()) {
        setData(folderId ? sampleDocuments.filter(d => d.category === folderId) : sampleDocuments)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch documents'))
      }
    } finally {
      setLoading(false)
    }
  }, [folderId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useDocumentLibrary(folderId?: string) {
  const folders = useDocumentFolders()
  const documents = useDocuments(folderId)

  return {
    folders: folders.data,
    documents: documents.data,
    loading: folders.loading || documents.loading,
    error: folders.error || documents.error,
    refetch: async () => {
      await Promise.all([folders.refetch(), documents.refetch()])
    }
  }
}

// Quality hooks
export function useQualityKPIs(): UseDataState<QualityKPIs> {
  const [data, setData] = useState<QualityKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const kpis = await productionApi.getQualityKPIs()
      setData(kpis)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleQualityKPIs)
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

export function usePendingInspections(): UseDataState<Inspection[]> {
  const [data, setData] = useState<Inspection[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const inspections = await productionApi.getPendingInspections()
      setData(inspections)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleInspections)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch inspections'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useOpenNCs(): UseDataState<NonConformance[]> {
  const [data, setData] = useState<NonConformance[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const ncs = await productionApi.getOpenNCs()
      setData(ncs)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleNonConformances)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch non-conformances'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useWeeklyTrend(): UseDataState<WeeklyTrendPoint[]> {
  const [data, setData] = useState<WeeklyTrendPoint[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const trend = await productionApi.getWeeklyTrend()
      setData(trend)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleWeeklyTrend)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch trend'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useQualityDashboard() {
  const kpis = useQualityKPIs()
  const inspections = usePendingInspections()
  const ncs = useOpenNCs()
  const trend = useWeeklyTrend()

  return {
    kpis: kpis.data,
    pendingInspections: inspections.data,
    openNCs: ncs.data,
    weeklyTrend: trend.data,
    loading: kpis.loading || inspections.loading || ncs.loading || trend.loading,
    error: kpis.error || inspections.error || ncs.error || trend.error,
    refetch: async () => {
      await Promise.all([kpis.refetch(), inspections.refetch(), ncs.refetch(), trend.refetch()])
    }
  }
}
