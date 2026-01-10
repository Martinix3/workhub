// Generic data hook factory to eliminate UseDataState boilerplate

import { useState, useEffect, useCallback } from 'react'
import { isInBypassMode } from '../sample-data'

/**
 * Standard data state interface returned by all data hooks
 */
export interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

/**
 * Options for creating a data hook with the factory
 *
 * @template T - The type of data returned by the API
 * @template TArgs - The type of arguments passed to the API method (optional)
 */
export interface CreateDataHookOptions<T, TArgs = void> {
  /**
   * The API method to call. Can be:
   * - A function that takes no arguments: () => Promise<T>
   * - A function that takes arguments: (args: TArgs) => Promise<T>
   */
  apiMethod: TArgs extends void
    ? () => Promise<T>
    : (args: TArgs) => Promise<T>

  /**
   * Sample data to use in bypass mode when the API call fails
   */
  sampleData: T

  /**
   * Custom error message for when the API call fails (and bypass mode is disabled)
   */
  errorMessage: string

  /**
   * Optional transformer function to process sample data in bypass mode.
   * Useful for filtering or transforming sample data based on arguments.
   *
   * Example: (data, args) => data.filter(item => item.status === args?.status)
   */
  bypassTransformer?: (data: T, args?: TArgs) => T
}

/**
 * Factory function to create a data hook with standard UseDataState pattern
 *
 * @template T - The type of data returned by the API
 * @template TArgs - The type of arguments passed to the API method (optional)
 * @param options - Configuration options for the hook
 * @returns A React hook that follows the UseDataState pattern
 */
export function createDataHook<T, TArgs = void>(
  options: CreateDataHookOptions<T, TArgs>
): TArgs extends void
  ? () => UseDataState<T>
  : (args?: TArgs) => UseDataState<T> {
  const { apiMethod, sampleData, errorMessage, bypassTransformer } = options

  // Return the hook function
  return ((args?: TArgs) => {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    // Serialize args for stable dependency comparison
    const argsKey = args ? JSON.stringify(args) : ''

    const fetch = useCallback(async () => {
      setLoading(true)
      setError(null)
      try {
        const parsedArgs = argsKey ? JSON.parse(argsKey) : undefined
        const result = await (apiMethod as any)(parsedArgs)
        setData(result)
      } catch (err) {
        if (isInBypassMode()) {
          // Apply bypass transformer if provided, otherwise use sample data as-is
          const finalData = bypassTransformer
            ? bypassTransformer(sampleData, args)
            : sampleData
          setData(finalData)
        } else {
          setError(err instanceof Error ? err : new Error(errorMessage))
        }
      } finally {
        setLoading(false)
      }
    }, [argsKey])

    useEffect(() => { fetch() }, [fetch])

    return { data, loading, error, refetch: fetch }
  }) as any
}
