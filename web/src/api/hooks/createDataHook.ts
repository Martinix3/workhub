// Generic data hook factory to eliminate UseDataState boilerplate

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
