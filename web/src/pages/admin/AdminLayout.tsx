// Admin Layout with sidebar navigation
import { NavLink, Outlet } from 'react-router-dom'
import { Users, Shield, Mail, ArrowLeft } from 'lucide-react'

const navItems = [
  { path: '/admin/users', label: 'Usuarios', icon: Users },
  { path: '/admin/roles', label: 'Roles', icon: Shield },
  { path: '/admin/invitations', label: 'Invitaciones', icon: Mail },
]

export function AdminLayout() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <a
          href="/"
          className="inline-flex items-center gap-2 text-stone-500 hover:text-stone-700 transition-colors mb-4"
        >
          <ArrowLeft size={16} />
          <span className="text-sm">Volver al dashboard</span>
        </a>
        <h1 className="text-2xl font-semibold text-stone-900">Administracion</h1>
        <p className="text-stone-500 mt-1">Gestiona usuarios, roles e invitaciones</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <nav className="w-48 flex-shrink-0">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors
                    ${isActive
                      ? 'bg-amber-50 text-amber-700'
                      : 'text-stone-600 hover:bg-stone-50 hover:text-stone-900'
                    }
                  `}
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <div className="flex-1 bg-white rounded-xl border border-stone-200 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
