// Protected Route Component
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { ShieldX } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRoles?: string[]
  fallback?: React.ReactNode
}

// Check if user has any of the required roles
function hasAnyRole(userRoles: string[] | undefined, requiredRoles: string[]): boolean {
  if (!userRoles || userRoles.length === 0) return false
  return requiredRoles.some(role => userRoles.includes(role))
}

// Default access denied fallback
function AccessDenied() {
  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto mb-4 bg-error-light rounded-full flex items-center justify-center">
          <ShieldX size={32} className="text-error" />
        </div>
        <h2 className="text-xl font-semibold text-neutral-900 mb-2">
          Acceso Denegado
        </h2>
        <p className="text-neutral-600 mb-6">
          No tienes permisos para acceder a esta seccion.
          Contacta a tu administrador si crees que esto es un error.
        </p>
        <a
          href="/"
          className="inline-block px-4 py-2 bg-gold-dark text-white rounded-lg hover:bg-gold-dark transition-colors"
        >
          Volver al inicio
        </a>
      </div>
    </div>
  )
}

export function ProtectedRoute({ children, requiredRoles, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = useLocation()

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-neutral-300 border-t-gold-dark rounded-full animate-spin mb-4"></div>
          <p className="text-neutral-600">Cargando...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Check required roles if specified
  if (requiredRoles && requiredRoles.length > 0) {
    if (!hasAnyRole(user?.roles, requiredRoles)) {
      return fallback ? <>{fallback}</> : <AccessDenied />
    }
  }

  return <>{children}</>
}

export default ProtectedRoute
