// Role Guard Component - Conditionally render UI based on user roles
import { type ReactNode } from 'react'
import { useAuth } from './AuthContext'

interface RoleGuardProps {
  children: ReactNode
  roles: string[]
  fallback?: ReactNode
  requireAll?: boolean // If true, user must have ALL roles. Default: any role matches
}

// Check if user has any of the required roles
function hasAnyRole(userRoles: string[] | undefined, requiredRoles: string[]): boolean {
  if (!userRoles || userRoles.length === 0) return false
  return requiredRoles.some(role => userRoles.includes(role))
}

// Check if user has all of the required roles
function hasAllRoles(userRoles: string[] | undefined, requiredRoles: string[]): boolean {
  if (!userRoles || userRoles.length === 0) return false
  return requiredRoles.every(role => userRoles.includes(role))
}

/**
 * RoleGuard - Conditionally render content based on user roles
 *
 * @example
 * // Show admin button only to System Manager
 * <RoleGuard roles={['System Manager']}>
 *   <AdminButton />
 * </RoleGuard>
 *
 * @example
 * // Show button to users with ANY of the roles
 * <RoleGuard roles={['Sales Manager', 'Marketing Manager']}>
 *   <ReportsButton />
 * </RoleGuard>
 *
 * @example
 * // Show button only if user has ALL roles
 * <RoleGuard roles={['System Manager', 'HR Manager']} requireAll>
 *   <SensitiveDataButton />
 * </RoleGuard>
 *
 * @example
 * // Show fallback for users without required roles
 * <RoleGuard
 *   roles={['System Manager']}
 *   fallback={<UpgradePrompt />}
 * >
 *   <AdminPanel />
 * </RoleGuard>
 */
export function RoleGuard({ children, roles, fallback = null, requireAll = false }: RoleGuardProps) {
  const { user, loading } = useAuth()

  // While loading, render nothing (or could render a skeleton)
  if (loading) {
    return null
  }

  // Check roles
  const hasAccess = requireAll
    ? hasAllRoles(user?.roles, roles)
    : hasAnyRole(user?.roles, roles)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * useHasRole - Hook to check if current user has specific roles
 *
 * @example
 * const { hasRole, hasAnyRole, hasAllRoles } = useHasRole()
 *
 * if (hasRole('System Manager')) {
 *   // Show admin features
 * }
 *
 * if (hasAnyRole(['Sales Manager', 'Marketing Manager'])) {
 *   // Show reports
 * }
 */
export function useHasRole() {
  const { user, loading } = useAuth()

  const hasRole = (role: string): boolean => {
    if (loading || !user?.roles) return false
    return user.roles.includes(role)
  }

  const checkAnyRole = (roles: string[]): boolean => {
    if (loading || !user?.roles) return false
    return roles.some(role => user.roles!.includes(role))
  }

  const checkAllRoles = (roles: string[]): boolean => {
    if (loading || !user?.roles) return false
    return roles.every(role => user.roles!.includes(role))
  }

  return {
    hasRole,
    hasAnyRole: checkAnyRole,
    hasAllRoles: checkAllRoles,
    roles: user?.roles || [],
    loading
  }
}

export default RoleGuard
