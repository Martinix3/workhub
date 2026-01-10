import { useState } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  AlertCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Target,
  Mail,
  AtSign,
  CheckCircle2,
  Link as LinkIcon
} from 'lucide-react'
import { useNotifications } from '../../api/hooks/useNotifications'
import type { Notification, NotificationType, NotificationPriority } from '../../api/types/notifications'

interface NotificationCenterProps {
  onNavigate?: (href: string) => void
}

// Format time ago (e.g., "2h ago", "3d ago")
function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffSec < 60) return 'ahora'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHour < 24) return `${diffHour}h`
  if (diffDay < 7) return `${diffDay}d`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)}sem`
  return `${Math.floor(diffDay / 30)}mes`
}

// Get icon for notification type
function getNotificationIcon(type: NotificationType, size = 16) {
  const iconProps = { size }
  switch (type) {
    case 'TASK_ASSIGNED':
      return <Target {...iconProps} />
    case 'OVERDUE':
      return <Clock {...iconProps} />
    case 'BLOCKED':
      return <XCircle {...iconProps} />
    case 'DEPENDENCY':
      return <LinkIcon {...iconProps} />
    case 'PROJECT_RISK':
      return <AlertTriangle {...iconProps} />
    case 'EMAIL_TASK':
      return <Mail {...iconProps} />
    case 'MENTION':
      return <AtSign {...iconProps} />
    case 'COMPLETED':
      return <CheckCircle2 {...iconProps} />
    default:
      return <AlertCircle {...iconProps} />
  }
}

// Get color class for priority
function getPriorityColor(priority: NotificationPriority): string {
  switch (priority) {
    case 'HIGH':
      return 'text-red-400'
    case 'MEDIUM':
      return 'text-amber-400'
    case 'LOW':
      return 'text-slate-400'
    default:
      return 'text-slate-400'
  }
}

interface NotificationItemProps {
  notification: Notification
  onMarkRead: (id: string) => void
  onDelete: (id: string) => void
  onNavigate?: (href: string) => void
}

function NotificationItem({ notification, onMarkRead, onDelete, onNavigate }: NotificationItemProps) {
  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id)
    }
    if (notification.action_url && onNavigate) {
      onNavigate(notification.action_url)
    }
  }

  return (
    <div
      className={`
        border-b border-slate-700 last:border-b-0
        ${notification.read ? 'bg-[#0f172a]' : 'bg-[#1e293b]'}
        hover:bg-slate-700/50 transition-colors
      `}
    >
      <div className="p-3">
        {/* Header: Icon, Title, Time, Priority */}
        <div className="flex items-start gap-2 mb-1">
          <div className={`mt-0.5 ${getPriorityColor(notification.priority)}`}>
            {getNotificationIcon(notification.type, 16)}
          </div>
          <div className="flex-1 min-w-0">
            <button
              onClick={handleClick}
              className="text-left w-full group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h4 className={`
                    text-sm font-medium font-['Inter'] truncate
                    ${notification.read ? 'text-slate-300' : 'text-white'}
                    ${notification.action_url ? 'group-hover:text-[#f5ce3e]' : ''}
                  `}>
                    {notification.title}
                  </h4>
                </div>
                <span className="text-xs text-slate-500 font-['Inter'] whitespace-nowrap flex-shrink-0">
                  {formatTimeAgo(notification.created_at)}
                </span>
              </div>
              {/* Message */}
              <p className={`
                text-xs font-['Inter'] mt-1 line-clamp-2
                ${notification.read ? 'text-slate-400' : 'text-slate-300'}
              `}>
                {notification.message}
              </p>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-1 mt-2">
          {!notification.read && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMarkRead(notification.id)
              }}
              className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-white transition-colors"
              title="Marcar como leida"
            >
              <Check size={14} />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete(notification.id)
            }}
            className="p-1.5 hover:bg-slate-600 rounded text-slate-400 hover:text-red-400 transition-colors"
            title="Eliminar"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
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
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded hover:bg-slate-700 transition-colors"
        title="Notificaciones"
      >
        <Bell size={20} className="text-slate-300" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold font-['Inter'] rounded-full flex items-center justify-center">
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
          <div className="absolute bottom-full right-0 mb-2 w-96 max-w-[calc(100vw-2rem)] bg-[#0f172a] border border-slate-700 shadow-lg z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-sm font-bold font-['Inter'] text-white">
                Notificaciones
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors font-['Inter']"
                >
                  <CheckCheck size={14} />
                  <span>Marcar todas</span>
                </button>
              )}
            </div>

            {/* Notification List */}
            <div className="max-h-[32rem] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-slate-400 text-sm font-['Inter']">
                  Cargando...
                </div>
              ) : !notifications || notifications.length === 0 ? (
                <div className="p-8 text-center">
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
