// Authentication Context for WorkHub
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import frappe from '../api/frappe-client'

// User type
export interface AuthUser {
  email: string
  name: string
  avatarUrl?: string
  roles?: string[]
}

// Auth context type
interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  isBypassMode: boolean
  login: () => void
  logout: () => Promise<void>
  clearError: () => void
  bypassAuth: () => void
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Google OAuth configuration
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
// Frappe backend URL - used in production OAuth flows
export const FRAPPE_URL = import.meta.env.VITE_FRAPPE_URL || 'http://localhost:8000'

// Provider props
interface AuthProviderProps {
  children: ReactNode
}

// Demo user for bypass mode
const BYPASS_USER: AuthUser = {
  email: 'demo@santabrisa.com',
  name: 'Usuario Demo',
  avatarUrl: undefined,
  roles: ['Sales Manager', 'Viewer']
}

// Session storage keys
const USER_STORAGE_KEY = 'workhub_user'
const BYPASS_STORAGE_KEY = 'auth_bypass'

// Helper to get stored user
function getStoredUser(): AuthUser | null {
  try {
    const stored = sessionStorage.getItem(USER_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

// Helper to store user
function storeUser(user: AuthUser | null): void {
  if (user) {
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } else {
    sessionStorage.removeItem(USER_STORAGE_KEY)
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Initialize from sessionStorage to avoid flash
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser())
  const [loading, setLoading] = useState(() => !getStoredUser())
  const [error, setError] = useState<string | null>(null)
  const [isBypassMode, setIsBypassMode] = useState(() => sessionStorage.getItem(BYPASS_STORAGE_KEY) === 'true')
  const [authChecked, setAuthChecked] = useState(false)

  // Check auth with backend (only called on initial mount or after OAuth callback)
  const checkAuth = useCallback(async (forceCheck = false) => {
    // Skip if already checked and not forcing
    const storedUser = getStoredUser()
    if (!forceCheck && storedUser && authChecked) {
      setUser(storedUser)
      setLoading(false)
      return
    }

    // Check for bypass mode first
    if (sessionStorage.getItem(BYPASS_STORAGE_KEY) === 'true') {
      setUser(BYPASS_USER)
      storeUser(BYPASS_USER)
      setIsBypassMode(true)
      setLoading(false)
      setAuthChecked(true)
      return
    }

    // Verify authentication via cookie
    setLoading(true)
    try {
      // Call verify_auth_cookie endpoint which reads the HTTP-only cookie
      const authInfo = await frappe.verifyAuthCookie()

      if (authInfo.authenticated && authInfo.user !== 'Guest') {
        const authUser: AuthUser = {
          email: authInfo.email || authInfo.user,
          name: authInfo.full_name || authInfo.user,
          avatarUrl: authInfo.user_image || undefined,
          roles: authInfo.roles || []
        }
        setUser(authUser)
        storeUser(authUser)
      } else {
        // Not authenticated or cookie is invalid
        setUser(null)
        storeUser(null)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      // On network errors, use cached user if available
      if (!storedUser) {
        setUser(null)
      }
    } finally {
      setLoading(false)
      setAuthChecked(true)
    }
  }, [authChecked])

  // Initialize auth on mount - only once
  useEffect(() => {
    if (!authChecked) {
      checkAuth()
    }
  }, [authChecked, checkAuth])

  // Handle Google OAuth login
  const login = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google OAuth not configured. Set VITE_GOOGLE_CLIENT_ID in .env')
      return
    }

    setLoading(true)
    try {
      // Get the OAuth authorization URL from Frappe
      const response = await frappe.call<{ url?: string; error?: string }>(
        'workhub_frappe_app.api.auth.get_social_login_url',
        { provider: 'google', redirect_to: window.location.origin }
      )

      if (response.error) {
        setError(`OAuth error: ${response.error}`)
        setLoading(false)
        return
      }

      if (response.url) {
        // Store return URL
        sessionStorage.setItem('auth_return_url', window.location.pathname)
        // Redirect to Google OAuth
        window.location.href = response.url
      } else {
        setError('No se pudo obtener la URL de autenticación')
        setLoading(false)
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Error al iniciar sesión con Google')
      setLoading(false)
    }
  }, [])

  // Handle logout
  const logout = useCallback(async () => {
    setLoading(true)
    try {
      // Clear all auth data
      sessionStorage.removeItem(BYPASS_STORAGE_KEY)
      sessionStorage.removeItem(USER_STORAGE_KEY)
      setIsBypassMode(false)

      if (!isBypassMode) {
        // Call logout endpoint which clears the HTTP-only cookie
        await frappe.logout()
      }
      setUser(null)
      storeUser(null)
    } catch (err) {
      console.error('Logout failed:', err)
      // Even if logout fails on server, clear local state
      setUser(null)
      storeUser(null)
    } finally {
      setLoading(false)
    }
  }, [isBypassMode])

  // Enable bypass mode (for UI review without backend)
  const bypassAuth = useCallback(() => {
    sessionStorage.setItem(BYPASS_STORAGE_KEY, 'true')
    setUser(BYPASS_USER)
    storeUser(BYPASS_USER)
    setIsBypassMode(true)
    setError(null)
  }, [])

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Handle OAuth callback (check URL for auth success)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authSuccess = params.get('auth_success')
    const authError = params.get('auth_error')

    if (authSuccess === 'true') {
      // Clear URL params (security: clean up URL)
      window.history.replaceState({}, '', window.location.pathname)

      // Verify the auth cookie and redirect
      const verifyAndRedirect = async () => {
        try {
          // Call verify_auth_cookie endpoint which reads the HTTP-only cookie
          const authInfo = await frappe.verifyAuthCookie()

          if (authInfo.authenticated && authInfo.user !== 'Guest') {
            const authUser: AuthUser = {
              email: authInfo.email || authInfo.user,
              name: authInfo.full_name || authInfo.user,
              avatarUrl: authInfo.user_image || undefined,
              roles: authInfo.roles || []
            }
            setUser(authUser)
            storeUser(authUser)
            setLoading(false)
            setAuthChecked(true)
          } else {
            // Cookie authentication failed
            setError('La autenticación falló. Por favor intenta de nuevo.')
            setLoading(false)
            setAuthChecked(true)
            return
          }
        } catch (err) {
          // Network error or other issue
          console.error('Auth verification failed:', err)
          setError('Error al verificar la autenticación')
          setLoading(false)
          setAuthChecked(true)
          return
        }

        // Redirect to stored URL
        const returnUrl = sessionStorage.getItem('auth_return_url')
        if (returnUrl && returnUrl !== '/login') {
          sessionStorage.removeItem('auth_return_url')
          window.location.href = returnUrl
        }
      }

      verifyAndRedirect()
    }

    if (authError) {
      setError(decodeURIComponent(authError))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    isBypassMode,
    login,
    logout,
    clearError,
    bypassAuth
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
