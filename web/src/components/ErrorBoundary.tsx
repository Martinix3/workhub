import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo })
    // Log to error reporting service in production
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-16 h-16 bg-error-light rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-error-dark" />
            </div>

            <h1 className="text-xl font-semibold text-neutral-900 mb-2">
              Algo salió mal
            </h1>

            <p className="text-neutral-600 mb-6">
              Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="text-left mb-6 p-3 bg-neutral-100 rounded text-sm">
                <summary className="cursor-pointer font-medium text-neutral-700">
                  Detalles del error
                </summary>
                <pre className="mt-2 overflow-auto text-xs text-error-dark">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-turquoise-dark text-white rounded-lg hover:bg-turquoise-dark transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Inicio
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
