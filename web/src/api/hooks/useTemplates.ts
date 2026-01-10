// React hooks for Templates Management
import { useState, useEffect, useCallback } from 'react'
import templatesApi from '../services/templates'
import type {
  TemplateListItem,
  TemplatePreview,
  CreateTemplateData,
  UpdateTemplateData,
  CreateFromTemplateData,
  SaveProjectAsTemplateData
} from '../services/templates'
import { isInBypassMode } from '../sample-data'

interface UseDataState<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// ============== Template Gallery Hooks ==============

export function useTemplates(department?: string): UseDataState<TemplateListItem[]> {
  const [data, setData] = useState<TemplateListItem[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const templates = await templatesApi.getTemplates(department)
      setData(templates)
    } catch (err) {
      if (isInBypassMode()) {
        // Mock data for bypass mode
        setData([
          {
            name: 'template-sales-001',
            description: 'Complete workflow for onboarding new customers',
            department: 'SALES',
            task_count: 10,
            estimated_duration_days: 30,
          },
          {
            name: 'template-ops-001',
            description: 'Integrate new logistics provider',
            department: 'OPS',
            task_count: 11,
            estimated_duration_days: 35,
          },
        ])
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch templates'))
      }
    } finally {
      setLoading(false)
    }
  }, [department])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useTemplatePreview(templateId: string | null): UseDataState<TemplatePreview> {
  const [data, setData] = useState<TemplatePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    if (!templateId) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const preview = await templatesApi.getTemplatePreview(templateId)
      setData(preview)
    } catch (err) {
      if (isInBypassMode()) {
        // Mock preview data for bypass mode
        setData({
          template: {
            name: templateId,
            description: 'Mock template preview',
            department: 'SALES',
            estimated_duration_days: 30,
            task_count: 3,
            milestone_count: 1,
          },
          tasks: [
            {
              sequence: 1,
              title: 'Initial Setup',
              description: 'Set up project infrastructure',
              offset_days: 0,
              duration_days: 2,
              default_assignee_role: 'Project Manager',
              is_milestone: false,
              depends_on_sequence: null,
            },
            {
              sequence: 2,
              title: 'Phase 1 Kickoff',
              description: 'First major milestone',
              offset_days: 2,
              duration_days: 1,
              default_assignee_role: 'Project Manager',
              is_milestone: true,
              depends_on_sequence: 1,
            },
            {
              sequence: 3,
              title: 'Core Implementation',
              description: 'Execute main tasks',
              offset_days: 3,
              duration_days: 14,
              default_assignee_role: 'Team Lead',
              is_milestone: false,
              depends_on_sequence: 2,
            },
          ],
          milestones: [
            {
              sequence: 2,
              title: 'Phase 1 Kickoff',
              offset_days: 2,
              duration_days: 1,
            },
          ],
          dependencies: [
            {
              from_sequence: 1,
              to_sequence: 2,
              from_title: 'Initial Setup',
              to_title: 'Phase 1 Kickoff',
            },
            {
              from_sequence: 2,
              to_sequence: 3,
              from_title: 'Phase 1 Kickoff',
              to_title: 'Core Implementation',
            },
          ],
        })
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch template preview'))
      }
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

// ============== Template Mutations Hook ==============

export function useTemplateMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const createTemplate = useCallback(async (data: CreateTemplateData): Promise<{
    success: boolean
    template_id: string
  }> => {
    setLoading(true)
    setError(null)
    try {
      const result = await templatesApi.createTemplate(data)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create template')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const updateTemplate = useCallback(async (templateId: string, data: UpdateTemplateData): Promise<{
    success: boolean
    template_id: string
  }> => {
    setLoading(true)
    setError(null)
    try {
      const result = await templatesApi.updateTemplate(templateId, data)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update template')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteTemplate = useCallback(async (templateId: string): Promise<{
    success: boolean
    message: string
  }> => {
    setLoading(true)
    setError(null)
    try {
      const result = await templatesApi.deleteTemplate(templateId)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete template')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const duplicateTemplate = useCallback(async (templateId: string, newName?: string): Promise<{
    success: boolean
    template_id: string
    template_name: string
    tasks_copied: number
  }> => {
    setLoading(true)
    setError(null)
    try {
      const result = await templatesApi.duplicateTemplate(templateId, newName)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to duplicate template')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const createFromTemplate = useCallback(async (templateId: string, data: CreateFromTemplateData): Promise<{
    success: boolean
    project_id: string
    tasks_created: number
  }> => {
    setLoading(true)
    setError(null)
    try {
      const result = await templatesApi.createFromTemplate(templateId, data)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create project from template')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const saveProjectAsTemplate = useCallback(async (projectId: string, data: SaveProjectAsTemplateData): Promise<{
    success: boolean
    template_id: string
    template_name: string
    tasks_converted: number
    department: string
    estimated_duration_days: number
  }> => {
    setLoading(true)
    setError(null)
    try {
      const result = await templatesApi.saveProjectAsTemplate(projectId, data)
      return result
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save project as template')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    createFromTemplate,
    saveProjectAsTemplate
  }
}
