// Invitations Page - Send email invitations to new users
import { useState } from 'react'
import { Mail, Send, Loader2, Check, Plus, X } from 'lucide-react'
import { useRoles, useUserMutations } from '../../api'
import { LoadingState } from '../../components/ui/LoadingState'

interface InvitationEntry {
  id: string
  email: string
  roles: string[]
  status: 'pending' | 'sending' | 'sent' | 'error'
  error?: string
}

export function InvitationsPage() {
  const { data: allRoles, loading: rolesLoading } = useRoles()
  const { sendInvitation } = useUserMutations()

  const [invitations, setInvitations] = useState<InvitationEntry[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newRoles, setNewRoles] = useState<string[]>([])
  const [showRoleSelector, setShowRoleSelector] = useState(false)

  if (rolesLoading) {
    return <LoadingState message="Cargando..." />
  }

  const addInvitation = () => {
    if (!newEmail || !newEmail.includes('@')) return

    const newEntry: InvitationEntry = {
      id: Date.now().toString(),
      email: newEmail,
      roles: newRoles,
      status: 'pending'
    }

    setInvitations(prev => [...prev, newEntry])
    setNewEmail('')
    setNewRoles([])
  }

  const removeInvitation = (id: string) => {
    setInvitations(prev => prev.filter(inv => inv.id !== id))
  }

  const sendSingleInvitation = async (entry: InvitationEntry) => {
    setInvitations(prev =>
      prev.map(inv =>
        inv.id === entry.id ? { ...inv, status: 'sending' } : inv
      )
    )

    try {
      await sendInvitation(entry.email, entry.roles)
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === entry.id ? { ...inv, status: 'sent' } : inv
        )
      )
    } catch (err) {
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === entry.id
            ? { ...inv, status: 'error', error: err instanceof Error ? err.message : 'Error' }
            : inv
        )
      )
    }
  }

  const sendAllPending = async () => {
    const pending = invitations.filter(inv => inv.status === 'pending')
    for (const inv of pending) {
      await sendSingleInvitation(inv)
    }
  }

  const toggleRole = (role: string) => {
    setNewRoles(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  const pendingCount = invitations.filter(inv => inv.status === 'pending').length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-stone-900">Invitaciones</h2>
        <p className="text-sm text-stone-500 mt-1">
          Envia invitaciones por email para que nuevos usuarios se unan al sistema
        </p>
      </div>

      {/* Add invitation form */}
      <div className="p-4 border border-stone-200 rounded-xl space-y-4">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="usuario@empresa.com"
              className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && addInvitation()}
            />
          </div>
          <button
            onClick={() => setShowRoleSelector(!showRoleSelector)}
            className={`
              px-4 py-2 border rounded-lg transition-colors
              ${newRoles.length > 0
                ? 'border-amber-500 bg-amber-50 text-amber-700'
                : 'border-stone-300 text-stone-600 hover:bg-stone-50'
              }
            `}
          >
            {newRoles.length > 0 ? `${newRoles.length} roles` : 'Roles'}
          </button>
          <button
            onClick={addInvitation}
            disabled={!newEmail}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg transition-colors
              ${newEmail
                ? 'bg-amber-500 text-white hover:bg-amber-600'
                : 'bg-stone-100 text-stone-400 cursor-not-allowed'
              }
            `}
          >
            <Plus size={18} />
            Agregar
          </button>
        </div>

        {/* Role selector dropdown */}
        {showRoleSelector && (
          <div className="p-4 bg-stone-50 rounded-lg border border-stone-200">
            <p className="text-sm font-medium text-stone-700 mb-2">Selecciona roles:</p>
            <div className="flex flex-wrap gap-2">
              {allRoles?.map((role) => (
                <button
                  key={role.name}
                  onClick={() => toggleRole(role.name)}
                  className={`
                    px-3 py-1 text-sm rounded-full transition-colors
                    ${newRoles.includes(role.name)
                      ? 'bg-amber-500 text-white'
                      : 'bg-white border border-stone-200 text-stone-600 hover:border-stone-300'
                    }
                  `}
                >
                  {role.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Invitation list */}
      {invitations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-stone-900">Lista de invitaciones</h3>
            {pendingCount > 0 && (
              <button
                onClick={sendAllPending}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
              >
                <Send size={16} />
                Enviar todas ({pendingCount})
              </button>
            )}
          </div>

          <div className="border border-stone-200 rounded-lg divide-y divide-stone-100">
            {invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-4 p-4">
                <div className="flex-1">
                  <div className="font-medium text-stone-900">{inv.email}</div>
                  {inv.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {inv.roles.map((role) => (
                        <span
                          key={role}
                          className="px-2 py-0.5 text-xs bg-stone-100 text-stone-600 rounded-full"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                  {inv.error && (
                    <p className="text-xs text-red-500 mt-1">{inv.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {inv.status === 'pending' && (
                    <>
                      <button
                        onClick={() => sendSingleInvitation(inv)}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Enviar"
                      >
                        <Send size={18} />
                      </button>
                      <button
                        onClick={() => removeInvitation(inv.id)}
                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <X size={18} />
                      </button>
                    </>
                  )}
                  {inv.status === 'sending' && (
                    <Loader2 size={18} className="animate-spin text-amber-500" />
                  )}
                  {inv.status === 'sent' && (
                    <div className="flex items-center gap-1 text-green-600">
                      <Check size={18} />
                      <span className="text-sm">Enviado</span>
                    </div>
                  )}
                  {inv.status === 'error' && (
                    <button
                      onClick={() => sendSingleInvitation(inv)}
                      className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {invitations.length === 0 && (
        <div className="text-center py-12 text-stone-500">
          <Mail size={48} className="mx-auto mb-4 text-stone-300" />
          <p>Agrega emails para enviar invitaciones</p>
        </div>
      )}

      {/* Info */}
      <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-sm text-stone-600">
        <p>
          <strong>Nota:</strong> Los usuarios invitados recibiran un email con un enlace para
          completar su registro. Si ya tienen cuenta en el sistema, podran usar sus credenciales
          existentes.
        </p>
      </div>
    </div>
  )
}

export default InvitationsPage
