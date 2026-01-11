// React hooks for Distributors data
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
  sampleNetworkKPIs,
  sampleDistributors,
  samplePortalData
} from '../sample-data'
import { createDataHook } from './createDataHook'

export const useDistributorKPIs = createDataHook<NetworkKPIs>({
  apiMethod: distributorsApi.getKPIs,
  sampleData: sampleNetworkKPIs,
  errorMessage: 'Failed to fetch KPIs'
})

export const useDistributors = createDataHook<Distributor[]>({
  apiMethod: distributorsApi.getDistributors,
  sampleData: sampleDistributors,
  errorMessage: 'Failed to fetch distributors'
})

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
export const useMyOrders = createDataHook<MyOrder[]>({
  apiMethod: distributorsApi.getMyOrders,
  sampleData: samplePortalData.myOrders,
  errorMessage: 'Failed to fetch orders'
})

export const useMyInventory = createDataHook<InventoryItem[]>({
  apiMethod: distributorsApi.getMyInventory,
  sampleData: samplePortalData.myInventory,
  errorMessage: 'Failed to fetch inventory'
})

export const useMySellOutRecords = createDataHook<SellOutRecord[]>({
  apiMethod: distributorsApi.getMySellOutRecords,
  sampleData: samplePortalData.sellOutRecords,
  errorMessage: 'Failed to fetch sell out records'
})

export const usePortalAnalytics = createDataHook<PortalAnalytics>({
  apiMethod: distributorsApi.getPortalAnalytics,
  sampleData: samplePortalData.analytics,
  errorMessage: 'Failed to fetch analytics'
})

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
