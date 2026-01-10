// Notifications Tab - Email, push, and digest settings
import { useState, useEffect } from 'react'
import { Save, Loader2, Bell, CheckCircle, AlertCircle, Package, Activity } from 'lucide-react'
import { useUserSettings } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

type DigestFrequency = 'daily' | 'weekly' | 'none'

interface NotificationSettings {
  email: boolean
  push: boolean
  task_assigned: boolean
  task_status: boolean
  overdue_alerts: boolean
  order_status: boolean
  project_health: boolean
  digest_frequency: DigestFrequency
}

export function NotificationsTab() {
  const { data: settings, loading, error, refetch, updateSettings, updating } = useUserSettings()
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email: true,
    push: false,
    task_assigned: true,
    task_status: true,
    overdue_alerts: true,
    order_status: true,
    project_health: true,
    digest_frequency: 'daily'
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
      updated.task_assigned !== settings.notifications.task_assigned ||
      updated.task_status !== settings.notifications.task_status ||
      updated.overdue_alerts !== settings.notifications.overdue_alerts ||
      updated.order_status !== settings.notifications.order_status ||
      updated.project_health !== settings.notifications.project_health ||
      updated.digest_frequency !== settings.notifications.digest_frequency
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
      {/* General Channels */}
      <div>
        <h3 className="text-lg font-medium text-stone-900 mb-1">Canales de notificación</h3>
        <p className="text-sm text-stone-500 mb-6">
          Configura como quieres recibir notificaciones del sistema
        </p>

        <div className="space-y-4">
          {/* Email Notifications */}
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

      {/* Task Notifications */}
      <div>
        <h3 className="text-lg font-medium text-stone-900 mb-1">Notificaciones de tareas</h3>
        <p className="text-sm text-stone-500 mb-6">
          Recibe notificaciones sobre tus tareas y proyectos
        </p>

        <div className="space-y-4">
          {/* Task Assignment */}
          <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
            <div className="flex items-start gap-3">
              <Bell className="w-5 h-5 text-stone-600 mt-0.5" />
              <div>
                <span className="font-medium text-stone-900">Asignación de tareas</span>
                <p className="text-sm text-stone-500">
                  Notificar cuando te asignen una nueva tarea
                </p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notifications.task_assigned}
                onChange={(e) => handleChange('task_assigned', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </div>
          </label>

          {/* Task Status Changes */}
          <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-stone-600 mt-0.5" />
              <div>
                <span className="font-medium text-stone-900">Cambios de estado</span>
                <p className="text-sm text-stone-500">
                  Notificar cuando cambie el estado de tus tareas
                </p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notifications.task_status}
                onChange={(e) => handleChange('task_status', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </div>
          </label>

          {/* Overdue Alerts */}
          <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-stone-600 mt-0.5" />
              <div>
                <span className="font-medium text-stone-900">Tareas vencidas</span>
                <p className="text-sm text-stone-500">
                  Alertas sobre tareas que pasaron su fecha límite
                </p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notifications.overdue_alerts}
                onChange={(e) => handleChange('overdue_alerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Business Notifications */}
      <div>
        <h3 className="text-lg font-medium text-stone-900 mb-1">Notificaciones de negocio</h3>
        <p className="text-sm text-stone-500 mb-6">
          Recibe notificaciones sobre pedidos y salud de proyectos
        </p>

        <div className="space-y-4">
          {/* Order Updates */}
          <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-stone-600 mt-0.5" />
              <div>
                <span className="font-medium text-stone-900">Actualizaciones de pedidos</span>
                <p className="text-sm text-stone-500">
                  Notificar sobre cambios en pedidos de distribuidores
                </p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notifications.order_status}
                onChange={(e) => handleChange('order_status', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </div>
          </label>

          {/* Project Health */}
          <label className="flex items-center justify-between p-4 bg-stone-50 rounded-xl cursor-pointer hover:bg-stone-100 transition-colors">
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 text-stone-600 mt-0.5" />
              <div>
                <span className="font-medium text-stone-900">Salud de proyectos</span>
                <p className="text-sm text-stone-500">
                  Alertas sobre proyectos en riesgo o con problemas
                </p>
              </div>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={notifications.project_health}
                onChange={(e) => handleChange('project_health', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-stone-300 peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </div>
          </label>
        </div>
      </div>

      {/* Digest Frequency */}
      <div>
        <h3 className="text-lg font-medium text-stone-900 mb-1">Resumen de actividad</h3>
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
              onClick={() => handleChange('digest_frequency', option.value)}
              className={`
                p-3 rounded-xl border-2 font-medium transition-all
                ${notifications.digest_frequency === option.value
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
