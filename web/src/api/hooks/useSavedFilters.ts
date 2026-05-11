// React hooks for Saved Filters
import { useState, useEffect, useCallback } from 'react'
import savedFiltersApi from '../services/saved-filters'
import type { SavedFilter, FilterCriteria } from '../services/saved-filters'

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// ============== Saved Filters List Hook ==============

export function useSavedFilters(entityType?: 'task' | 'project'): UseDataState<SavedFilter[]> {
  const [data, setData] = useState<SavedFilter[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const filters = await savedFiltersApi.getSavedFilters(entityType)
      setData(filters)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch saved filters'))
    } finally {
      setLoading(false)
    }
  }, [entityType])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

// ============== Single Saved Filter Hook ==============

export function useSavedFilter(filterId: string): UseDataState<SavedFilter> {
  const [data, setData] = useState<SavedFilter | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    if (!filterId) return
    setLoading(true)
    setError(null)
    try {
      const filter = await savedFiltersApi.getSavedFilter(filterId)
      setData(filter)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch saved filter'))
    } finally {
      setLoading(false)
    }
  }, [filterId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

// ============== Saved Filter Mutations Hook ==============

export function useSavedFilterMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createFilter = useCallback(async (data: {
    title: string
    entity_type: 'task' | 'project'
    filter_json: FilterCriteria
    is_shared?: boolean
    icon?: string
  }): Promise<SavedFilter | null> => {
    setLoading(true)
    setError(null)
    try {
      return await savedFiltersApi.createSavedFilter(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create filter'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateFilter = useCallback(async (
    filterId: string,
    data: {
      title?: string
      filter_json?: FilterCriteria
      icon?: string
      sort_order?: number
    }
  ): Promise<SavedFilter | null> => {
    setLoading(true)
    setError(null)
    try {
      return await savedFiltersApi.updateSavedFilter(filterId, data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update filter'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteFilter = useCallback(async (filterId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      await savedFiltersApi.deleteSavedFilter(filterId)
      return true
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete filter'))
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const shareFilter = useCallback(async (filterId: string, shared: boolean): Promise<SavedFilter | null> => {
    setLoading(true)
    setError(null)
    try {
      return await savedFiltersApi.shareFilter(filterId, shared)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to share filter'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createFilter, updateFilter, deleteFilter, shareFilter, loading, error }
}

// ============== Filter Counts Hook with Polling ==============

export function useFilterCounts(pollingInterval: number = 30000): UseDataState<Record<string, number>> {
  const [data, setData] = useState<Record<string, number> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const counts = await savedFiltersApi.getFilterCounts()
      setData(counts)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch filter counts'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Initial fetch
    fetch()

    // Set up polling if interval is positive
    if (pollingInterval > 0) {
      const intervalId = setInterval(() => {
        // Only refetch if not currently loading
        fetch()
      }, pollingInterval)

      return () => clearInterval(intervalId)
    }
  }, [fetch, pollingInterval])

  return { data, loading, error, refetch: fetch }
}
