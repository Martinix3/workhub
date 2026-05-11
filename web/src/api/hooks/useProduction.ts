// React hooks for Production and Quality data
import productionApi from '../services/production'
import {
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
export const useHACCPPlans = createDataHook<HACCPPlan[]>({
  apiMethod: productionApi.getHACCPPlans,
  sampleData: sampleHACCPPlans,
  errorMessage: 'Failed to fetch HACCP plans'
})

export const useHACCPReadings = createDataHook<CCPReading[]>({
  apiMethod: productionApi.getRecentReadings,
  sampleData: sampleCCPReadings,
  errorMessage: 'Failed to fetch HACCP readings'
})

export const useActiveAlerts = createDataHook<CCPReading[]>({
  apiMethod: productionApi.getActiveAlerts,
  sampleData: sampleCCPReadings,
  errorMessage: 'Failed to fetch alerts',
  bypassTransformer: (data) => data.filter(r => r.status === 'critical' || r.status === 'warning')
})

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
export const useDocumentFolders = createDataHook<DocumentFolder[]>({
  apiMethod: productionApi.getDocumentFolders,
  sampleData: sampleDocumentFolders,
  errorMessage: 'Failed to fetch folders'
})

export const useDocuments = createDataHook<QualityDocument[], string | undefined>({
  apiMethod: productionApi.getDocuments,
  sampleData: sampleDocuments,
  errorMessage: 'Failed to fetch documents',
  bypassTransformer: (data, folderId) =>
    folderId ? data.filter(d => d.category === folderId) : data
})

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
export const useQualityKPIs = createDataHook<QualityKPIs>({
  apiMethod: productionApi.getQualityKPIs,
  sampleData: sampleQualityKPIs,
  errorMessage: 'Failed to fetch KPIs'
})

export const usePendingInspections = createDataHook<Inspection[]>({
  apiMethod: productionApi.getPendingInspections,
  sampleData: sampleInspections,
  errorMessage: 'Failed to fetch inspections'
})

export const useOpenNCs = createDataHook<NonConformance[]>({
  apiMethod: productionApi.getOpenNCs,
  sampleData: sampleNonConformances,
  errorMessage: 'Failed to fetch non-conformances'
})

export const useWeeklyTrend = createDataHook<WeeklyTrendPoint[]>({
  apiMethod: productionApi.getWeeklyTrend,
  sampleData: sampleWeeklyTrend,
  errorMessage: 'Failed to fetch trend'
})

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
