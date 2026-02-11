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
 * Toast notification component - Santa Brisa style
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
          bgColor: 'bg-success-light dark:bg-success-dark/20',
          borderColor: 'border-success-dark dark:border-success',
          textColor: 'text-success-text dark:text-success',
          iconColor: 'text-success-dark dark:text-success'
        }
      case 'error':
        return {
          icon: AlertCircle,
          bgColor: 'bg-error-light dark:bg-error-dark/20',
          borderColor: 'border-error-dark dark:border-error',
          textColor: 'text-error-text dark:text-error',
          iconColor: 'text-error-dark dark:text-error'
        }
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-gold-light dark:bg-gold-dark/20',
          borderColor: 'border-gold-dark dark:border-gold',
          textColor: 'text-warning-text dark:text-gold',
          iconColor: 'text-warning-text dark:text-gold'
        }
      case 'info':
      default:
        return {
          icon: Info,
          bgColor: 'bg-turquoise-light dark:bg-turquoise-dark/20',
          borderColor: 'border-turquoise-dark dark:border-turquoise',
          textColor: 'text-turquoise-dark dark:text-turquoise',
          iconColor: 'text-turquoise-dark dark:text-turquoise'
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
