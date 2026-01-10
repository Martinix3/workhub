// React hooks for Natural Language Task Creation
import { useState, useCallback } from 'react'
import nlTasksApi from '../services/nl-tasks'
import type {
  ParsedTask,
  NLTaskResult,
  UserSuggestion,
  ProjectSuggestion
} from '../../components/nl-task-input/types'

interface UseNLTaskState {
  parsedTask: ParsedTask | null
  parsing: boolean
  parseError: Error | null
  creating: boolean
  createError: Error | null
  createResult: NLTaskResult | null
}

export function useNLTask() {
  const [state, setState] = useState<UseNLTaskState>({
    parsedTask: null,
    parsing: false,
    parseError: null,
    creating: false,
    createError: null,
    createResult: null
  })

  const parse = useCallback(async (text: string): Promise<ParsedTask | null> => {
    setState(prev => ({
      ...prev,
      parsing: true,
      parseError: null,
      parsedTask: null
    }))

    try {
      const result = await nlTasksApi.parse(text)
      setState(prev => ({
        ...prev,
        parsing: false,
        parsedTask: result
      }))
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to parse task')
      setState(prev => ({
        ...prev,
        parsing: false,
        parseError: error
      }))
      return null
    }
  }, [])

  const create = useCallback(async (parsedTask: ParsedTask): Promise<NLTaskResult | null> => {
    setState(prev => ({
      ...prev,
      creating: true,
      createError: null,
      createResult: null
    }))

    try {
      const result = await nlTasksApi.create(parsedTask)
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
      parsedTask: null,
      parsing: false,
      parseError: null,
      creating: false,
      createError: null,
      createResult: null
    })
  }, [])

  const updateParsedTask = useCallback((updates: Partial<ParsedTask>) => {
    setState(prev => ({
      ...prev,
      parsedTask: prev.parsedTask ? { ...prev.parsedTask, ...updates } : null
    }))
  }, [])

  return {
    ...state,
    parse,
    create,
    reset,
    updateParsedTask
  }
}

export function useUserSearch() {
  const [users, setUsers] = useState<UserSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setUsers([])
      return
    }

    setLoading(true)
    try {
      const results = await nlTasksApi.searchUsers(query)
      setUsers(results)
    } catch (err) {
      console.error('User search error:', err)
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { users, loading, search }
}

export function useProjectSearch() {
  const [projects, setProjects] = useState<ProjectSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setProjects([])
      return
    }

    setLoading(true)
    try {
      const results = await nlTasksApi.searchProjects(query)
      setProjects(results)
    } catch (err) {
      console.error('Project search error:', err)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { projects, loading, search }
}

export default useNLTask
