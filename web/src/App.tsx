import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom'
import { AppShell } from './components/shell/AppShell'
import type { NavigationSection } from './components/shell/types'
import { AuthProvider, useAuth, LoginPage, ProtectedRoute, RoleGuard } from './auth'
import { LoadingState } from './components/ui/LoadingState'
import { ErrorBoundary } from './components/ErrorBoundary'
import { GlobalActions } from './components/GlobalActions'

// Lazy-loaded Page Components (code splitting)
const CommandCenterPage = lazy(() => import('./pages/CommandCenterPage').then(m => ({ default: m.CommandCenterPage })))
const SellInDashboardPage = lazy(() => import('./pages/SellInDashboardPage').then(m => ({ default: m.SellInDashboardPage })))
const PipelinePage = lazy(() => import('./pages/PipelinePage').then(m => ({ default: m.PipelinePage })))
const CustomerListPage = lazy(() => import('./pages/CustomerListPage').then(m => ({ default: m.CustomerListPage })))
const OrderListPage = lazy(() => import('./pages/OrderListPage').then(m => ({ default: m.OrderListPage })))
const DistributorDashboardPage = lazy(() => import('./pages/DistributorDashboardPage').then(m => ({ default: m.DistributorDashboardPage })))
const DistributorPortalPage = lazy(() => import('./pages/DistributorPortalPage').then(m => ({ default: m.DistributorPortalPage })))
const ProductionDashboardPage = lazy(() => import('./pages/ProductionDashboardPage').then(m => ({ default: m.ProductionDashboardPage })))
const LotManagementPage = lazy(() => import('./pages/LotManagementPage').then(m => ({ default: m.LotManagementPage })))
const HACCPMonitorPage = lazy(() => import('./pages/HACCPMonitorPage').then(m => ({ default: m.HACCPMonitorPage })))
const DocumentLibraryPage = lazy(() => import('./pages/DocumentLibraryPage').then(m => ({ default: m.DocumentLibraryPage })))
const QualityDashboardPage = lazy(() => import('./pages/QualityDashboardPage').then(m => ({ default: m.QualityDashboardPage })))
const MarketingDashboardPage = lazy(() => import('./pages/MarketingDashboardPage').then(m => ({ default: m.MarketingDashboardPage })))

// Task Management (lazy-loaded)
const MyDayPage = lazy(() => import('./pages/tasks/MyDayPage').then(m => ({ default: m.MyDayPage })))
const ProjectsPage = lazy(() => import('./pages/tasks/ProjectsPage').then(m => ({ default: m.ProjectsPage })))
const NewProjectPage = lazy(() => import('./pages/tasks/NewProjectPage').then(m => ({ default: m.NewProjectPage })))
const KanbanPage = lazy(() => import('./pages/tasks/KanbanPage').then(m => ({ default: m.KanbanPage })))
const TaskDashboardPage = lazy(() => import('./pages/tasks/DashboardPage').then(m => ({ default: m.DashboardPage })))

// Settings & Admin (lazy-loaded)
const SettingsPage = lazy(() => import('./pages/settings').then(m => ({ default: m.SettingsPage })))
const AdminLayout = lazy(() => import('./pages/admin').then(m => ({ default: m.AdminLayout })))
const UsersPage = lazy(() => import('./pages/admin/UsersPage').then(m => ({ default: m.UsersPage })))
const UserDetailPage = lazy(() => import('./pages/admin/UserDetailPage').then(m => ({ default: m.UserDetailPage })))
const CreateUserPage = lazy(() => import('./pages/admin/CreateUserPage').then(m => ({ default: m.CreateUserPage })))
const RolesPage = lazy(() => import('./pages/admin/RolesPage').then(m => ({ default: m.RolesPage })))
const InvitationsPage = lazy(() => import('./pages/admin/InvitationsPage').then(m => ({ default: m.InvitationsPage })))

// Icons
import {
  TrendingUp,
  Users,
  Factory,
  Shield,
  BarChart3,
  LayoutDashboard,
  CheckSquare
} from 'lucide-react'

