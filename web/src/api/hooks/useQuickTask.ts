// React hooks for Quick Task Creation
import { useState, useEffect, useCallback } from 'react'
import tasksApi from '../services/tasks'
import type {
  QuickTaskData,
  QuickTaskResponse,
  WorkLinkSuggestion,
  ProjectOption,
  AssignableUser
} from '../services/tasks'
import { isInBypassMode, sampleProjects } from '../sample-data'

interface UseQuickTaskState {
  creating: boolean
  createError: Error | null
  createResult: QuickTaskResponse | null
}

interface UseQuickTaskOptionsState {
  projects: ProjectOption[]
  users: AssignableUser[]
  loading: boolean
  error: Error | null
}

interface UseWorkLinkSuggestionsState {
  suggestions: WorkLinkSuggestion[]
  loading: boolean
  error: Error | null
}

/**
 * Hook for quick task creation with WorkLink support
 */
export function useQuickTask() {
  const [state, setState] = useState<UseQuickTaskState>({
    creating: false,
    createError: null,
    createResult: null
  })

  const createTask = useCallback(async (data: QuickTaskData): Promise<QuickTaskResponse | null> => {
    setState(prev => ({
      ...prev,
      creating: true,
      createError: null,
      createResult: null
    }))

    try {
      const result = await tasksApi.quickCreateTask(data)
      setState(prev => ({
        ...prev,
        creating: false,
        createResult: result
      }))
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create task')
      setState(prev => ({
        ...prev,
        creating: false,
        createError: error
      }))
      return null
    }
  }, [])

  const reset = useCallback(() => {
    setState({
      creating: false,
      createError: null,
      createResult: null
    })
  }, [])

  return {
    ...state,
    createTask,
    reset
  }
}

/**
 * Hook for loading quick task form options (projects and users)
 */
export function useQuickTaskOptions() {
  const [state, setState] = useState<UseQuickTaskOptionsState>({
    projects: [],
    users: [],
    loading: true,
    error: null
  })

  const fetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const [projects, users] = await Promise.all([
        tasksApi.getProjectOptions(),
        tasksApi.getAssignableUsers()
      ])

      setState({
        projects,
        users,
        loading: false,
        error: null
      })
    } catch (err) {
      if (isInBypassMode()) {
        // Use sample data in bypass mode
        const sampleProjectOptions: ProjectOption[] = sampleProjects.map(p => ({
          name: p.name,
          title: p.title
        }))

        const sampleUsers: AssignableUser[] = [
          { name: 'user1@example.com', full_name: 'Carlos Mendez', user_image: null },
          { name: 'user2@example.com', full_name: 'Ana Garcia', user_image: null },
          { name: 'user3@example.com', full_name: 'Roberto Silva', user_image: null }
        ]

        setState({
          projects: sampleProjectOptions,
          users: sampleUsers,
          loading: false,
          error: null
        })
      } else {
        const error = err instanceof Error ? err : new Error('Failed to load options')
        setState(prev => ({
          ...prev,
          loading: false,
          error
        }))
      }
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { ...state, refetch: fetch }
}

/**
 * Hook for loading WorkLink suggestions based on context
 */
export function useWorkLinkSuggestions(doctype?: string, docId?: string, limit: number = 10) {
  const [state, setState] = useState<UseWorkLinkSuggestionsState>({
    suggestions: [],
    loading: false,
    error: null
  })

  const fetch = useCallback(async () => {
    // Don't fetch if no context is provided
    if (!doctype && !docId) {
      setState({
        suggestions: [],
        loading: false,
        error: null
      })
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      const response = await tasksApi.getWorkLinkSuggestions(doctype, docId, limit)
      setState({
        suggestions: response.suggestions,
        loading: false,
        error: null
      })
    } catch (err) {
      if (isInBypassMode()) {
        // Sample WorkLink suggestions in bypass mode
        const sampleSuggestions: WorkLinkSuggestion[] = [
          {
            source_doctype: 'Sales Order',
            source_id: 'SAL-2025-047',
            display_name: 'SAL-2025-047 - Distribuciones Norte SA',
            modified: new Date().toISOString(),
            has_worklink: false
          },
          {
            source_doctype: 'Delivery Note',
            source_id: 'DN-2025-023',
            display_name: 'DN-2025-023 - Mezcaleria El Refugio',
            modified: new Date(Date.now() - 86400000).toISOString(),
            has_worklink: true
          }
        ]

        setState({
          suggestions: sampleSuggestions,
          loading: false,
          error: null
        })
      } else {
        const error = err instanceof Error ? err : new Error('Failed to load suggestions')
        setState({
          suggestions: [],
          loading: false,
          error
        })
      }
    }
  }, [doctype, docId, limit])

  useEffect(() => { fetch() }, [fetch])

  return { ...state, refetch: fetch }
}

export default useQuickTask
