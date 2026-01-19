import { useState } from 'react'
import { Bell, CheckCheck } from 'lucide-react'
import { useNotifications } from '../../api/hooks/useNotifications'
import { NotificationItem } from './NotificationItem'

interface NotificationCenterProps {
  onNavigate?: (href: string) => void
}

export function NotificationCenter({ onNavigate }: NotificationCenterProps) {
  const [open, setOpen] = useState(false)
  const { notifications, unreadCount, loading, markRead, markAllRead, deleteNotification } = useNotifications()

  const handleMarkRead = async (id: string) => {
    await markRead(id)
  }

  const handleDelete = async (id: string) => {
    await deleteNotification(id)
  }

  const handleMarkAllRead = async () => {
    await markAllRead()
  }

  const handleNavigate = (href: string) => {
    setOpen(false)
    onNavigate?.(href)
  }

  return (
    <div data-testid="notification-center" className="relative">
      {/* Bell Button */}
      <button
        data-testid="notification-bell"
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded hover:bg-slate-700 transition-colors text-slate-300"
        title="Notificaciones"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span data-testid="notification-badge" className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold font-['Inter'] rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div data-testid="notification-dropdown" className="absolute bottom-full right-0 mb-2 w-96 max-w-[calc(100vw-2rem)] bg-[#0f172a] border border-slate-700 shadow-lg z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-sm font-bold font-['Inter'] text-white">
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <button
                  data-testid="mark-all-read-button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors font-['Inter']"
                >
                  <CheckCheck size={14} />
                  <span>Marcar todas</span>
                </button>
              )}
            </div>

            {/* Notification List */}
            <div data-testid="notification-list" className="max-h-[32rem] overflow-y-auto">
              {loading ? (
                <div data-testid="loading-state" className="p-8 text-center text-slate-400 text-sm font-['Inter']">
                  Cargando...
                </div>
              ) : !notifications || notifications.length === 0 ? (
                <div data-testid="empty-state" className="p-8 text-center">
                  <Bell size={32} className="text-slate-600 mx-auto mb-3" />
                  <p className="text-sm text-slate-400 font-['Inter']">
                    No tienes notificaciones
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onDelete={handleDelete}
                    onNavigate={handleNavigate}
                  />
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
