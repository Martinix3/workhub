// Notifications Tab - Email, push, and digest settings
import { useState, useEffect } from 'react'
import { Save, Loader2, Bell, BellOff, Clock, Zap } from 'lucide-react'
import { useUserSettings } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'
import { TimePicker } from '../../components/ui/TimePicker'

type NotificationFrequency = 'realtime' | 'daily' | 'weekly' | 'off'

interface NotificationSettings {
  frequency: NotificationFrequency
  quiet_hours_enabled: boolean
  quiet_hours_start: string
  quiet_hours_end: string
  priority_bypass_enabled: boolean
  email_enabled: boolean
}

export function NotificationsTab() {
  const { data: settings, loading, error, refetch, updateSettings, updating } = useUserSettings()
  const [notifications, setNotifications] = useState<NotificationSettings>({
    frequency: 'daily',
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '08:00:00',
    priority_bypass_enabled: true,
    email_enabled: true
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

  const handleChange = (field: keyof NotificationSettings, value: boolean | NotificationFrequency | string) => {
    const updated = { ...notifications, [field]: value }
    setNotifications(updated)
    setHasChanges(
      updated.frequency !== settings.notifications.frequency ||
      updated.quiet_hours_enabled !== settings.notifications.quiet_hours_enabled ||
      updated.quiet_hours_start !== settings.notifications.quiet_hours_start ||
      updated.quiet_hours_end !== settings.notifications.quiet_hours_end ||
      updated.priority_bypass_enabled !== settings.notifications.priority_bypass_enabled ||
      updated.email_enabled !== settings.notifications.email_enabled
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
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-medium text-stone-900 mb-1">Notificaciones</h3>
        <p className="text-sm text-stone-500 mb-6">
          Configura como quieres recibir notificaciones del sistema
        </p>

        {/* Email Enable Toggle */}
        <div className="mb-6">
          <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
            <div>
              <span className="font-medium text-stone-900">Notificaciones por email</span>
              <p className="text-sm text-stone-500">
                Recibe alertas importantes por correo electrónico
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notifications.email_enabled}
                onChange={(e) => handleChange('email_enabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Notification Frequency */}
      <div>
        <h4 className="font-medium text-stone-900 mb-3">Frecuencia de notificaciones</h4>
        <p className="text-sm text-stone-500 mb-4">
          Elige cómo y cuándo quieres recibir notificaciones
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { value: 'realtime' as const, label: 'Tiempo real', icon: <Bell size={18} />, description: 'Al instante' },
            { value: 'daily' as const, label: 'Diario', icon: <Clock size={18} />, description: 'Resumen diario' },
            { value: 'weekly' as const, label: 'Semanal', icon: <Clock size={18} />, description: 'Resumen semanal' },
            { value: 'off' as const, label: 'Desactivado', icon: <BellOff size={18} />, description: 'Sin emails' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => handleChange('frequency', option.value)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${notifications.frequency === option.value
                  ? 'border-amber-500 bg-amber-50 text-amber-700'
                  : 'border-stone-200 hover:border-stone-300 text-stone-600'
                }
              `}
            >
              {option.icon}
              <div className="text-center">
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs opacity-75">{option.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Priority Bypass */}
      <div>
        <label className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer hover:bg-amber-100 transition-colors">
          <div className="flex items-start gap-3">
            <Zap size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium text-stone-900">Notificaciones prioritarias inmediatas</span>
              <p className="text-sm text-stone-600 mt-1">
                Siempre recibe notificaciones al instante para tareas de prioridad crítica (P0) y alta (P1),
                incluso cuando tengas configurado un resumen o notificaciones desactivadas
              </p>
            </div>
          </div>
          <div className="relative flex-shrink-0 ml-4">
            <input
              type="checkbox"
              checked={notifications.priority_bypass_enabled}
              onChange={(e) => handleChange('priority_bypass_enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </div>
        </label>
      </div>

      {/* Quiet Hours */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-medium text-stone-900">Horario de silencio</h4>
            <p className="text-sm text-stone-500 mt-1">
              No recibir notificaciones durante ciertas horas (solo para notificaciones en tiempo real)
            </p>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={notifications.quiet_hours_enabled}
              onChange={(e) => handleChange('quiet_hours_enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
          </div>
        </div>

        {notifications.quiet_hours_enabled && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-stone-50 rounded-xl">
            <TimePicker
              value={notifications.quiet_hours_start}
              onChange={(value) => handleChange('quiet_hours_start', value)}
              label="Hora de inicio"
            />
            <TimePicker
              value={notifications.quiet_hours_end}
              onChange={(value) => handleChange('quiet_hours_end', value)}
              label="Hora de fin"
            />
          </div>
        )}
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
