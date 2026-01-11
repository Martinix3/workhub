import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext'
import type { ReactNode } from 'react'

// Mock frappe client
vi.mock('../../api/frappe-client', () => ({
  default: {
    isAuthenticated: vi.fn(() => false),
    getUserInfo: vi.fn(),
    clearAuthToken: vi.fn(),
    logout: vi.fn(),
    setAuthToken: vi.fn(),
  },
  frappe: {
    isAuthenticated: vi.fn(() => false),
    getUserInfo: vi.fn(),
    clearAuthToken: vi.fn(),
    logout: vi.fn(),
    setAuthToken: vi.fn(),
  },
}))

// Test component to access auth context
function TestComponent({ onRender }: { onRender: (auth: ReturnType<typeof useAuth>) => void }) {
  const auth = useAuth()
  onRender(auth)
  return null
}

describe('AuthContext Security Tests', () => {
  let originalEnv: Record<string, string>

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...import.meta.env }

    // Clear sessionStorage before each test
    sessionStorage.clear()

    // Clear localStorage before each test
    localStorage.clear()

    // Reset all mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Restore environment
    Object.assign(import.meta.env, originalEnv)

    // Clean up storage
    sessionStorage.clear()
    localStorage.clear()
  })

  describe('Bypass Disabled (Production Mode)', () => {
    beforeEach(() => {
      // Simulate production environment - bypass disabled
      import.meta.env.VITE_ENABLE_AUTH_BYPASS = 'false'
    })

    it('should expose isBypassEnabled as false when VITE_ENABLE_AUTH_BYPASS is false', async () => {
      let authContext: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      expect(authContext?.isBypassEnabled).toBe(false)
    })

    it('should not authenticate when bypassAuth() is called with bypass disabled', async () => {
      let authContext: ReturnType<typeof useAuth> | null = null
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      // Call bypassAuth
      authContext?.bypassAuth()

      // Wait for any potential state updates
      await waitFor(() => {
        // User should still be null (not authenticated)
        expect(authContext?.user).toBeNull()
      })

      // Should remain unauthenticated
      expect(authContext?.isAuthenticated).toBe(false)
      expect(authContext?.isBypassMode).toBe(false)

      // Should log warning
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Authentication bypass is disabled. Set VITE_ENABLE_AUTH_BYPASS=true in .env to enable for development.'
      )

      // sessionStorage should not be set
      expect(sessionStorage.getItem('auth_bypass')).toBeNull()

      consoleWarnSpy.mockRestore()
    })

    it('should ignore sessionStorage bypass key when bypass is disabled', async () => {
      // Simulate a scenario where bypass was previously enabled and sessionStorage still has the key
      sessionStorage.setItem('auth_bypass', 'true')
      sessionStorage.setItem('workhub_user', JSON.stringify({
        email: 'demo@santabrisa.com',
        name: 'Usuario Demo',
        roles: ['Sales Manager', 'Viewer']
      }))

      let authContext: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      // Should not authenticate using bypass even though sessionStorage key exists
      expect(authContext?.user).toBeNull()
      expect(authContext?.isAuthenticated).toBe(false)
      expect(authContext?.isBypassMode).toBe(false)
    })

    it('should not set bypass mode state when bypass sessionStorage exists but feature is disabled', async () => {
      // Pre-populate sessionStorage with bypass key (simulating old dev session)
      sessionStorage.setItem('auth_bypass', 'true')

      let authContext: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      // Verify bypass mode is NOT active despite sessionStorage key
      expect(authContext?.isBypassMode).toBe(false)
      expect(authContext?.user).toBeNull()
    })
  })

  describe('Bypass Enabled (Development Mode)', () => {
    beforeEach(() => {
      // Simulate development environment - bypass enabled
      import.meta.env.VITE_ENABLE_AUTH_BYPASS = 'true'
    })

    it('should expose isBypassEnabled as true when VITE_ENABLE_AUTH_BYPASS is true', async () => {
      let authContext: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      expect(authContext?.isBypassEnabled).toBe(true)
    })

    it('should authenticate with demo user when bypassAuth() is called', async () => {
      let authContext: ReturnType<typeof useAuth> | null = null
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      // Initially not authenticated
      expect(authContext?.isAuthenticated).toBe(false)

      // Call bypassAuth
      authContext?.bypassAuth()

      // Wait for state updates
      await waitFor(() => {
        expect(authContext?.user).not.toBeNull()
      })

      // Should be authenticated with demo user
      expect(authContext?.isAuthenticated).toBe(true)
      expect(authContext?.isBypassMode).toBe(true)
      expect(authContext?.user).toEqual({
        email: 'demo@santabrisa.com',
        name: 'Usuario Demo',
        avatarUrl: undefined,
        roles: ['Sales Manager', 'Viewer']
      })

      // sessionStorage should be set
      expect(sessionStorage.getItem('auth_bypass')).toBe('true')

      // Should NOT log warning when enabled
      expect(consoleWarnSpy).not.toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('should respect sessionStorage bypass key when bypass is enabled', async () => {
      // Pre-populate sessionStorage with bypass key
      sessionStorage.setItem('auth_bypass', 'true')

      let authContext: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      // Should authenticate using bypass from sessionStorage
      await waitFor(() => {
        expect(authContext?.user).not.toBeNull()
      })

      expect(authContext?.isAuthenticated).toBe(true)
      expect(authContext?.isBypassMode).toBe(true)
      expect(authContext?.user?.email).toBe('demo@santabrisa.com')
    })

    it('should clear bypass mode state on logout', async () => {
      // Pre-populate sessionStorage with bypass key
      sessionStorage.setItem('auth_bypass', 'true')

      let authContext: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      // Wait for bypass authentication
      await waitFor(() => {
        expect(authContext?.user).not.toBeNull()
      })

      expect(authContext?.isBypassMode).toBe(true)

      // Logout
      await authContext?.logout()

      // Wait for logout to complete
      await waitFor(() => {
        expect(authContext?.user).toBeNull()
      })

      // Verify bypass state is cleared
      expect(authContext?.isBypassMode).toBe(false)
      expect(sessionStorage.getItem('auth_bypass')).toBeNull()
    })
  })

  describe('Environment Variable Edge Cases', () => {
    it('should default to disabled when VITE_ENABLE_AUTH_BYPASS is undefined', async () => {
      // @ts-expect-error - Testing undefined environment variable
      delete import.meta.env.VITE_ENABLE_AUTH_BYPASS

      let authContext: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      // Should default to disabled
      expect(authContext?.isBypassEnabled).toBe(false)
    })

    it('should be disabled when VITE_ENABLE_AUTH_BYPASS is empty string', async () => {
      import.meta.env.VITE_ENABLE_AUTH_BYPASS = ''

      let authContext: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      expect(authContext?.isBypassEnabled).toBe(false)
    })

    it('should only enable when VITE_ENABLE_AUTH_BYPASS is exactly "true"', async () => {
      // Test various truthy-looking values that should NOT enable bypass
      const falsyValues = ['TRUE', 'True', '1', 'yes', 'enabled', 'on']

      for (const value of falsyValues) {
        import.meta.env.VITE_ENABLE_AUTH_BYPASS = value

        let authContext: ReturnType<typeof useAuth> | null = null

        const { unmount } = render(
          <AuthProvider>
            <TestComponent onRender={(auth) => { authContext = auth }} />
          </AuthProvider>
        )

        await waitFor(() => {
          expect(authContext).not.toBeNull()
        })

        // Should be disabled for any value other than 'true'
        expect(authContext?.isBypassEnabled).toBe(false)

        unmount()
        sessionStorage.clear()
      }
    })
  })

  describe('Security - Preventing Unauthorized Access', () => {
    beforeEach(() => {
      // Simulate production (bypass disabled)
      import.meta.env.VITE_ENABLE_AUTH_BYPASS = 'false'
    })

    it('should not allow authentication through any bypass method when disabled', async () => {
      let authContext: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      // Try to bypass through direct call
      authContext?.bypassAuth()

      // Try to bypass through sessionStorage
      sessionStorage.setItem('auth_bypass', 'true')
      sessionStorage.setItem('workhub_user', JSON.stringify({
        email: 'demo@santabrisa.com',
        name: 'Usuario Demo'
      }))

      // Wait for any potential state updates
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should remain unauthenticated
      expect(authContext?.isAuthenticated).toBe(false)
      expect(authContext?.user).toBeNull()
      expect(authContext?.isBypassMode).toBe(false)
    })

    it('should maintain security even if sessionStorage is manipulated after mount', async () => {
      let authContext: ReturnType<typeof useAuth> | null = null

      render(
        <AuthProvider>
          <TestComponent onRender={(auth) => { authContext = auth }} />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(authContext).not.toBeNull()
      })

      // Initially unauthenticated
      expect(authContext?.isAuthenticated).toBe(false)

      // Attacker tries to set bypass sessionStorage directly
      sessionStorage.setItem('auth_bypass', 'true')
      sessionStorage.setItem('workhub_user', JSON.stringify({
        email: 'attacker@example.com',
        name: 'Attacker'
      }))

      // Call bypassAuth to try to trigger the bypass
      authContext?.bypassAuth()

      // Wait for any state updates
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should still be unauthenticated - bypass function should do nothing
      expect(authContext?.isAuthenticated).toBe(false)
      expect(authContext?.user).toBeNull()
      expect(authContext?.isBypassMode).toBe(false)
    })
  })
})
