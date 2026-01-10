// Roles Page - View system roles
import { Shield, Users } from 'lucide-react'
import { useRoles } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

export function RolesPage() {
  const { data: roles, loading, error, refetch } = useRoles()

  if (loading) {
    return <LoadingState message="Cargando roles..." />
  }

  if (error) {
    return (
      <ErrorState
        title="Error al cargar roles"
        message="No se pudieron cargar los roles del sistema."
        error={error}
        onRetry={refetch}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-stone-900">Roles del Sistema</h2>
        <p className="text-sm text-stone-500 mt-1">
          Los roles definen los permisos de los usuarios en WorkHub
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-800">
          <strong>Nota:</strong> Los roles son administrados por Frappe/ERPNext.
          Para crear nuevos roles o modificar permisos, accede al panel de administracion de Frappe.
        </p>
      </div>

      <div className="grid gap-4">
        {roles?.map((role) => (
          <div
            key={role.name}
            className="flex items-start gap-4 p-4 border border-stone-200 rounded-xl hover:bg-stone-50 transition-colors"
          >
            <div className="p-3 bg-stone-100 rounded-lg">
              <Shield size={24} className="text-stone-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-stone-900">{role.name}</h3>
              {role.description && (
                <p className="text-sm text-stone-500 mt-1">{role.description}</p>
              )}
              {role.user_count !== undefined && (
                <div className="flex items-center gap-1 mt-2 text-xs text-stone-400">
                  <Users size={14} />
                  <span>{role.user_count} usuarios</span>
                </div>
              )}
            </div>
            <div>
              <span className={`
                px-2 py-1 text-xs rounded-full
                ${role.disabled
                  ? 'bg-stone-100 text-stone-500'
                  : 'bg-green-100 text-green-700'
                }
              `}>
                {role.disabled ? 'Inactivo' : 'Activo'}
              </span>
            </div>
          </div>
        ))}

        {(!roles || roles.length === 0) && (
          <div className="text-center py-8 text-stone-500">
            No se encontraron roles
          </div>
        )}
      </div>

      {/* Common roles explanation */}
      <div className="mt-6 pt-6 border-t border-stone-200">
        <h3 className="font-medium text-stone-900 mb-4">Roles Comunes</h3>
        <div className="grid gap-3 text-sm">
          <div className="flex gap-3">
            <span className="font-medium text-stone-700 w-40">System Manager</span>
            <span className="text-stone-500">Acceso completo a todas las funciones del sistema</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-stone-700 w-40">HR Manager</span>
            <span className="text-stone-500">Gestion de usuarios y empleados</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-stone-700 w-40">Sales Manager</span>
            <span className="text-stone-500">Acceso al modulo de ventas</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-stone-700 w-40">Marketing Manager</span>
            <span className="text-stone-500">Acceso al modulo de marketing</span>
          </div>
          <div className="flex gap-3">
            <span className="font-medium text-stone-700 w-40">Operations Manager</span>
            <span className="text-stone-500">Acceso al modulo de operaciones</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RolesPage
