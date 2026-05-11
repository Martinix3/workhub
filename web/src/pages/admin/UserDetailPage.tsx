// User Detail Page - View and edit user details
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Trash2, Plus, X, Loader2, User } from 'lucide-react'
import { useUserDetail, useRoles, useUserMutations } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

export function UserDetailPage() {
  const { userId } = useParams<{ userId: string }>()
  const navigate = useNavigate()
  const { data: user, loading, error, refetch } = useUserDetail(userId || null)
  const { data: allRoles } = useRoles()
  const { updateUser, deleteUser, assignRole, removeRole, loading: mutating } = useUserMutations()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [hasChanges, setHasChanges] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  // Initialize form when user loads
  useState(() => {
    if (user) {
      setFirstName(user.first_name || '')
      setLastName(user.last_name || '')
      setEnabled(Boolean(user.enabled))
    }
  })

  if (loading) {
    return <LoadingState message="Cargando usuario..." />
  }

  if (error || !user) {
    return (
      <ErrorState
        title="Error al cargar usuario"
        message="No se pudo cargar la informacion del usuario."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const handleSave = async () => {
    try {
      await updateUser(user.name, {
        first_name: firstName,
        last_name: lastName,
        enabled: enabled ? 1 : 0
      })
      setHasChanges(false)
      refetch()
    } catch {
      // Error handled by hook
    }
  }

  const handleDelete = async () => {
    try {
      await deleteUser(user.name)
      navigate('/admin/users')
    } catch {
      // Error handled by hook
    }
  }

  const handleAddRole = async (role: string) => {
    try {
      await assignRole(user.name, role)
      setShowRoleModal(false)
      refetch()
    } catch {
      // Error handled by hook
    }
  }

  const handleRemoveRole = async (role: string) => {
    try {
      await removeRole(user.name, role)
      refetch()
    } catch {
      // Error handled by hook
    }
  }

  const availableRoles = allRoles?.filter(r => !user.roles.includes(r.name)) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2 text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Volver a usuarios</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 text-error-dark border border-error rounded-lg hover:bg-error-light transition-colors text-sm font-medium"
          >
            <Trash2 size={16} />
            Eliminar
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || mutating}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${hasChanges
                ? 'bg-gold-dark text-white hover:bg-gold-dark'
                : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              }
            `}
          >
            {mutating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Guardar
          </button>
        </div>
      </div>

      {/* User Info */}
      <div className="flex items-center gap-6 pb-6 border-b border-neutral-200">
        <div className="w-20 h-20 rounded-full bg-neutral-200 flex items-center justify-center overflow-hidden">
          {user.user_image ? (
            <img src={user.user_image} alt={user.full_name} className="w-full h-full object-cover" />
          ) : (
            <User size={32} className="text-neutral-500" />
          )}
        </div>
        <div>
          <h2 className="text-xl font-medium text-neutral-900">{user.full_name || 'Sin nombre'}</h2>
          <p className="text-neutral-500">{user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`
              px-2 py-0.5 text-xs rounded-full
              ${user.enabled ? 'bg-success-light text-success-text' : 'bg-error-light text-error-text'}
            `}>
              {user.enabled ? 'Activo' : 'Inactivo'}
            </span>
            {user.last_login && (
              <span className="text-xs text-neutral-400">
                Ultimo acceso: {new Date(user.last_login).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Nombre</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value)
              setHasChanges(true)
            }}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-dark focus:border-gold-dark transition-colors"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">Apellido</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value)
              setHasChanges(true)
            }}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-dark focus:border-gold-dark transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Email</label>
        <input
          type="email"
          value={user.email}
          disabled
          className="w-full px-3 py-2 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-500 cursor-not-allowed"
        />
      </div>

      <div>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked)
              setHasChanges(true)
            }}
            className="w-4 h-4 rounded border-neutral-300 text-gold-dark focus:ring-gold-dark"
          />
          <span className="text-sm text-neutral-700">Usuario activo</span>
        </label>
      </div>

      {/* Roles Section */}
      <div className="pt-4 border-t border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-neutral-900">Roles</h3>
          <button
            onClick={() => setShowRoleModal(true)}
            className="flex items-center gap-1 text-sm text-gold-dark hover:text-gold-dark"
          >
            <Plus size={16} />
            Agregar rol
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.roles.map((role) => (
            <div
              key={role}
              className="flex items-center gap-2 px-3 py-1.5 bg-neutral-100 rounded-full"
            >
              <span className="text-sm text-neutral-700">{role}</span>
              <button
                onClick={() => handleRemoveRole(role)}
                className="text-neutral-400 hover:text-error transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {user.roles.length === 0 && (
            <p className="text-sm text-neutral-500">Sin roles asignados</p>
          )}
        </div>
      </div>

      {/* Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-medium text-neutral-900 mb-4">Agregar Rol</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableRoles.map((role) => (
                <button
                  key={role.name}
                  onClick={() => handleAddRole(role.name)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-neutral-50 transition-colors"
                >
                  <div className="font-medium text-neutral-900">{role.name}</div>
                  {role.description && (
                    <div className="text-sm text-neutral-500">{role.description}</div>
                  )}
                </button>
              ))}
              {availableRoles.length === 0 && (
                <p className="text-center text-neutral-500 py-4">
                  No hay roles disponibles para agregar
                </p>
              )}
            </div>
            <button
              onClick={() => setShowRoleModal(false)}
              className="mt-4 w-full py-2 text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-lg font-medium text-neutral-900 mb-2">Eliminar Usuario</h3>
            <p className="text-neutral-600 mb-6">
              ¿Estas seguro de que quieres eliminar a <strong>{user.full_name}</strong>?
              Esta accion desactivara la cuenta pero no borrara los datos permanentemente.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2 border border-neutral-200 rounded-lg text-neutral-600 hover:bg-neutral-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={mutating}
                className="flex-1 py-2 bg-error text-white rounded-lg hover:bg-error-dark transition-colors flex items-center justify-center gap-2"
              >
                {mutating && <Loader2 size={16} className="animate-spin" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDetailPage
