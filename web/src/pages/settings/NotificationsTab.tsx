// Notifications Tab - Email, push, and digest settings
import { useState, useEffect } from 'react'
import { Save, Loader2 } from 'lucide-react'
import { useUserSettings } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

type DigestFrequency = 'daily' | 'weekly' | 'none'

interface NotificationSettings {
  email: boolean
  push: boolean
  digest: DigestFrequency
}

export function NotificationsTab() {
  const { data: settings, loading, error, refetch, updateSettings, updating } = useUserSettings()
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    push: false,
    digest: 'daily'
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize from settings
  useEffect(() => {
    if (settings?.notifications) {
      setNotifications(settings.notifications)
    }
  }, [settings])

  if (loading) {
    return <LoadingState message="Cargando notificaciones..." />
  }

  if (error || !settings) {
    return (
      <ErrorState
        title="Error al cargar notificaciones"
        message="No se pudieron cargar las preferencias de notificaciones."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const handleChange = (field: keyof NotificationSettings, value: boolean | DigestFrequency) => {
    const updated = { ...notifications, [field]: value }
    setNotifications(updated)
    setHasChanges(
      updated.email !== settings.notifications.email ||
      updated.push !== settings.notifications.push ||
      updated.digest !== settings.notifications.digest
    )
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    try {
      await updateSettings({ notifications })
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
        <h3 className="text-lg font-medium text-stone-900 mb-1">Notificaciones</h3>
        <p className="text-sm text-stone-500 mb-6">
          Configura como quieres recibir notificaciones del sistema
        </p>

        {/* Email Notifications */}
        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
            <div>
              <span className="font-medium text-stone-900">Notificaciones por email</span>
              <p className="text-sm text-stone-500">
                Recibe alertas importantes por correo electronico
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notifications.email}
                onChange={(e) => handleChange('email', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </div>
          </label>

          {/* Push Notifications */}
          <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
            <div>
              <span className="font-medium text-stone-900">Notificaciones push</span>
              <p className="text-sm text-stone-500">
                Recibe notificaciones en tiempo real en el navegador
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notifications.push}
                onChange={(e) => handleChange('push', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Digest Frequency */}
      <div>
        <h4 className="font-medium text-stone-900 mb-3">Resumen de actividad</h4>
        <p className="text-sm text-stone-500 mb-4">
          Frecuencia del resumen de actividad por email
        </p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'daily' as const, label: 'Diario' },
            { value: 'weekly' as const, label: 'Semanal' },
            { value: 'none' as const, label: 'Nunca' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleChange('digest', option.value)}
              className={`
                p-3 rounded-xl border-2 font-medium transition-all
                ${notifications.digest === option.value
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex items-center gap-4 pt-4 border-t border-stone-200">
        <button
          onClick={handleSave}
          disabled={!hasChanges || updating}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
            ${hasChanges
              ? 'bg-amber-500 text-white hover:bg-amber-600'
              : 'bg-stone-100 text-stone-400 cursor-not-allowed'
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
          <span className="text-sm text-green-600">Notificaciones actualizadas</span>
        )}
      </div>
    </div>
  )
}
