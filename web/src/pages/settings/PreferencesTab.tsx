// Preferences Tab - Theme and language settings
import { useState, useEffect } from 'react'
import { Sun, Moon, Monitor, Save, Loader2 } from 'lucide-react'
import { useUserSettings } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

type Theme = 'light' | 'dark' | 'system'
type Language = 'es' | 'en'

const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Claro', icon: <Sun size={20} /> },
  { value: 'dark', label: 'Oscuro', icon: <Moon size={20} /> },
  { value: 'system', label: 'Sistema', icon: <Monitor size={20} /> },
]

const languageOptions: { value: Language; label: string; flag: string }[] = [
  { value: 'es', label: 'Espanol', flag: '🇲🇽' },
  { value: 'en', label: 'English', flag: '🇺🇸' },
]

export function PreferencesTab() {
  const { data: settings, loading, error, refetch, updateSettings, updating } = useUserSettings()
  const [theme, setTheme] = useState<Theme>('system')
  const [language, setLanguage] = useState<Language>('es')
  const [hasChanges, setHasChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize from settings
  useEffect(() => {
    if (settings) {
      setTheme(settings.theme)
      setLanguage(settings.language)
    }
  }, [settings])

  if (loading) {
    return <LoadingState message="Cargando preferencias..." />
  }

  if (error || !settings) {
    return (
      <ErrorState
        title="Error al cargar preferencias"
        message="No se pudieron cargar las preferencias."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const handleThemeChange = (value: Theme) => {
    setTheme(value)
    setHasChanges(value !== settings.theme || language !== settings.language)
    setSaveSuccess(false)
  }

  const handleLanguageChange = (value: Language) => {
    setLanguage(value)
    setHasChanges(theme !== settings.theme || value !== settings.language)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    try {
      await updateSettings({ theme, language })
      setHasChanges(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Error handled by hook
    }
  }

  return (
    <div className="space-y-8">
      {/* Theme Selection */}
      <div>
        <h3 className="text-lg font-medium text-neutral-900 mb-1">Tema</h3>
        <p className="text-sm text-neutral-500 mb-4">Selecciona como quieres ver la interfaz</p>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all
                ${theme === option.value
                  ? 'border-gold-dark bg-gold-light text-gold-dark'
                  : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                }
              `}
            >
              {option.icon}
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Language Selection */}
      <div>
        <h3 className="text-lg font-medium text-neutral-900 mb-1">Idioma</h3>
        <p className="text-sm text-neutral-500 mb-4">Selecciona el idioma de la interfaz</p>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          {languageOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleLanguageChange(option.value)}
              className={`
                flex items-center gap-3 p-4 rounded-xl border-2 transition-all
                ${language === option.value
                  ? 'border-gold-dark bg-gold-light text-gold-dark'
                  : 'border-neutral-200 hover:border-neutral-300 text-neutral-600'
                }
              `}
            >
              <span className="text-2xl">{option.flag}</span>
              <span className="font-medium">{option.label}</span>
            </button>
          ))}
        </div>
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
          <span className="text-sm text-success-dark">Preferencias guardadas</span>
        )}
      </div>
    </div>
  )
}
