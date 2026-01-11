import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LoginPage } from '../LoginPage'
import { BrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'

// Mock the useAuth hook
const mockUseAuth = vi.fn()
vi.mock('../AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Wrapper component for tests that need Router context
function TestWrapper({ children }: { children: ReactNode }) {
  return <BrowserRouter>{children}</BrowserRouter>
}

describe('LoginPage - Conditional Bypass UI Tests', () => {
  const mockLogin = vi.fn()
  const mockBypassAuth = vi.fn()
  const mockClearError = vi.fn()

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Bypass Mode Disabled (Production)', () => {
    beforeEach(() => {
      // Mock useAuth to return isBypassEnabled: false (production mode)
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: null,
        clearError: mockClearError,
        bypassAuth: mockBypassAuth,
        isBypassEnabled: false,
      })
    })

    it('should not render the bypass button when bypass is disabled', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // The bypass button should not be in the document
      const bypassButton = screen.queryByRole('button', { name: /revisar ui \(sin backend\)/i })
      expect(bypassButton).not.toBeInTheDocument()
    })

    it('should not render the divider when bypass is disabled', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // The divider with "o" should not be in the document
      const divider = screen.queryByText('o')
      expect(divider).not.toBeInTheDocument()
    })

    it('should only show the Google login button when bypass is disabled', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // Google login button should be present
      const googleButton = screen.getByRole('button', { name: /continuar con google/i })
      expect(googleButton).toBeInTheDocument()

      // Only one button should be present
      const allButtons = screen.getAllByRole('button')
      expect(allButtons).toHaveLength(1)
    })

    it('should render all other UI elements normally when bypass is disabled', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // Check that main UI elements are still present
      expect(screen.getByText('Santa Brisa')).toBeInTheDocument()
      expect(screen.getByText('WorkHub')).toBeInTheDocument()
      expect(screen.getByText('Iniciar Sesion')).toBeInTheDocument()
      expect(screen.getByText(/accede con tu cuenta de google/i)).toBeInTheDocument()
      expect(screen.getByText(/terminos de servicio/i)).toBeInTheDocument()
      expect(screen.getByText(/politica de privacidad/i)).toBeInTheDocument()
    })
  })

  describe('Bypass Mode Enabled (Development)', () => {
    beforeEach(() => {
      // Mock useAuth to return isBypassEnabled: true (development mode)
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: null,
        clearError: mockClearError,
        bypassAuth: mockBypassAuth,
        isBypassEnabled: true,
      })
    })

    it('should render the bypass button when bypass is enabled', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // The bypass button should be in the document
      const bypassButton = screen.getByRole('button', { name: /revisar ui \(sin backend\)/i })
      expect(bypassButton).toBeInTheDocument()
    })

    it('should render the divider when bypass is enabled', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // The divider with "o" should be in the document
      const divider = screen.getByText('o')
      expect(divider).toBeInTheDocument()
    })

    it('should render both Google login and bypass buttons when bypass is enabled', () => {
      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // Both buttons should be present
      const googleButton = screen.getByRole('button', { name: /continuar con google/i })
      const bypassButton = screen.getByRole('button', { name: /revisar ui \(sin backend\)/i })

      expect(googleButton).toBeInTheDocument()
      expect(bypassButton).toBeInTheDocument()

      // Should have exactly 2 buttons
      const allButtons = screen.getAllByRole('button')
      expect(allButtons).toHaveLength(2)
    })

    it('should call bypassAuth and navigate when bypass button is clicked', async () => {
      const { user } = await import('@testing-library/user-event')

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      const bypassButton = screen.getByRole('button', { name: /revisar ui \(sin backend\)/i })

      // Click the bypass button
      await user.default.click(bypassButton)

      // Should call bypassAuth
      expect(mockBypassAuth).toHaveBeenCalledTimes(1)

      // Should navigate to home
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('Error Display', () => {
    it('should display error message when present (bypass disabled)', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Authentication failed',
        clearError: mockClearError,
        bypassAuth: mockBypassAuth,
        isBypassEnabled: false,
      })

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })

    it('should display error message when present (bypass enabled)', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: 'Authentication failed',
        clearError: mockClearError,
        bypassAuth: mockBypassAuth,
        isBypassEnabled: true,
      })

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      expect(screen.getByText('Authentication failed')).toBeInTheDocument()
    })
  })

  describe('Loading State', () => {
    it('should disable Google login button when loading (bypass disabled)', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        loading: true,
        error: null,
        clearError: mockClearError,
        bypassAuth: mockBypassAuth,
        isBypassEnabled: false,
      })

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      const googleButton = screen.getByRole('button', { name: /cargando/i })
      expect(googleButton).toBeDisabled()
    })

    it('should show both buttons in loading state when bypass is enabled', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        loading: true,
        error: null,
        clearError: mockClearError,
        bypassAuth: mockBypassAuth,
        isBypassEnabled: true,
      })

      render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      const googleButton = screen.getByRole('button', { name: /cargando/i })
      const bypassButton = screen.getByRole('button', { name: /revisar ui \(sin backend\)/i })

      expect(googleButton).toBeDisabled()
      expect(bypassButton).not.toBeDisabled() // Bypass button is not affected by loading state
    })
  })

  describe('Security - UI Attack Surface', () => {
    it('should not expose any bypass-related UI elements in production mode', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: null,
        clearError: mockClearError,
        bypassAuth: mockBypassAuth,
        isBypassEnabled: false,
      })

      const { container } = render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // Check that the word "bypass" doesn't appear anywhere in the UI
      expect(container.textContent).not.toMatch(/bypass/i)

      // Check that "Revisar UI" text doesn't appear
      expect(container.textContent).not.toMatch(/revisar ui/i)

      // Check that "sin backend" text doesn't appear
      expect(container.textContent).not.toMatch(/sin backend/i)
    })

    it('should completely remove bypass button from DOM in production mode', () => {
      mockUseAuth.mockReturnValue({
        login: mockLogin,
        loading: false,
        error: null,
        clearError: mockClearError,
        bypassAuth: mockBypassAuth,
        isBypassEnabled: false,
      })

      const { container } = render(
        <TestWrapper>
          <LoginPage />
        </TestWrapper>
      )

      // Query for any button that might contain bypass-related text
      const allButtons = container.querySelectorAll('button')
      const bypassButtons = Array.from(allButtons).filter(button =>
        button.textContent?.toLowerCase().includes('revisar') ||
        button.textContent?.toLowerCase().includes('bypass') ||
        button.textContent?.toLowerCase().includes('sin backend')
      )

      expect(bypassButtons).toHaveLength(0)
    })
  })
})
