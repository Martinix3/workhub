import { useEffect } from 'react'
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  message: string
  type: ToastType
  duration?: number
}

interface ToastProps {
  toast: Toast
  onDismiss: (id: string) => void
}

/**
 * Toast notification component with brutalist design
 * Displays temporary notifications at the bottom-right of the screen
 */
export function ToastNotification({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDismiss(toast.id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [toast.id, toast.duration, onDismiss])

  const getTypeConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: CheckCircle2,
          bgColor: 'bg-green-50 dark:bg-green-900/20',
          borderColor: 'border-green-600 dark:border-green-400',
          textColor: 'text-green-800 dark:text-green-300',
          iconColor: 'text-green-600 dark:text-green-400'
        }
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-600 dark:border-red-400',
          textColor: 'text-red-800 dark:text-red-300',
          iconColor: 'text-red-600 dark:text-red-400'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-50 dark:bg-amber-900/20',
          borderColor: 'border-amber-600 dark:border-amber-400',
          textColor: 'text-amber-800 dark:text-amber-300',
          iconColor: 'text-amber-600 dark:text-amber-400'
        }
      case 'info':
      default:
        return {
          icon: Info,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-600 dark:border-blue-400',
          textColor: 'text-blue-800 dark:text-blue-300',
          iconColor: 'text-blue-600 dark:text-blue-400'
        }
    }
  }

  const config = getTypeConfig()
  const Icon = config.icon

  return (
    <div
      className={`
        ${config.bgColor}
        border-2 ${config.borderColor}
        p-4 pr-12
        shadow-[4px_4px_0_rgba(0,0,0,0.8)]
        min-w-[300px] max-w-md
        animate-slide-in-right
      `}
    >
      <div className="flex items-start gap-3">
        <Icon size={20} className={`${config.iconColor} flex-shrink-0 mt-0.5`} />
        <p className={`text-sm font-medium ${config.textColor} flex-1`}>
          {toast.message}
        </p>
        <button
          onClick={() => onDismiss(toast.id)}
          className={`
            ${config.iconColor}
            hover:opacity-70
            transition-opacity
            absolute top-3 right-3
          `}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

/**
 * Container for all active toast notifications
 * Displays toasts stacked at the bottom-right of the screen
 */
export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastNotification toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}
