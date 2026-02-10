// React hooks for Notifications data
import { useState, useEffect, useCallback } from 'react'
import notificationsApi from '../services/notifications'
import type { Notification } from '../types/notifications'
import { isInBypassMode } from '../sample-data'

interface UseNotificationsReturn {
  notifications: Notification[] | null
  unreadCount: number
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  markRead: (notificationId: string) => Promise<void>
  markAllRead: () => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
}

/**
 * Hook for managing user notifications
 * Provides notification list, unread count, and mutation actions
 * Follows the useAlerts pattern from CommandCenter
 */
export function useNotifications(): UseNotificationsReturn {
  const [notifications, setNotifications] = useState<Notification[] | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await notificationsApi.getNotifications()
      setNotifications(response.notifications)
      setUnreadCount(response.unread_count)
    } catch (err) {
      if (isInBypassMode()) {
        setNotifications([])
        setUnreadCount(0)
      } else {
        setError(err instanceof Error ? err : new Error('Failed to fetch notifications'))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  const markRead = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.markRead(notificationId)
      // Optimistic update - mark as read locally
      setNotifications(prev =>
        prev?.map(n => n.id === notificationId ? { ...n, read: true } : n) ?? null
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark notification as read'))
      // Refetch on error to restore correct state
      await fetch()
    }
  }, [fetch])

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead()
      // Optimistic update - mark all as read locally
      setNotifications(prev =>
        prev?.map(n => ({ ...n, read: true })) ?? null
      )
      setUnreadCount(0)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to mark all notifications as read'))
      // Refetch on error to restore correct state
      await fetch()
    }
  }, [fetch])

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await notificationsApi.deleteNotification(notificationId)
      // Optimistic update - remove from list
      const wasUnread = notifications?.find(n => n.id === notificationId)?.read === false
      setNotifications(prev => prev?.filter(n => n.id !== notificationId) ?? null)
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete notification'))
      // Refetch on error to restore correct state
      await fetch()
    }
  }, [notifications, fetch])

  useEffect(() => { fetch() }, [fetch])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refetch: fetch,
    markRead,
    markAllRead,
    deleteNotification
  }
}
