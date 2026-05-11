// Notifications API service
import { frappe } from '../frappe-client'
import type { GetNotificationsResponse } from '../types/notifications'

export const notificationsApi = {
  /**
   * Get notifications for the current user
   * @param filters Optional filters (e.g., unread only, specific types)
   * @returns Notifications list with unread count
   */
  async getNotifications(filters?: {
    unread_only?: boolean
    limit?: number
  }): Promise<GetNotificationsResponse> {
    const data = await frappe.call<GetNotificationsResponse>(
      'workhub_frappe_app.api.notifications.get_notifications',
      filters
    )
    return data
  },

  /**
   * Mark a specific notification as read
   * @param notificationId The notification ID to mark as read
   */
  async markRead(notificationId: string): Promise<void> {
    await frappe.call('workhub_frappe_app.api.notifications.mark_read', {
      notification_id: notificationId
    })
  },

  /**
   * Mark all notifications as read for the current user
   */
  async markAllRead(): Promise<void> {
    await frappe.call('workhub_frappe_app.api.notifications.mark_all_read')
  },

  /**
   * Delete a specific notification
   * @param notificationId The notification ID to delete
   */
  async deleteNotification(notificationId: string): Promise<void> {
    await frappe.call('workhub_frappe_app.api.notifications.delete_notification', {
      notification_id: notificationId
    })
  }
}

export default notificationsApi
