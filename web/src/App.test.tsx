import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import App from './App'
import type { AuthUser } from './auth'

/**
 * Mock the frappe client to avoid network calls
 */
vi.mock('./api/frappe-client', () => ({
  default: {
    isAuthenticated: () => false,
    getUserInfo: vi.fn(),
    call: vi.fn(),
    clearAuthToken: vi.fn(),
    setAuthToken: vi.fn(),
    logout: vi.fn(),
  }
}))

/**
 * Mock page components to simplify testing - we only care about navigation state
 */
vi.mock('./pages/CommandCenterPage', () => ({
  CommandCenterPage: () => <div data-testid="command-center-page">Command Center</div>
}))

vi.mock('./pages/SellInDashboardPage', () => ({
  SellInDashboardPage: () => <div data-testid="sell-in-dashboard-page">SELL IN Dashboard</div>
}))

vi.mock('./pages/PipelinePage', () => ({
  PipelinePage: () => <div data-testid="pipeline-page">Pipeline</div>
}))

vi.mock('./pages/CustomerListPage', () => ({
  CustomerListPage: () => <div data-testid="customer-list-page">Customers</div>
}))

vi.mock('./pages/OrderListPage', () => ({
  OrderListPage: () => <div data-testid="order-list-page">Orders</div>
}))

vi.mock('./pages/DistributorDashboardPage', () => ({
  DistributorDashboardPage: () => <div data-testid="distributor-dashboard-page">Distributors</div>
}))

vi.mock('./pages/DistributorPortalPage', () => ({
  DistributorPortalPage: () => <div data-testid="distributor-portal-page">Distributor Portal</div>
}))

vi.mock('./pages/ProductionDashboardPage', () => ({
  ProductionDashboardPage: () => <div data-testid="production-dashboard-page">Production</div>
}))

vi.mock('./pages/LotManagementPage', () => ({
  LotManagementPage: () => <div data-testid="lot-management-page">Lots</div>
}))

vi.mock('./pages/HACCPMonitorPage', () => ({
  HACCPMonitorPage: () => <div data-testid="haccp-monitor-page">HACCP</div>
}))

vi.mock('./pages/DocumentLibraryPage', () => ({
  DocumentLibraryPage: () => <div data-testid="document-library-page">Documents</div>
}))

vi.mock('./pages/QualityDashboardPage', () => ({
  QualityDashboardPage: () => <div data-testid="quality-dashboard-page">Quality</div>
}))

vi.mock('./pages/MarketingDashboardPage', () => ({
  MarketingDashboardPage: () => <div data-testid="marketing-dashboard-page">Marketing</div>
}))

vi.mock('./pages/tasks/MyDayPage', () => ({
  MyDayPage: () => <div data-testid="my-day-page">My Day</div>
}))

vi.mock('./pages/tasks/ProjectsPage', () => ({
  ProjectsPage: () => <div data-testid="projects-page">Projects</div>
}))

vi.mock('./pages/tasks/NewProjectPage', () => ({
  NewProjectPage: () => <div data-testid="new-project-page">New Project</div>
}))

vi.mock('./pages/tasks/KanbanPage', () => ({
  KanbanPage: () => <div data-testid="kanban-page">Kanban</div>
}))

vi.mock('./pages/tasks/DashboardPage', () => ({
  DashboardPage: () => <div data-testid="task-dashboard-page">Task Dashboard</div>
}))

vi.mock('./pages/settings', () => ({
  SettingsPage: () => <div data-testid="settings-page">Settings</div>
}))

vi.mock('./pages/admin', () => ({
  default: () => <div data-testid="admin-layout">Admin</div>
}))

/**
 * Mock the SmartNotepadFAB to avoid complexity
 */
vi.mock('./components/smart-notepad', () => ({
  SmartNotepadFAB: () => null
}))

/**
 * Test user
 */
const TEST_USER: AuthUser = {
  email: 'test@example.com',
  name: 'Test User',
  roles: ['Sales Manager']
}

/**
 * Helper to get navigation item by label
 * This searches through the rendered navigation for a specific item
 */
function getNavigationItem(label: string): HTMLElement | null {
  try {
    return screen.getByRole('button', { name: new RegExp(label, 'i') })
  } catch {
    return null
  }
}

/**
 * Helper to check if navigation item has active class
 * Active items should have yellow background styling
 */
function isNavigationItemActive(element: HTMLElement | null): boolean {
  if (!element) return false
  // Check for active styling - the MainNav component uses yellow bg for active items
  // We check both the element itself and its parent for the active class
  const hasActiveBg = element.classList.contains('bg-yellow-400') ||
                      element.classList.contains('bg-yellow-500') ||
                      element.parentElement?.classList.contains('bg-yellow-400') ||
                      element.parentElement?.classList.contains('bg-yellow-500')
  return hasActiveBg
}

