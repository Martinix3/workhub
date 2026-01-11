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
// Authentication bypass - disabled by default for security
const IS_BYPASS_ENABLED = import.meta.env.VITE_ENABLE_AUTH_BYPASS === 'true'

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
    // Skip if already checked and not forcing (but verify we have a token)
    const storedUser = getStoredUser()
    const hasToken = frappe.isAuthenticated()
    if (!forceCheck && storedUser && hasToken) {
      setUser(storedUser)
      setLoading(false)
      setAuthChecked(true)
      return
    }

    // Check for bypass mode first (only if bypass is enabled)
    if (IS_BYPASS_ENABLED && sessionStorage.getItem(BYPASS_STORAGE_KEY) === 'true') {
      setUser(BYPASS_USER)
      storeUser(BYPASS_USER)
      setIsBypassMode(true)
      setLoading(false)
      setAuthChecked(true)
      return
    }

    // If we have a token, fetch user info
    if (hasToken) {
      setLoading(true)
      try {
        // Use getUserInfo which returns full user details
        const userInfo = await frappe.getUserInfo()

        if (userInfo && userInfo.user !== 'Guest') {
          const authUser: AuthUser = {
            email: userInfo.email || userInfo.user,
            name: userInfo.full_name || userInfo.user,
            avatarUrl: userInfo.user_image || undefined,
            roles: userInfo.roles
          }
          setUser(authUser)
          storeUser(authUser)
        } else {
          // Token exists but returns Guest - token is invalid
          setUser(null)
          storeUser(null)
          frappe.clearAuthToken()
        }
      } catch (err) {
        console.error('Auth check failed:', err)
        // On network errors, keep the token - it might be valid
        // Just use cached user if available, or set to null
        if (!storedUser) {
          setUser(null)
        }
        // DON'T clear the token on network errors
      } finally {
        setLoading(false)
        setAuthChecked(true)
      }
    } else {
      // No token and not forcing - user is not authenticated
      setLoading(false)
      setAuthChecked(true)
    }
  }, [])

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
      frappe.clearAuthToken()
      setIsBypassMode(false)

      if (!isBypassMode) {
        await frappe.logout()
      }
      setUser(null)
      storeUser(null)
    } catch (err) {
      console.error('Logout failed:', err)
      // Even if logout fails on server, clear local state
      setUser(null)
      storeUser(null)
      frappe.clearAuthToken()
    } finally {
      setLoading(false)
    }
  }, [isBypassMode])

  // Enable bypass mode (for UI review without backend)
  const bypassAuth = useCallback(() => {
    if (!IS_BYPASS_ENABLED) {
      console.warn('Authentication bypass is disabled. Set VITE_ENABLE_AUTH_BYPASS=true in .env to enable for development.')
      return
    }
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

  // Handle OAuth callback (check URL for auth tokens)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const authSuccess = params.get('auth_success')
    const token = params.get('token')

    if (authSuccess === 'true' && token) {
      // Store the API token from OAuth callback
      frappe.setAuthToken(token)

      // Clear URL params (security: don't leave token in URL)
      window.history.replaceState({}, '', window.location.pathname)

      // Verify the token works, then redirect
      const verifyAndRedirect = async () => {
        try {
          const userInfo = await frappe.getUserInfo()
          if (userInfo && userInfo.user !== 'Guest') {
            const authUser: AuthUser = {
              email: userInfo.email || userInfo.user,
              name: userInfo.full_name || userInfo.user,
              avatarUrl: userInfo.user_image || undefined,
              roles: userInfo.roles
            }
            setUser(authUser)
            storeUser(authUser)
            setLoading(false)
            setAuthChecked(true)
          } else {
            // Token didn't work - clear it
            frappe.clearAuthToken()
            setError('La autenticación falló. Por favor intenta de nuevo.')
            setLoading(false)
            setAuthChecked(true)
            return
          }
        } catch (err) {
          // Network error or other issue - keep the token and let user retry
          console.error('Auth verification failed:', err)
          // DON'T clear the token on network errors - it might be valid
          // Just mark as checked and let the user continue
          setLoading(false)
          setAuthChecked(true)
        }

        // Redirect to stored URL
        const returnUrl = sessionStorage.getItem('auth_return_url')
        if (returnUrl && returnUrl !== '/login') {
          sessionStorage.removeItem('auth_return_url')
          window.location.href = returnUrl
        }
      }

      verifyAndRedirect()
    } else if (authSuccess === 'true') {
      // OAuth success but no token - this shouldn't happen
      window.history.replaceState({}, '', window.location.pathname)
      setError('No se recibió el token de autenticación')
      setLoading(false)
      setAuthChecked(true)
    }

    const authError = params.get('auth_error')
    if (authError) {
      setError(decodeURIComponent(authError))
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [checkAuth])

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
