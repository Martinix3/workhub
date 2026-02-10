import { useState, useCallback } from 'react'
import { createDataHook } from './createDataHook'
import pricingApi from '../services/pricing'
// samplePriceLists, sampleItemPrices removed - do not exist in sample-data
import type { ItemPriceRow, PriceListSummary } from '../../components/sections/sell-in-operations/types'

export const usePriceLists = createDataHook<PriceListSummary[], void>({
  apiMethod: pricingApi.getPriceLists,
  sampleData: [] as PriceListSummary[],
  errorMessage: 'Failed to fetch price lists'
})

export const useItemPrices = createDataHook<ItemPriceRow[], { price_list: string; search?: string }>({
  apiMethod: (args) => {
    if (!args?.price_list) {
      return Promise.resolve([] as ItemPriceRow[])
    }
    return pricingApi.getItemPrices(args)
  },
  sampleData: [] as ItemPriceRow[],
  errorMessage: 'Failed to fetch item prices',
  bypassTransformer: (data, args) => {
    if (!args?.price_list) return []
    const search = args.search?.toLowerCase().trim()
    const filtered = data.filter((row) => row.price_list === args.price_list)
    if (!search) return filtered
    return filtered.filter((row) =>
      row.item_name.toLowerCase().includes(search) ||
      row.item_code.toLowerCase().includes(search)
    )
  }
})

export function usePricingMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const ensureDefaultPriceLists = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      return await pricingApi.ensureDefaultPriceLists()
    } catch (err) {
      const errorValue = err instanceof Error ? err : new Error('Failed to ensure price lists')
      setError(errorValue)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const createPriceList = useCallback(async (payload: { name: string; currency: string }) => {
    setLoading(true)
    setError(null)
    try {
      return await pricingApi.createPriceList(payload)
    } catch (err) {
      const errorValue = err instanceof Error ? err : new Error('Failed to create price list')
      setError(errorValue)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const setItemPrice = useCallback(async (payload: { price_list: string; item_code: string; rate: number }) => {
    setLoading(true)
    setError(null)
    try {
      return await pricingApi.setItemPrice(payload)
    } catch (err) {
      const errorValue = err instanceof Error ? err : new Error('Failed to update price')
      setError(errorValue)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const clearItemPrice = useCallback(async (payload: { price_list: string; item_code: string }) => {
    setLoading(true)
    setError(null)
    try {
      return await pricingApi.clearItemPrice(payload)
    } catch (err) {
      const errorValue = err instanceof Error ? err : new Error('Failed to clear price')
      setError(errorValue)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    ensureDefaultPriceLists,
    createPriceList,
    setItemPrice,
    clearItemPrice,
    loading,
    error
  }
}
