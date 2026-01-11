// =============================================================================
// Notification Types - WorkHub Notifications
// =============================================================================

/**
 * Notification type enum matching WH Notification doctype
 */
export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'BLOCKED'
  | 'OVERDUE'
  | 'DEPENDENCY'
  | 'PROJECT_RISK'
  | 'EMAIL_TASK'
  | 'MENTION'
  | 'COMPLETED'

/**
 * Notification priority levels
 */
export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH'

/**
 * Notification interface matching WH Notification doctype fields
 */
export interface Notification {
  /** Unique notification ID */
  id: string
  /** Target user (Link to User) */
  user: string
  /** Type of notification */
  type: NotificationType
  /** Priority level */
  priority: NotificationPriority
  /** Notification title */
  title: string
  /** Notification message content */
  message: string
  /** Read status (0=unread, 1=read) */
  read: boolean
  /** Creation timestamp (ISO string) */
  created_at: string
  /** Optional reference doctype */
  reference_doctype?: string
  /** Optional reference document name */
  reference_name?: string
  /** Optional action URL for navigation */
  action_url?: string
}

/**
 * Response from get_notifications API
 */
export interface GetNotificationsResponse {
  /** List of notifications */
  notifications: Notification[]
  /** Count of unread notifications */
  unread_count: number
  /** Total count of notifications */
  total_count: number
}
