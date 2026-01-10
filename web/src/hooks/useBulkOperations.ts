import { useState, useCallback } from 'react'
import { frappe } from '../api/frappe-client'
import type { TaskStatus } from '../components/sections/tasks/types'

// Response types based on backend bulk_operations.py
export interface BulkOperationResult {
  total: number
  success_count: number
  failure_count: number
  results: {
    success: Array<{
      task_id: string
      details: Record<string, unknown>
    }>
    failed: Array<{
      task_id: string
      error: string
    }>
  }
  undo_id?: string
}

export interface UndoOperationResult extends BulkOperationResult {
  operation_type: string
  undo_timestamp: string
}

export interface UseBulkOperationsReturn {
  loading: boolean
  error: Error | null
  lastUndoId: string | null
  bulkChangeStatus: (
    taskIds: string[],
    newStatus: TaskStatus,
    onSuccess?: (result: BulkOperationResult) => void
  ) => Promise<BulkOperationResult | null>
  bulkAssign: (
    taskIds: string[],
    assignedTo: string,
    onSuccess?: (result: BulkOperationResult) => void
  ) => Promise<BulkOperationResult | null>
  bulkChangePriority: (
    taskIds: string[],
    newPriority: string,
    onSuccess?: (result: BulkOperationResult) => void
  ) => Promise<BulkOperationResult | null>
  bulkMoveProject: (
    taskIds: string[],
    projectId: string | null,
    onSuccess?: (result: BulkOperationResult) => void
  ) => Promise<BulkOperationResult | null>
  bulkCreateWorklinks: (
    taskIds: string[],
    sourceDoctype: string,
    sourceId: string,
    onSuccess?: (result: BulkOperationResult) => void
  ) => Promise<BulkOperationResult | null>
  bulkRemoveWorklinks: (
    taskIds: string[],
    onSuccess?: (result: BulkOperationResult) => void
  ) => Promise<BulkOperationResult | null>
  undoLastOperation: (
    undoId?: string,
    onSuccess?: (result: UndoOperationResult) => void
  ) => Promise<UndoOperationResult | null>
  clearError: () => void
}

/**
 * Custom hook for bulk task operations
 *
 * Wraps all bulk operation API calls with loading states, error handling,
 * and success callbacks. Supports undo functionality for operations.
 *
 * @returns Object with bulk operation functions and state
 */
export function useBulkOperations(): UseBulkOperationsReturn {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUndoId, setLastUndoId] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const bulkChangeStatus = useCallback(
    async (
      taskIds: string[],
      newStatus: TaskStatus,
      onSuccess?: (result: BulkOperationResult) => void
    ): Promise<BulkOperationResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await frappe.call<BulkOperationResult>(
          'workhub_frappe_app.api.bulk_operations.bulk_change_status',
          {
            task_ids: taskIds,
            new_status: newStatus
          }
        )

        if (result.undo_id) {
          setLastUndoId(result.undo_id)
        }

        onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to change status')
        setError(error)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const bulkAssign = useCallback(
    async (
      taskIds: string[],
      assignedTo: string,
      onSuccess?: (result: BulkOperationResult) => void
    ): Promise<BulkOperationResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await frappe.call<BulkOperationResult>(
          'workhub_frappe_app.api.bulk_operations.bulk_assign',
          {
            task_ids: taskIds,
            assigned_to: assignedTo
          }
        )

        if (result.undo_id) {
          setLastUndoId(result.undo_id)
        }

        onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to assign tasks')
        setError(error)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const bulkChangePriority = useCallback(
    async (
      taskIds: string[],
      newPriority: string,
      onSuccess?: (result: BulkOperationResult) => void
    ): Promise<BulkOperationResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await frappe.call<BulkOperationResult>(
          'workhub_frappe_app.api.bulk_operations.bulk_change_priority',
          {
            task_ids: taskIds,
            new_priority: newPriority
          }
        )

        if (result.undo_id) {
          setLastUndoId(result.undo_id)
        }

        onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to change priority')
        setError(error)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const bulkMoveProject = useCallback(
    async (
      taskIds: string[],
      projectId: string | null,
      onSuccess?: (result: BulkOperationResult) => void
    ): Promise<BulkOperationResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await frappe.call<BulkOperationResult>(
          'workhub_frappe_app.api.bulk_operations.bulk_move_project',
          {
            task_ids: taskIds,
            project_id: projectId
          }
        )

        if (result.undo_id) {
          setLastUndoId(result.undo_id)
        }

        onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to move tasks')
        setError(error)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const bulkCreateWorklinks = useCallback(
    async (
      taskIds: string[],
      sourceDoctype: string,
      sourceId: string,
      onSuccess?: (result: BulkOperationResult) => void
    ): Promise<BulkOperationResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await frappe.call<BulkOperationResult>(
          'workhub_frappe_app.api.bulk_operations.bulk_create_worklinks',
          {
            task_ids: taskIds,
            source_doctype: sourceDoctype,
            source_id: sourceId
          }
        )

        if (result.undo_id) {
          setLastUndoId(result.undo_id)
        }

        onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to create worklinks')
        setError(error)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const bulkRemoveWorklinks = useCallback(
    async (
      taskIds: string[],
      onSuccess?: (result: BulkOperationResult) => void
    ): Promise<BulkOperationResult | null> => {
      setLoading(true)
      setError(null)
      try {
        const result = await frappe.call<BulkOperationResult>(
          'workhub_frappe_app.api.bulk_operations.bulk_remove_worklinks',
          {
            task_ids: taskIds
          }
        )

        if (result.undo_id) {
          setLastUndoId(result.undo_id)
        }

        onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to remove worklinks')
        setError(error)
        return null
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const undoLastOperation = useCallback(
    async (
      undoId?: string,
      onSuccess?: (result: UndoOperationResult) => void
    ): Promise<UndoOperationResult | null> => {
      const idToUndo = undoId || lastUndoId

      if (!idToUndo) {
        const error = new Error('No operation to undo')
        setError(error)
        return null
      }

      setLoading(true)
      setError(null)
      try {
        const result = await frappe.call<UndoOperationResult>(
          'workhub_frappe_app.api.bulk_operations.undo_bulk_operation',
          {
            undo_id: idToUndo
          }
        )

        // Clear the undo ID after successful undo
        if (idToUndo === lastUndoId) {
          setLastUndoId(null)
        }

        onSuccess?.(result)
        return result
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to undo operation')
        setError(error)
        return null
      } finally {
        setLoading(false)
      }
    },
    [lastUndoId]
  )

  return {
    loading,
    error,
    lastUndoId,
    bulkChangeStatus,
    bulkAssign,
    bulkChangePriority,
    bulkMoveProject,
    bulkCreateWorklinks,
    bulkRemoveWorklinks,
    undoLastOperation,
    clearError
  }
}

export default useBulkOperations
