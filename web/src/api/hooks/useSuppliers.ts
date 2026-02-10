import { createDataHook } from './createDataHook'
import suppliersApi from '../services/suppliers'
// sampleSuppliers, sampleSupplierItems removed - do not exist in sample-data
import type { Supplier, SupplierFilters, SupplierItem } from '../../components/sections/suppliers/types'

export const useSuppliers = createDataHook<Supplier[], SupplierFilters>({
  apiMethod: suppliersApi.getSuppliers,
  sampleData: [] as Supplier[],
  errorMessage: 'Failed to fetch suppliers',
  bypassTransformer: (data, filters) => {
    if (!filters) return data
    return data.filter((supplier) => {
      if (filters.supplierGroup && supplier.group !== filters.supplierGroup) {
        return false
      }
      if (filters.search) {
        const search = filters.search.toLowerCase()
        return supplier.name.toLowerCase().includes(search) ||
          supplier.email.toLowerCase().includes(search)
      }
      return true
    })
  }
})

export const useSupplierDetail = createDataHook<Supplier | null, { supplierId?: string }>({
  apiMethod: ({ supplierId }) => supplierId ? suppliersApi.getSupplier(supplierId) : Promise.resolve(null),
  sampleData: null,
  errorMessage: 'Failed to fetch supplier detail',
  bypassTransformer: (_, args) => {
    if (!args?.supplierId) return null
    return null
  }
})

export const useSupplierItems = createDataHook<SupplierItem[], { supplierId?: string }>({
  apiMethod: ({ supplierId }) => supplierId ? suppliersApi.getSupplierItems(supplierId) : Promise.resolve([]),
  sampleData: [] as SupplierItem[],
  errorMessage: 'Failed to fetch supplier items',
  bypassTransformer: (_, args) => (args?.supplierId ? [] : [])
})