/**
 * Wrapper component that provides routing context
 */
function TestWrapper({ children, initialPath = '/' }: { children: ReactNode; initialPath?: string }) {
  return (
    <MemoryRouter initialEntries={[initialPath]}>
      {children}
    </MemoryRouter>
  )
}

describe('App Navigation Active State Integration Tests', () => {
  beforeEach(() => {
    // Clear storage before each test
    sessionStorage.clear()
    // Set bypass mode
    sessionStorage.setItem('auth_bypass', 'true')
    sessionStorage.setItem('workhub_user', JSON.stringify(TEST_USER))
  })

  describe('Command Center route (/)', () => {
    it('should mark Command Center as active on / route', async () => {
      render(
        <TestWrapper initialPath="/">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('command-center-page')).toBeInTheDocument()
      })

      // Command Center should be active
      const commandCenter = getNavigationItem('Command Center')
      expect(commandCenter).toBeTruthy()
      expect(isNavigationItemActive(commandCenter)).toBe(true)
    })

    it('should NOT mark Command Center as active on nested routes', async () => {
      render(
        <TestWrapper initialPath="/ventas">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('sell-in-dashboard-page')).toBeInTheDocument()
      })

      // Command Center should NOT be active
      const commandCenter = getNavigationItem('Command Center')
      expect(commandCenter).toBeTruthy()
      expect(isNavigationItemActive(commandCenter)).toBe(false)
    })
  })

  describe('SELL IN section routes', () => {
    it('should mark SELL IN section and Dashboard item as active on /ventas', async () => {
      render(
        <TestWrapper initialPath="/ventas">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('sell-in-dashboard-page')).toBeInTheDocument()
      })

      // SELL IN section should be active
      const sellInSection = getNavigationItem('SELL IN')
      expect(sellInSection).toBeTruthy()
      expect(isNavigationItemActive(sellInSection)).toBe(true)

      // Dashboard item should be active (when section is expanded)
      const dashboardItem = getNavigationItem('Dashboard')
      if (dashboardItem) {
        expect(isNavigationItemActive(dashboardItem)).toBe(true)
      }
    })

    it('should mark SELL IN section and Pipeline item as active on /ventas/pipeline', async () => {
      render(
        <TestWrapper initialPath="/ventas/pipeline">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('pipeline-page')).toBeInTheDocument()
      })

      // SELL IN section should be active
      const sellInSection = getNavigationItem('SELL IN')
      expect(sellInSection).toBeTruthy()
      expect(isNavigationItemActive(sellInSection)).toBe(true)

      // Pipeline item should be active (when section is expanded)
      const pipelineItem = getNavigationItem('Pipeline')
      if (pipelineItem) {
        expect(isNavigationItemActive(pipelineItem)).toBe(true)
      }
    })

    it('should mark SELL IN section and Clientes item as active on /ventas/clientes', async () => {
      render(
        <TestWrapper initialPath="/ventas/clientes">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('customer-list-page')).toBeInTheDocument()
      })

      // SELL IN section should be active
      const sellInSection = getNavigationItem('SELL IN')
      expect(sellInSection).toBeTruthy()
      expect(isNavigationItemActive(sellInSection)).toBe(true)

      // Clientes item should be active (when section is expanded)
      const clientesItem = getNavigationItem('Clientes')
      if (clientesItem) {
        expect(isNavigationItemActive(clientesItem)).toBe(true)
      }
    })

    it('should mark SELL IN section and Pedidos item as active on /ventas/pedidos', async () => {
      render(
        <TestWrapper initialPath="/ventas/pedidos">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('order-list-page')).toBeInTheDocument()
      })

      // SELL IN section should be active
      const sellInSection = getNavigationItem('SELL IN')
      expect(sellInSection).toBeTruthy()
      expect(isNavigationItemActive(sellInSection)).toBe(true)

      // Pedidos item should be active (when section is expanded)
      const pedidosItem = getNavigationItem('Pedidos')
      if (pedidosItem) {
        expect(isNavigationItemActive(pedidosItem)).toBe(true)
      }
    })
  })

  describe('Other sections', () => {
    it('should mark Tareas section as active on /tareas routes', async () => {
      render(
        <TestWrapper initialPath="/tareas">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('my-day-page')).toBeInTheDocument()
      })

      // Tareas section should be active
      const tareasSection = getNavigationItem('Tareas')
      expect(tareasSection).toBeTruthy()
      expect(isNavigationItemActive(tareasSection)).toBe(true)
    })

    it('should mark Distribuidores section as active on /distribuidores routes', async () => {
      render(
        <TestWrapper initialPath="/distribuidores">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('distributor-dashboard-page')).toBeInTheDocument()
      })

      // Distribuidores section should be active
      const distribuidoresSection = getNavigationItem('Distribuidores')
      expect(distribuidoresSection).toBeTruthy()
      expect(isNavigationItemActive(distribuidoresSection)).toBe(true)
    })

    it('should mark Produccion section as active on /produccion routes', async () => {
      render(
        <TestWrapper initialPath="/produccion">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('production-dashboard-page')).toBeInTheDocument()
      })

      // Produccion section should be active
      const produccionSection = getNavigationItem('Produccion')
      expect(produccionSection).toBeTruthy()
      expect(isNavigationItemActive(produccionSection)).toBe(true)
    })

    it('should mark Calidad section as active on /calidad route', async () => {
      render(
        <TestWrapper initialPath="/calidad">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('quality-dashboard-page')).toBeInTheDocument()
      })

      // Calidad section should be active
      const calidadSection = getNavigationItem('Calidad')
      expect(calidadSection).toBeTruthy()
      expect(isNavigationItemActive(calidadSection)).toBe(true)
    })

    it('should mark Marketing section as active on /marketing route', async () => {
      render(
        <TestWrapper initialPath="/marketing">
          <App />
        </TestWrapper>
      )

      // Wait for app to render
      await waitFor(() => {
        expect(screen.getByTestId('marketing-dashboard-page')).toBeInTheDocument()
      })

      // Marketing section should be active
      const marketingSection = getNavigationItem('Marketing')
      expect(marketingSection).toBeTruthy()
      expect(isNavigationItemActive(marketingSection)).toBe(true)
    })
  })

  describe('Navigation state updates on route change', () => {
    it('should update active state when navigating from / to /ventas', async () => {
      const { rerender } = render(
        <TestWrapper initialPath="/">
          <App />
        </TestWrapper>
      )

      // Initially on Command Center
      await waitFor(() => {
        expect(screen.getByTestId('command-center-page')).toBeInTheDocument()
      })

      let commandCenter = getNavigationItem('Command Center')
      expect(isNavigationItemActive(commandCenter)).toBe(true)

      // Navigate to /ventas
      rerender(
        <TestWrapper initialPath="/ventas">
          <App />
        </TestWrapper>
      )

      // Wait for navigation to complete
      await waitFor(() => {
        expect(screen.getByTestId('sell-in-dashboard-page')).toBeInTheDocument()
      })

      // Command Center should no longer be active
      commandCenter = getNavigationItem('Command Center')
      expect(isNavigationItemActive(commandCenter)).toBe(false)

      // SELL IN section should now be active
      const sellInSection = getNavigationItem('SELL IN')
      expect(isNavigationItemActive(sellInSection)).toBe(true)
    })

    it('should update active state when navigating from /ventas to /ventas/pipeline', async () => {
      const { rerender } = render(
        <TestWrapper initialPath="/ventas">
          <App />
        </TestWrapper>
      )

      // Initially on SELL IN Dashboard
      await waitFor(() => {
        expect(screen.getByTestId('sell-in-dashboard-page')).toBeInTheDocument()
      })

      // SELL IN section should be active
      let sellInSection = getNavigationItem('SELL IN')
      expect(isNavigationItemActive(sellInSection)).toBe(true)

      // Navigate to /ventas/pipeline
      rerender(
        <TestWrapper initialPath="/ventas/pipeline">
          <App />
        </TestWrapper>
      )

      // Wait for navigation to complete
      await waitFor(() => {
        expect(screen.getByTestId('pipeline-page')).toBeInTheDocument()
      })

      // SELL IN section should still be active
      sellInSection = getNavigationItem('SELL IN')
      expect(isNavigationItemActive(sellInSection)).toBe(true)

      // Pipeline item should now be active
      const pipelineItem = getNavigationItem('Pipeline')
      if (pipelineItem) {
        expect(isNavigationItemActive(pipelineItem)).toBe(true)
      }
    })

    it('should update active state when navigating between different sections', async () => {
      const { rerender } = render(
        <TestWrapper initialPath="/ventas">
          <App />
        </TestWrapper>
      )

      // Initially on SELL IN
      await waitFor(() => {
        expect(screen.getByTestId('sell-in-dashboard-page')).toBeInTheDocument()
      })

      let sellInSection = getNavigationItem('SELL IN')
      expect(isNavigationItemActive(sellInSection)).toBe(true)

      // Navigate to /produccion
      rerender(
        <TestWrapper initialPath="/produccion">
          <App />
        </TestWrapper>
      )

      // Wait for navigation to complete
      await waitFor(() => {
        expect(screen.getByTestId('production-dashboard-page')).toBeInTheDocument()
      })

      // SELL IN section should no longer be active
      sellInSection = getNavigationItem('SELL IN')
      expect(isNavigationItemActive(sellInSection)).toBe(false)

      // Produccion section should now be active
      const produccionSection = getNavigationItem('Produccion')
      expect(isNavigationItemActive(produccionSection)).toBe(true)
    })
  })
})
