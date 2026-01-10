// Users Page - List users with search and pagination
import { Link } from 'react-router-dom'
import { Search, Plus, ChevronLeft, ChevronRight, User } from 'lucide-react'
import { useUsers } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

export function UsersPage() {
  const { data, loading, error, refetch, search, setSearch, page, setPage, limit } = useUsers(20)

  if (loading && !data) {
    return <LoadingState message="Cargando usuarios..." />
  }

  if (error) {
    return (
      <ErrorState
        title="Error al cargar usuarios"
        message="No se pudo cargar la lista de usuarios."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const users = data?.users || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-stone-900">Usuarios</h2>
        <Link
          to="/admin/users/new"
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
        >
          <Plus size={18} />
          Nuevo usuario
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
        />
      </div>

      {/* Users List */}
      <div className="border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-stone-50 border-b border-stone-200">
            <tr>
              <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Usuario</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Roles</th>
              <th className="text-left px-4 py-3 text-sm font-medium text-stone-600">Estado</th>
              <th className="text-right px-4 py-3 text-sm font-medium text-stone-600">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-500">
                  No se encontraron usuarios
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.name} className="border-b border-stone-100 hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
                        {user.user_image ? (
                          <img src={user.user_image} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <User size={20} className="text-stone-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-stone-900">{user.full_name || 'Sin nombre'}</div>
                        <div className="text-sm text-stone-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.slice(0, 2).map((role) => (
                        <span
                          key={role}
                          className="px-2 py-0.5 text-xs bg-stone-100 text-stone-600 rounded-full"
                        >
                          {role}
                        </span>
                      ))}
                      {user.roles.length > 2 && (
                        <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-600 rounded-full">
                          +{user.roles.length - 2}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`
                      px-2 py-0.5 text-xs rounded-full
                      ${user.enabled
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                      }
                    `}>
                      {user.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/admin/users/${encodeURIComponent(user.name)}`}
                      className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                    >
                      Ver detalles
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-stone-500">
            Mostrando {users.length} de {total} usuarios
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm text-stone-600">
              Pagina {page} de {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-stone-200 hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsersPage
