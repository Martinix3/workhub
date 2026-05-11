// Departments Tab - Enable/disable department access
import { useState, useEffect } from 'react'
import { Building2, Save, Loader2, Lock } from 'lucide-react'
import { useUserSettings, useDepartments } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

export function DepartmentsTab() {
  const { data: settings, loading: settingsLoading, error: settingsError, refetch: refetchSettings, updateSettings, updating } = useUserSettings()
  const { data: departments, loading: depsLoading, error: depsError, refetch: refetchDeps } = useDepartments()
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const loading = settingsLoading || depsLoading
  const error = settingsError || depsError

  // Initialize from settings
  useEffect(() => {
    if (settings?.department_access) {
      setSelectedDepartments(settings.department_access)
    }
  }, [settings])

  if (loading) {
    return <LoadingState message="Cargando departamentos..." />
  }

  if (error || !settings || !departments) {
    return (
      <ErrorState
        title="Error al cargar departamentos"
        message="No se pudieron cargar los departamentos disponibles."
        error={error}
        onRetry={() => {
          refetchSettings()
          refetchDeps()
        }}
      />
    )
  }

  const handleToggle = (deptCode: string) => {
    const dept = departments.find(d => d.code === deptCode)
    if (!dept?.enabled) return // Can't toggle disabled departments

    const updated = selectedDepartments.includes(deptCode)
      ? selectedDepartments.filter(d => d !== deptCode)
      : [...selectedDepartments, deptCode]

    setSelectedDepartments(updated)
    setHasChanges(
      JSON.stringify(updated.sort()) !== JSON.stringify([...settings.department_access].sort())
    )
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    try {
      await updateSettings({ department_access: selectedDepartments })
      setHasChanges(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Error handled by hook
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-neutral-900 mb-1">Departamentos</h3>
        <p className="text-sm text-neutral-500 mb-6">
          Selecciona los departamentos que quieres ver en tu dashboard.
          Solo puedes acceder a departamentos asignados a tu rol.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {departments.map((dept) => {
            const isSelected = selectedDepartments.includes(dept.code)
            const isDisabled = !dept.enabled

            return (
              <button
                key={dept.code}
                onClick={() => handleToggle(dept.code)}
                disabled={isDisabled}
                className={`
                  flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                  ${isDisabled
                    ? 'border-neutral-200 bg-neutral-50 cursor-not-allowed opacity-60'
                    : isSelected
                      ? 'border-gold-dark bg-gold-light'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }
                `}
              >
                <div className={`
                  p-3 rounded-lg
                  ${isSelected ? 'bg-gold-light' : 'bg-neutral-100'}
                `}>
                  <Building2
                    size={24}
                    className={isSelected ? 'text-gold-dark' : 'text-neutral-500'}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${isSelected ? 'text-gold-dark' : 'text-neutral-900'}`}>
                      {dept.name}
                    </span>
                    {isDisabled && (
                      <Lock size={14} className="text-neutral-400" />
                    )}
                  </div>
                  <p className="text-sm text-neutral-500">{dept.description}</p>
                </div>
                {!isDisabled && (
                  <div className="relative">
                    <div className={`
                      w-5 h-5 rounded border-2 flex items-center justify-center
                      ${isSelected
                        ? 'border-gold-dark bg-gold-dark'
                        : 'border-neutral-300'
                      }
                    `}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {departments.some(d => !d.enabled) && (
          <p className="text-sm text-neutral-400 mt-4 flex items-center gap-2">
            <Lock size={14} />
            Los departamentos bloqueados requieren permisos adicionales.
            Contacta a tu administrador para solicitar acceso.
          </p>
        )}
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4 border-t border-neutral-200">
        <button
          onClick={handleSave}
          disabled={!hasChanges || updating}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
            ${hasChanges
              ? 'bg-gold-dark text-white hover:bg-gold-dark'
              : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
            }
          `}
        >
          {updating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Guardar cambios
        </button>
        {saveSuccess && (
          <span className="text-sm text-success-dark">Departamentos actualizados</span>
        )}
      </div>
    </div>
  )
}
