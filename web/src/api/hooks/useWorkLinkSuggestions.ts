// React hook for managing WorkLink suggestions state
import { useState, useEffect, useCallback, useRef } from 'react'
import workLinkSuggestionsApi from '../services/worklink-suggestions'
import type {
  WorkLinkSuggestion,
  GetSuggestionsParams,
  AcceptSuggestionParams,
  DismissSuggestionParams
} from '../services/worklink-suggestions'
import type { Department } from '../../components/sections/tasks/types'

interface UseWorkLinkSuggestionsParams {
  title: string
  description?: string
  department?: Department
  projectId?: string
  taskId?: string
  limit?: number
  enabled?: boolean
  debounceMs?: number
}

interface UseWorkLinkSuggestionsReturn {
  suggestions: WorkLinkSuggestion[]
  loading: boolean
  error: Error | null
  acceptSuggestion: (params: Omit<AcceptSuggestionParams, 'taskId'>) => Promise<boolean>
  dismissSuggestion: (params: Omit<DismissSuggestionParams, 'taskId'>) => Promise<boolean>
  refetch: () => Promise<void>
}

/**
 * Hook for managing WorkLink suggestions with debounced fetching
 *
 * @param params - Suggestion parameters including title, description, and filters
 * @returns Suggestions state, loading/error states, and accept/dismiss handlers
 *
 * @example
 * const { suggestions, loading, acceptSuggestion } = useWorkLinkSuggestions({
 *   title: 'Fix order SO-2024-001',
 *   description: 'Update delivery date',
 *   department: 'SALES',
 *   taskId: 'task-123',
 *   debounceMs: 500
 * })
 */
export function useWorkLinkSuggestions(
  params: UseWorkLinkSuggestionsParams
): UseWorkLinkSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<WorkLinkSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Debounce timer ref
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track if component is mounted to avoid state updates after unmount
  const isMountedRef = useRef(true)

  const {
    title,
    description,
    department,
    projectId,
    taskId,
    limit = 5,
    enabled = true,
    debounceMs = 500
  } = params

  /**
   * Fetch suggestions from the API
   */
  const fetchSuggestions = useCallback(async () => {
    // Don't fetch if disabled or title is empty
    if (!enabled || !title.trim()) {
      setSuggestions([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const fetchParams: GetSuggestionsParams = {
        title,
        description,
        department,
        projectId,
        limit
      }

      const results = await workLinkSuggestionsApi.getSuggestions(fetchParams)

      if (isMountedRef.current) {
        setSuggestions(results)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch suggestions'))
        setSuggestions([])
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [title, description, department, projectId, limit, enabled])

  /**
   * Debounced effect to fetch suggestions when parameters change
   */
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Don't fetch if disabled or title is empty
    if (!enabled || !title.trim()) {
      setSuggestions([])
      setLoading(false)
      return
    }

    // Set loading immediately (before debounce)
    setLoading(true)

    // Set new debounced timer
    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions()
    }, debounceMs)

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [title, description, department, projectId, limit, enabled, debounceMs, fetchSuggestions])

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  /**
   * Accept a suggestion and create the WorkLink connection
   */
  const acceptSuggestion = useCallback(
    async (params: Omit<AcceptSuggestionParams, 'taskId'>): Promise<boolean> => {
      if (!taskId) {
        setError(new Error('No task ID provided for accepting suggestion'))
        return false
      }

      setLoading(true)
      setError(null)

      try {
        await workLinkSuggestionsApi.acceptSuggestion({
          ...params,
          taskId
        })

        // Remove the accepted suggestion from the list (optimistic update)
        if (isMountedRef.current) {
          setSuggestions(prev =>
            prev.filter(s => !(s.doctype === params.doctype && s.doc_id === params.docId))
          )
        }

        return true
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to accept suggestion'))
        }
        return false
      } finally {
        if (isMountedRef.current) {
          setLoading(false)
        }
      }
    },
    [taskId]
  )

  /**
   * Dismiss a suggestion for pattern learning
   */
  const dismissSuggestion = useCallback(
    async (params: Omit<DismissSuggestionParams, 'taskId'>): Promise<boolean> => {
      if (!taskId) {
        setError(new Error('No task ID provided for dismissing suggestion'))
        return false
      }

      try {
        await workLinkSuggestionsApi.dismissSuggestion({
          ...params,
          taskId
        })

        // Remove the dismissed suggestion from the list (optimistic update)
        if (isMountedRef.current) {
          setSuggestions(prev =>
            prev.filter(s => !(s.doctype === params.doctype && s.doc_id === params.docId))
          )
        }

        return true
      } catch (err) {
        if (isMountedRef.current) {
          setError(err instanceof Error ? err : new Error('Failed to dismiss suggestion'))
        }
        return false
      }
    },
    [taskId]
  )

  /**
   * Manual refetch (bypasses debouncing)
   */
  const refetch = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }
    await fetchSuggestions()
  }, [fetchSuggestions])

  return {
    suggestions,
    loading,
    error,
    acceptSuggestion,
    dismissSuggestion,
    refetch
  }
}

/**
 * Standalone hook for accepting a suggestion without full suggestions state
 * Useful when you just need to accept without fetching suggestions
 */
export function useAcceptSuggestion() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const acceptSuggestion = useCallback(
    async (params: AcceptSuggestionParams): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        await workLinkSuggestionsApi.acceptSuggestion(params)
        return true
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to accept suggestion'))
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { acceptSuggestion, loading, error }
}

/**
 * Standalone hook for dismissing a suggestion without full suggestions state
 * Useful when you just need to dismiss without fetching suggestions
 */
export function useDismissSuggestion() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const dismissSuggestion = useCallback(
    async (params: DismissSuggestionParams): Promise<boolean> => {
      setLoading(true)
      setError(null)

      try {
        await workLinkSuggestionsApi.dismissSuggestion(params)
        return true
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to dismiss suggestion'))
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return { dismissSuggestion, loading, error }
}

export default useWorkLinkSuggestions
