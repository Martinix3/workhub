// React hooks for Task Management data
import { useState, useEffect, useCallback } from 'react'
import tasksApi from '../services/tasks'
import type {
  Task,
  Project,
  ProjectTemplate,
  MyDayData,
  GanttData,
  KanbanColumn,
  DashboardKPIs,
  TaskFilters,
  ProjectFilters,
  TaskStatus
} from '../../components/sections/tasks/types'
import {
  isInBypassMode,
  sampleTasks,
  sampleProjects,
  sampleProjectTemplates,
  sampleMyDayData,
  sampleKanbanColumns,
  sampleTaskKPIs
} from '../sample-data'

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// ============== My Day Hook ==============

export function useMyDay(): UseDataState<MyDayData> & {
  markWorkedToday: (taskIds: string[]) => Promise<void>
} {
  const [data, setData] = useState<MyDayData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const myDay = await tasksApi.getMyDay()
      setData(myDay)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleMyDayData)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch my day'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const markWorkedToday = useCallback(async (taskIds: string[]) => {
    try {
      await tasksApi.markWorkedToday(taskIds)
      await fetch()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark worked'))
    }
  }, [fetch])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch, markWorkedToday }
}

// ============== Tasks Hooks ==============

export function useTasks(filters?: TaskFilters): UseDataState<Task[]> {
  const [data, setData] = useState<Task[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Serialize filters for stable dependency comparison
  const filtersKey = filters ? JSON.stringify(filters) : ''

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const parsedFilters = filtersKey ? JSON.parse(filtersKey) : undefined
      const tasks = await tasksApi.getTasks(parsedFilters)
      setData(tasks)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleTasks)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch tasks'))
      }
    } finally {
      setLoading(false)
    }
  }, [filtersKey])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useTaskMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createTask = useCallback(async (data: Partial<Task>): Promise<Task | null> => {
    setLoading(true)
    setError(null)
    try {
      return await tasksApi.createTask(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create task'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTask = useCallback(async (taskId: string, data: Partial<Task>): Promise<Task | null> => {
    setLoading(true)
    setError(null)
    try {
      return await tasksApi.updateTask(taskId, data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update task'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const changeStatus = useCallback(async (taskId: string, status: TaskStatus): Promise<Task | null> => {
    setLoading(true)
    setError(null)
    try {
      return await tasksApi.changeStatus(taskId, status)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to change status'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const quickAdd = useCallback(async (title: string, priority?: string): Promise<Task | null> => {
    setLoading(true)
    setError(null)
    try {
      return await tasksApi.quickAdd(title, priority)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add task'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const completeTask = useCallback(async (taskId: string, notes?: string): Promise<Task | null> => {
    setLoading(true)
    setError(null)
    try {
      return await tasksApi.completeTask(taskId, notes)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to complete task'))
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { createTask, updateTask, changeStatus, quickAdd, completeTask, loading, error }
}

// ============== Projects Hooks ==============

export function useProjects(filters?: ProjectFilters): UseDataState<Project[]> {
  const [data, setData] = useState<Project[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Serialize filters for stable dependency comparison
  const filtersKey = filters ? JSON.stringify(filters) : ''

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const parsedFilters = filtersKey ? JSON.parse(filtersKey) : undefined
      const projects = await tasksApi.getProjects(parsedFilters)
      setData(projects)
    } catch (err) {
      if (isInBypassMode()) {
        // Apply filters to sample data
        const parsedFilters = filtersKey ? JSON.parse(filtersKey) : {}
        let filtered = [...sampleProjects]
        if (parsedFilters.status) {
          filtered = filtered.filter(p => p.status === parsedFilters.status)
        }
        setData(filtered)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch projects'))
      }
    } finally {
      setLoading(false)
    }
  }, [filtersKey])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useProject(projectId: string): UseDataState<Project> {
  const [data, setData] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const project = await tasksApi.getProject(projectId)
      setData(project)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch project'))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

// ============== Gantt Hook ==============

export function useGantt(projectId: string): UseDataState<GanttData> & {
  updateTaskSchedule: (taskId: string, startDate: string, dueDate: string) => Promise<void>
} {
  const [data, setData] = useState<GanttData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    setError(null)
    try {
      const ganttData = await tasksApi.getGanttData(projectId)
      setData(ganttData)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch gantt data'))
    } finally {
      setLoading(false)
    }
  }, [projectId])

  const updateTaskSchedule = useCallback(async (taskId: string, startDate: string, dueDate: string) => {
    try {
      await tasksApi.updateTaskSchedule(taskId, startDate, dueDate)
      await fetch()
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update schedule'))
    }
  }, [fetch])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch, updateTaskSchedule }
}

// ============== Kanban Hook ==============

export function useKanban(filters?: TaskFilters): UseDataState<KanbanColumn[]> & {
  moveTask: (taskId: string, newStatus: TaskStatus) => Promise<void>
} {
  const [data, setData] = useState<KanbanColumn[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Serialize filters for stable dependency comparison
  const filtersKey = filters ? JSON.stringify(filters) : ''

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const parsedFilters = filtersKey ? JSON.parse(filtersKey) : undefined
      const columns = await tasksApi.getKanbanBoard(parsedFilters)
      setData(columns)
    } catch (err) {
      if (isInBypassMode()) {
        const parsedFilters = filtersKey ? JSON.parse(filtersKey) : undefined
        // Filter sample data if filters are provided
        let filteredColumns = sampleKanbanColumns.map(col => ({
          ...col,
          tasks: col.tasks.filter(task => {
            if (parsedFilters?.project && task.project !== parsedFilters.project) return false
            if (parsedFilters?.department && task.department !== parsedFilters.department) return false
            return true
          })
        }))
        setData(filteredColumns)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch kanban'))
      }
    } finally {
      setLoading(false)
    }
  }, [filtersKey])

  const moveTask = useCallback(async (taskId: string, newStatus: TaskStatus) => {
    try {
      await tasksApi.changeStatus(taskId, newStatus)
      // Optimistic update
      setData(prev => {
        if (!prev) return prev
        const task = prev.flatMap(c => c.tasks).find(t => t.name === taskId)
        if (!task) return prev
        return prev.map(col => ({
          ...col,
          tasks: col.status === newStatus
            ? [...col.tasks, { ...task, status: newStatus }]
            : col.tasks.filter(t => t.name !== taskId)
        }))
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to move task'))
      await fetch() // Refetch on error
    }
  }, [fetch])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch, moveTask }
}

// ============== Project Templates Hook ==============

export function useProjectTemplates(): UseDataState<ProjectTemplate[]> {
  const [data, setData] = useState<ProjectTemplate[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const templates = await tasksApi.getProjectTemplates()
      setData(templates)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleProjectTemplates)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch templates'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

// ============== Dashboard KPIs Hook ==============

export function useTaskKPIs(): UseDataState<DashboardKPIs> {
  const [data, setData] = useState<DashboardKPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const kpis = await tasksApi.getDashboardKPIs()
      setData(kpis)
    } catch (err) {
      if (isInBypassMode()) {
        setData(sampleTaskKPIs)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch KPIs'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

// ============== Combined Dashboard Hook ==============

export function useTaskDashboard() {
  const kpis = useTaskKPIs()
  const projects = useProjects({ status: 'ACTIVE' })

  return {
    kpis: kpis.data,
    projects: projects.data,
    loading: kpis.loading || projects.loading,
    error: kpis.error || projects.error,
    refetch: async () => {
      await Promise.all([kpis.refetch(), projects.refetch()])
    }
  }
}
