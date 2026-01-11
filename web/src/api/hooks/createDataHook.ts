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
 * This factory eliminates UseDataState boilerplate by providing a consistent
 * pattern for creating data hooks with loading states, error handling, and
 * automatic bypass mode support for development.
 *
 * @template T - The type of data returned by the API
 * @template TArgs - The type of arguments passed to the API method (optional)
 * @param options - Configuration options for the hook
 * @returns A React hook that follows the UseDataState pattern
 *
 * @example
 * // Simple hook with no arguments
 * interface User {
 *   id: number
 *   name: string
 *   email: string
 * }
 *
 * export const useUser = createDataHook<User>({
 *   apiMethod: api.getUser,
 *   sampleData: { id: 1, name: 'John Doe', email: 'john@example.com' },
 *   errorMessage: 'Failed to fetch user'
 * })
 *
 * // Usage in component:
 * function UserProfile() {
 *   const { data: user, loading, error, refetch } = useUser()
 *
 *   if (loading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error.message}</div>
 *   return <div>{user?.name}</div>
 * }
 *
 * @example
 * // Hook with filters/arguments
 * interface Task {
 *   id: number
 *   title: string
 *   status: 'BACKLOG' | 'NEXT' | 'DOING' | 'DONE'
 *   priority: 'P0' | 'P1' | 'P2'
 * }
 *
 * interface TaskFilters {
 *   status?: string
 *   priority?: string
 * }
 *
 * export const useTasks = createDataHook<Task[], TaskFilters>({
 *   apiMethod: api.getTasks,
 *   sampleData: [
 *     { id: 1, title: 'Task 1', status: 'DOING', priority: 'P0' },
 *     { id: 2, title: 'Task 2', status: 'DONE', priority: 'P1' }
 *   ],
 *   errorMessage: 'Failed to fetch tasks'
 * })
 *
 * // Usage in component:
 * function TaskList() {
 *   const { data: tasks } = useTasks({ status: 'DOING', priority: 'P0' })
 *   return <ul>{tasks?.map(task => <li key={task.id}>{task.title}</li>)}</ul>
 * }
 *
 * @example
 * // Hook with custom bypass transformer
 * // This example filters sample data based on arguments when in bypass mode
 * interface Project {
 *   id: number
 *   name: string
 *   department: 'SALES' | 'OPS' | 'MKT'
 * }
 *
 * interface ProjectFilters {
 *   department?: string
 * }
 *
 * export const useProjects = createDataHook<Project[], ProjectFilters>({
 *   apiMethod: api.getProjects,
 *   sampleData: [
 *     { id: 1, name: 'Sales Project', department: 'SALES' },
 *     { id: 2, name: 'Marketing Project', department: 'MKT' },
 *     { id: 3, name: 'Operations Project', department: 'OPS' }
 *   ],
 *   errorMessage: 'Failed to fetch projects',
 *   // Filter sample data based on department argument in bypass mode
 *   bypassTransformer: (data, args) => {
 *     if (!args?.department) return data
 *     return data.filter(project => project.department === args.department)
 *   }
 * })
 *
 * // Usage in component:
 * function DepartmentProjects({ dept }: { dept: string }) {
 *   // In bypass mode, only returns projects matching the department
 *   const { data: projects } = useProjects({ department: dept })
 *   return <ul>{projects?.map(p => <li key={p.id}>{p.name}</li>)}</ul>
 * }
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
