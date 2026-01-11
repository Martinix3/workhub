// Bulk Operations API Service
import { frappe } from '../frappe-client'
import type { TaskStatus } from '../../components/sections/tasks/types'

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

export const bulkApi = {
  // ============== Bulk Operations ==============

  /**
   * Change status for multiple tasks
   */
  async bulkChangeStatus(
    taskIds: string[],
    newStatus: TaskStatus
  ): Promise<BulkOperationResult> {
    return frappe.call<BulkOperationResult>(
      'workhub_frappe_app.api.bulk_operations.bulk_change_status',
      {
        task_ids: taskIds,
        new_status: newStatus
      }
    )
  },

  /**
   * Assign multiple tasks to a user
   */
  async bulkAssign(
    taskIds: string[],
    assignedTo: string
  ): Promise<BulkOperationResult> {
    return frappe.call<BulkOperationResult>(
      'workhub_frappe_app.api.bulk_operations.bulk_assign',
      {
        task_ids: taskIds,
        assigned_to: assignedTo
      }
    )
  },

  /**
   * Change priority for multiple tasks
   */
  async bulkChangePriority(
    taskIds: string[],
    newPriority: string
  ): Promise<BulkOperationResult> {
    return frappe.call<BulkOperationResult>(
      'workhub_frappe_app.api.bulk_operations.bulk_change_priority',
      {
        task_ids: taskIds,
        new_priority: newPriority
      }
    )
  },

  /**
   * Move multiple tasks to a project
   */
  async bulkMoveProject(
    taskIds: string[],
    projectId: string | null
  ): Promise<BulkOperationResult> {
    return frappe.call<BulkOperationResult>(
      'workhub_frappe_app.api.bulk_operations.bulk_move_project',
      {
        task_ids: taskIds,
        project_id: projectId
      }
    )
  },

  /**
   * Create WorkLinks for multiple tasks
   */
  async bulkCreateWorklinks(
    taskIds: string[],
    sourceDoctype: string,
    sourceId: string
  ): Promise<BulkOperationResult> {
    return frappe.call<BulkOperationResult>(
      'workhub_frappe_app.api.bulk_operations.bulk_create_worklinks',
      {
        task_ids: taskIds,
        source_doctype: sourceDoctype,
        source_id: sourceId
      }
    )
  },

  /**
   * Remove WorkLinks from multiple tasks
   */
  async bulkRemoveWorklinks(
    taskIds: string[]
  ): Promise<BulkOperationResult> {
    return frappe.call<BulkOperationResult>(
      'workhub_frappe_app.api.bulk_operations.bulk_remove_worklinks',
      {
        task_ids: taskIds
      }
    )
  },

  // ============== Undo ==============

  /**
   * Undo a bulk operation using its undo_id
   */
  async undoBulkOperation(
    undoId: string
  ): Promise<UndoOperationResult> {
    return frappe.call<UndoOperationResult>(
      'workhub_frappe_app.api.bulk_operations.undo_bulk_operation',
      {
        undo_id: undoId
      }
    )
  }
}

export default bulkApi
