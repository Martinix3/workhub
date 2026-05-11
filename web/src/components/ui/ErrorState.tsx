// Error State Component
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface ErrorStateProps {
  title?: string
  message?: string
  error?: Error | null
  onRetry?: () => void
  fullPage?: boolean
  showHomeButton?: boolean
}

export function ErrorState({
  title = 'Error al cargar',
  message = 'No se pudo cargar la informacion. Por favor, intenta de nuevo.',
  error,
  onRetry,
  fullPage = false,
  showHomeButton = false
}: ErrorStateProps) {
  const navigate = useNavigate()

  const content = (
    <div className="flex flex-col items-center justify-center gap-6 p-8 max-w-md mx-auto text-center">
      {/* Error icon */}
      <div className="w-16 h-16 bg-error-light border border-error-dark flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-error-dark" />
      </div>

      {/* Title and message */}
      <div>
        <h2 className="font-heading text-xl font-bold text-neutral-900 mb-2">
          {title}
        </h2>
        <p className="text-neutral-600">
          {message}
        </p>
        {error && import.meta.env.DEV && (
          <p className="mt-2 text-sm text-error-dark font-mono bg-error-light p-2 border border-error">
            {error.message}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="
              flex items-center gap-2 px-4 py-2
              bg-gold-dark text-white font-medium
              border border-neutral-200
              transition-all duration-75
            "
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
          </button>
        )}
        {showHomeButton && (
          <button
            onClick={() => navigate('/')}
            className="
              flex items-center gap-2 px-4 py-2
              bg-white text-neutral-900 font-medium
              border border-neutral-200
              transition-all duration-75
            "
          >
            <Home className="w-4 h-4" />
            Ir al inicio
          </button>
        )}
      </div>
    </div>
  )

  if (fullPage) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        {content}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      {content}
    </div>
  )
}

// Empty state for when there's no data
interface EmptyStateProps {
  title?: string
  message?: string
  actionLabel?: string
  onAction?: () => void
  icon?: React.ReactNode
}

export function EmptyState({
  title = 'Sin datos',
  message = 'No hay datos disponibles en este momento.',
  actionLabel,
  onAction,
  icon
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      {icon && (
        <div className="w-12 h-12 bg-neutral-100 border border-neutral-200 flex items-center justify-center">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-heading text-lg font-bold text-neutral-900 mb-1">
          {title}
        </h3>
        <p className="text-neutral-500 text-sm">
          {message}
        </p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="
            px-4 py-2
            bg-gold-dark text-white font-medium
            border border-neutral-200
            transition-all duration-75
          "
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

export default ErrorState
