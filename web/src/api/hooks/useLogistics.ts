import { createDataHook } from './createDataHook'
import logisticsApi from '../services/logistics'
import purchasesApi from '../services/purchases'
// sampleDeliveryNotes, sampleTransporters, sampleWarehouses, samplePurchaseOrders removed - do not exist in sample-data
import type {
  DeliveryNote,
  DeliveryNoteFilters,
  Transporter,
  TransporterFilters,
  Warehouse,
  WarehouseFilters,
  PurchaseOrderStatus,
  PurchaseOrderFilters
} from '../../components/sections/logistics/types'

export const useDeliveryNotes = createDataHook<DeliveryNote[], DeliveryNoteFilters>({
  apiMethod: logisticsApi.getDeliveryNotes,
  sampleData: [] as DeliveryNote[],
  errorMessage: 'Failed to fetch delivery notes',
  bypassTransformer: (data, filters) => {
    if (!filters) return data
    return data.filter((note) => {
      if (filters.status && note.status !== filters.status) {
        return false
      }
      if (filters.search) {
        const search = filters.search.toLowerCase()
        return note.deliveryNoteNumber.toLowerCase().includes(search) ||
          note.customerName.toLowerCase().includes(search)
      }
      return true
    })
  }
})

export const useTransporters = createDataHook<Transporter[], TransporterFilters>({
  apiMethod: logisticsApi.getTransporters,
  sampleData: [] as Transporter[],
  errorMessage: 'Failed to fetch transporters',
  bypassTransformer: (data, filters) => {
    if (!filters?.search) return data
    const search = filters.search.toLowerCase()
    return data.filter((transporter) =>
      transporter.name.toLowerCase().includes(search) ||
      transporter.email.toLowerCase().includes(search)
    )
  }
})

export const useWarehouses = createDataHook<Warehouse[], WarehouseFilters>({
  apiMethod: logisticsApi.getWarehouses,
  sampleData: [] as Warehouse[],
  errorMessage: 'Failed to fetch warehouses',
  bypassTransformer: (data, filters) => {
    if (!filters?.search) return data
    const search = filters.search.toLowerCase()
    return data.filter((warehouse) =>
      warehouse.name.toLowerCase().includes(search) ||
      warehouse.company.toLowerCase().includes(search)
    )
  }
})

export const usePurchaseOrders = createDataHook<PurchaseOrderStatus[], PurchaseOrderFilters>({
  apiMethod: purchasesApi.getPurchaseOrders,
  sampleData: [] as PurchaseOrderStatus[],
  errorMessage: 'Failed to fetch purchase orders',
  bypassTransformer: (data, filters) => {
    if (!filters) return data
    return data.filter((order) => {
      if (filters.status && order.status !== filters.status) {
        return false
      }
      if (filters.search) {
        const search = filters.search.toLowerCase()
        return order.orderNumber.toLowerCase().includes(search) ||
          order.supplierName.toLowerCase().includes(search)
      }
      return true
    })
  }
})