const navigationSections: NavigationSection[] = [
  {
    label: 'Command Center',
    icon: <LayoutDashboard size={18} />,
    href: '/',
    isActive: true
  },
  {
    label: 'Tareas',
    icon: <CheckSquare size={18} />,
    items: [
      { label: 'Mi Día', href: '/tareas' },
      { label: 'Proyectos', href: '/tareas/proyectos' },
      { label: 'Kanban', href: '/tareas/kanban' },
      { label: 'Dashboard', href: '/tareas/dashboard' }
    ]
  },
  {
    label: 'SELL IN',
    icon: <TrendingUp size={18} />,
    items: [
      { label: 'Dashboard', href: '/ventas' },
      { label: 'Pipeline', href: '/ventas/pipeline' },
      { label: 'Clientes', href: '/ventas/clientes' },
      { label: 'Pedidos', href: '/ventas/pedidos' }
    ]
  },
  {
    label: 'Distribuidores',
    icon: <Users size={18} />,
    items: [
      { label: 'Red', href: '/distribuidores' },
      { label: 'Portal', href: '/distribuidores/portal' }
    ]
  },
  {
    label: 'Produccion',
    icon: <Factory size={18} />,
    items: [
      { label: 'Dashboard', href: '/produccion' },
      { label: 'Lotes', href: '/produccion/lotes' },
      { label: 'HACCP', href: '/produccion/haccp' },
      { label: 'Documentos', href: '/produccion/documentos' }
    ]
  },
  {
    label: 'Calidad',
    icon: <Shield size={18} />,
    items: [
      { label: 'Dashboard', href: '/calidad' }
    ]
  },
  {
    label: 'Marketing',
    icon: <BarChart3 size={18} />,
    items: [
      { label: 'Dashboard', href: '/marketing' }
    ]
  }
]

function AppContent() {
  const navigate = useNavigate()
  const { user, logout, loading } = useAuth()

  const handleNavigate = (href: string) => {
    navigate(href)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Show loading while checking auth
  if (loading) {
    return <LoadingState fullPage message="Verificando sesion..." />
  }

  // User must be authenticated at this point (ProtectedRoute handles redirect)
  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <AppShell
      navigationSections={navigationSections}
      user={user}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
    >
      <ErrorBoundary>
        <Suspense fallback={<LoadingState message="Cargando página..." />}>
          <Routes>
            {/* Command Center */}
            <Route path="/" element={<CommandCenterPage />} />

            {/* Tareas */}
            <Route path="/tareas" element={<MyDayPage />} />
            <Route path="/tareas/proyectos" element={<ProjectsPage />} />
            <Route path="/tareas/proyectos/nuevo" element={<NewProjectPage />} />
            <Route path="/tareas/kanban" element={<KanbanPage />} />
            <Route path="/tareas/dashboard" element={
              <RoleGuard roles={['System Manager', 'Sales Manager']}>
                <TaskDashboardPage />
              </RoleGuard>
            } />

            {/* SELL IN */}
            <Route path="/ventas" element={<SellInDashboardPage />} />
            <Route path="/ventas/pipeline" element={<PipelinePage />} />
            <Route path="/ventas/clientes" element={<CustomerListPage />} />
            <Route path="/ventas/pedidos" element={<OrderListPage />} />

            {/* Distribuidores */}
            <Route path="/distribuidores" element={<DistributorDashboardPage />} />
            <Route path="/distribuidores/portal" element={<DistributorPortalPage />} />

            {/* Produccion */}
            <Route path="/produccion" element={<ProductionDashboardPage />} />
            <Route path="/produccion/lotes" element={<LotManagementPage />} />
            <Route path="/produccion/haccp" element={<HACCPMonitorPage />} />
            <Route path="/produccion/documentos" element={<DocumentLibraryPage />} />

            {/* Calidad */}
            <Route path="/calidad" element={<QualityDashboardPage />} />

            {/* Marketing */}
            <Route path="/marketing" element={<MarketingDashboardPage />} />

            {/* Settings */}
            <Route path="/settings" element={<SettingsPage />} />

            {/* Admin (role-protected) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRoles={['System Manager', 'HR Manager']}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/users" replace />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="users/new" element={<CreateUserPage />} />
              <Route path="users/:userId" element={<UserDetailPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="invitations" element={<InvitationsPage />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>

      {/* Global Actions (Smart Notepad + Quick Task) - available on all pages */}
      <GlobalActions />
    </AppShell>
  )
}

// Main App with authentication wrapper
function AppWithAuth() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppContent />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppWithAuth />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
