import type { NavigationSection } from '../components/shell/types'
import {
  TrendingUp,
  Users,
  Factory,
  Shield,
  BarChart3,
  LayoutDashboard,
  CheckSquare
} from 'lucide-react'

/**
 * Base navigation sections without active states.
 * Active states are computed dynamically based on current route.
 */
export const BASE_NAVIGATION_SECTIONS: NavigationSection[] = [
  {
    label: 'Command Center',
    icon: <LayoutDashboard size={18} />,
    href: '/'
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
