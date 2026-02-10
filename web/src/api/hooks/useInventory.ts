import { createDataHook } from './createDataHook'
import inventoryApi from '../services/inventory'
// sampleInventoryBalance, sampleInventoryStats, sampleInventoryDetails removed - do not exist in sample-data
import type {
  InventoryFilters,
  InventoryItem,
  InventoryItemDetail,
  InventoryStats
} from '../../components/sections/inventory/types'

export const useInventoryBalance = createDataHook<InventoryItem[], InventoryFilters>({
  apiMethod: inventoryApi.getInventoryBalance,
  sampleData: [] as InventoryItem[],
  errorMessage: 'Failed to fetch inventory',
  bypassTransformer: (data, filters) => {
    if (!filters) return data
    return data.filter((item) => {
      if (filters.itemGroup && item.itemGroup !== filters.itemGroup) {
        return false
      }
      if (filters.search) {
        const search = filters.search.toLowerCase()
        return item.itemCode.toLowerCase().includes(search) || item.itemName.toLowerCase().includes(search)
      }
      return true
    })
  }
})

export const useInventoryStats = createDataHook<InventoryStats, { warehouse?: string }>({
  apiMethod: ({ warehouse }) => inventoryApi.getInventoryStats(warehouse),
  sampleData: null as unknown as InventoryStats,
  errorMessage: 'Failed to fetch inventory stats'
})

export const useInventoryItemDetail = createDataHook<InventoryItemDetail | null, { itemCode?: string; warehouse?: string }>({
  apiMethod: ({ itemCode, warehouse }) => inventoryApi.getItemStockDetails(itemCode, warehouse),
  sampleData: null,
  errorMessage: 'Failed to fetch item detail',
  bypassTransformer: (_, args) => {
    if (!args?.itemCode) return null
    return null
  }
})
