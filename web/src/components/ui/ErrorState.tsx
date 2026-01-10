// Error State Component - Neobrutal style
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
      <div className="w-16 h-16 bg-red-100 border-2 border-red-500 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-red-600" />
      </div>

      {/* Title and message */}
      <div>
        <h2 className="font-serif text-xl font-bold text-stone-900 mb-2">
          {title}
        </h2>
        <p className="text-stone-600">
          {message}
        </p>
        {error && import.meta.env.DEV && (
          <p className="mt-2 text-sm text-red-600 font-mono bg-red-50 p-2 border border-red-200">
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
              bg-amber-500 text-white font-medium
              border-2 border-stone-900
              shadow-[4px_4px_0_#1c1917]
              hover:translate-x-[2px] hover:translate-y-[2px]
              hover:shadow-[2px_2px_0_#1c1917]
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
              bg-white text-stone-900 font-medium
              border-2 border-stone-900
              shadow-[4px_4px_0_#1c1917]
              hover:translate-x-[2px] hover:translate-y-[2px]
              hover:shadow-[2px_2px_0_#1c1917]
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
        <div className="w-12 h-12 bg-stone-100 border-2 border-stone-300 flex items-center justify-center">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-serif text-lg font-bold text-stone-900 mb-1">
          {title}
        </h3>
        <p className="text-stone-500 text-sm">
          {message}
        </p>
      </div>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="
            px-4 py-2
            bg-amber-500 text-white font-medium
            border-2 border-stone-900
            shadow-[4px_4px_0_#1c1917]
            hover:translate-x-[2px] hover:translate-y-[2px]
            hover:shadow-[2px_2px_0_#1c1917]
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
