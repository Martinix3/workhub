// Profile Tab - Edit user name and avatar
import { useState } from 'react'
import { Camera, Save, Loader2 } from 'lucide-react'
import { useUserProfile } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'
import { ErrorState } from '../../components/ui/ErrorState'

export function ProfileTab() {
  const { data: profile, loading, error, refetch, updateProfile, updating } = useUserProfile()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Initialize form when profile loads
  useState(() => {
    if (profile) {
      setFirstName(profile.first_name)
      setLastName(profile.last_name)
    }
  })

  if (loading) {
    return <LoadingState message="Cargando perfil..." />
  }

  if (error || !profile) {
    return (
      <ErrorState
        title="Error al cargar perfil"
        message="No se pudo cargar la informacion del perfil."
        error={error}
        onRetry={refetch}
      />
    )
  }

  const handleFirstNameChange = (value: string) => {
    setFirstName(value)
    setHasChanges(value !== profile.first_name || lastName !== profile.last_name)
    setSaveSuccess(false)
  }

  const handleLastNameChange = (value: string) => {
    setLastName(value)
    setHasChanges(firstName !== profile.first_name || value !== profile.last_name)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    try {
      await updateProfile({ first_name: firstName, last_name: lastName })
      setHasChanges(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      // Error is handled by the hook
    }
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-stone-200 flex items-center justify-center overflow-hidden">
            {profile.user_image ? (
              <img
                src={profile.user_image}
                alt={profile.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl font-semibold text-stone-500">
                {profile.full_name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <button
            className="absolute bottom-0 right-0 p-2 bg-white border border-stone-200 rounded-full shadow-sm hover:bg-stone-50 transition-colors"
            title="Cambiar foto"
          >
            <Camera size={16} className="text-stone-600" />
          </button>
        </div>
        <div>
          <h3 className="text-lg font-medium text-stone-900">{profile.full_name}</h3>
          <p className="text-stone-500">{profile.email}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {profile.roles.slice(0, 3).map((role) => (
              <span
                key={role}
                className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full"
              >
                {role}
              </span>
            ))}
            {profile.roles.length > 3 && (
              <span className="px-2 py-0.5 text-xs bg-stone-100 text-stone-600 rounded-full">
                +{profile.roles.length - 3} mas
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => handleFirstNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Apellido
          </label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => handleLastNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
            placeholder="Tu apellido"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Email
        </label>
        <input
          type="email"
          value={profile.email}
          disabled
          className="w-full px-3 py-2 border border-stone-200 rounded-lg bg-stone-50 text-stone-500 cursor-not-allowed"
        />
        <p className="text-xs text-stone-400 mt-1">El email no se puede cambiar</p>
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
          <span className="text-sm text-green-600">Cambios guardados correctamente</span>
        )}
      </div>
    </div>
  )
}
