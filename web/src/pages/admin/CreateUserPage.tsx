// Create User Page - Form to create new user
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import { useRoles, useUserMutations } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'

export function CreateUserPage() {
  const navigate = useNavigate()
  const { data: allRoles, loading: rolesLoading } = useRoles()
  const { createUser, loading } = useUserMutations()

  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  if (rolesLoading) {
    return <LoadingState message="Cargando..." />
  }

  const isValid = email && firstName

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!isValid) {
      setError('Email y nombre son requeridos')
      return
    }

    try {
      await createUser(email, firstName, lastName || undefined, selectedRoles)
      navigate('/admin/users')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear usuario')
    }
  }

  const toggleRole = (role: string) => {
    setSelectedRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

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
      </div>

      <div>
        <h2 className="text-lg font-medium text-neutral-900">Nuevo Usuario</h2>
        <p className="text-sm text-neutral-500 mt-1">
          Crea una nueva cuenta de usuario en el sistema
        </p>
      </div>

      {error && (
        <div className="p-4 bg-error-light border border-error rounded-lg text-error-text text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Email <span className="text-error">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="usuario@empresa.com"
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-dark focus:border-gold-dark transition-colors"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Nombre <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Nombre"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-dark focus:border-gold-dark transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Apellido
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Apellido"
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-gold-dark focus:border-gold-dark transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Roles
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {allRoles?.map((role) => (
              <label
                key={role.name}
                className={`
                  flex items-center gap-2 p-3 border-2 rounded-lg cursor-pointer transition-colors
                  ${selectedRoles.includes(role.name)
                    ? 'border-gold-dark bg-gold-light'
                    : 'border-neutral-200 hover:border-neutral-300'
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={selectedRoles.includes(role.name)}
                  onChange={() => toggleRole(role.name)}
                  className="w-4 h-4 rounded border-neutral-300 text-gold-dark focus:ring-gold-dark"
                />
                <span className="text-sm text-neutral-700">{role.name}</span>
              </label>
            ))}
          </div>
          <p className="text-xs text-neutral-400 mt-2">
            Selecciona los roles que tendra el usuario
          </p>
        </div>

        <div className="pt-4 border-t border-neutral-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!isValid || loading}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${isValid
                ? 'bg-gold-dark text-white hover:bg-gold-dark'
                : 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
              }
            `}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Crear usuario
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateUserPage
