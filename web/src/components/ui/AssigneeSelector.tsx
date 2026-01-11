// AssigneeSelector - Multi-select component for managing task assignees
import { useState, useRef, useEffect } from 'react'
import { Crown, Search, User, X, AlertCircle, Plus } from 'lucide-react'
import { useUsers } from '../../api/hooks/useAdmin'
import type { TaskAssignee, AssigneeRole } from '../sections/tasks/types'

interface AssigneeSelectorProps {
  value: TaskAssignee[]
  onChange: (assignees: TaskAssignee[]) => void
  disabled?: boolean
  className?: string
}

export function AssigneeSelector({
  value,
  onChange,
  disabled = false,
  className = ''
}: AssigneeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: usersData, loading, setSearch } = useUsers(20)
  const users = usersData?.users || []

  // Get current owner
  const owner = value.find(a => a.role === 'Owner')
  const ownerCount = value.filter(a => a.role === 'Owner').length

  // Validation states
  const hasMaxAssignees = value.length >= 10
  const hasNoOwner = ownerCount === 0
  const hasMultipleOwners = ownerCount > 1

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchTerm)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, setSearch])

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleAddAssignee = (userEmail: string) => {
    if (hasMaxAssignees) return

    // Check if user already assigned
    if (value.some(a => a.user === userEmail)) {
      setSearchTerm('')
      return
    }

    // Find user details
    const user = users.find(u => u.email === userEmail)
    if (!user) return

    // Determine role: Owner if no owner exists, otherwise Collaborator
    const role: AssigneeRole = hasNoOwner ? 'Owner' : 'Collaborator'

    const newAssignee: TaskAssignee = {
      user: userEmail,
      role,
      user_name: user.full_name || user.email,
      user_email: userEmail
    }

    onChange([...value, newAssignee])
    setSearchTerm('')
  }

  const handleRemoveAssignee = (userEmail: string) => {
    const newAssignees = value.filter(a => a.user !== userEmail)

    // If removing the owner and there are other assignees, promote the first one to owner
    const wasOwner = value.find(a => a.user === userEmail)?.role === 'Owner'
    if (wasOwner && newAssignees.length > 0 && !newAssignees.some(a => a.role === 'Owner')) {
      newAssignees[0].role = 'Owner'
    }

    onChange(newAssignees)
  }

  const handleToggleRole = (userEmail: string) => {
    const currentAssignee = value.find(a => a.user === userEmail)
    if (!currentAssignee) return

    const newRole: AssigneeRole = currentAssignee.role === 'Owner' ? 'Collaborator' : 'Owner'

    // If promoting to Owner, demote current owner to Collaborator
    if (newRole === 'Owner') {
      const newAssignees = value.map(a => ({
        ...a,
        role: a.user === userEmail ? 'Owner' : ('Collaborator' as AssigneeRole)
      }))
      onChange(newAssignees)
    } else {
      // If demoting from Owner, need to promote someone else
      const newAssignees = value.map(a =>
        a.user === userEmail ? { ...a, role: newRole } : a
      )

      // Promote first Collaborator to Owner if there's no owner
      const hasOwner = newAssignees.some(a => a.role === 'Owner')
      if (!hasOwner && newAssignees.length > 0) {
        const firstCollaborator = newAssignees.find(a => a.role === 'Collaborator')
        if (firstCollaborator) {
          firstCollaborator.role = 'Owner'
        }
      }

      onChange(newAssignees)
    }
  }

  // Filter out already assigned users
  const availableUsers = users.filter(u => !value.some(a => a.user === u.email))

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected Assignees */}
      <div className="space-y-2 mb-2">
        {value.map((assignee) => {
          const isOwner = assignee.role === 'Owner'
          const displayName = assignee.user_name || assignee.user_email || assignee.user

          return (
            <div
              key={assignee.user}
              className="flex items-center gap-2 px-3 py-2 bg-white border-2 border-stone-300"
            >
              {/* Avatar */}
              <div className="w-7 h-7 bg-stone-200 border border-stone-400 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-stone-500" />
              </div>

              {/* Name and Email */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-900 truncate">
                  {displayName}
                </p>
                {assignee.user_name && assignee.user_email && (
                  <p className="text-xs text-stone-500 truncate">
                    {assignee.user_email}
                  </p>
                )}
              </div>

              {/* Role Toggle */}
              <button
                type="button"
                onClick={() => handleToggleRole(assignee.user)}
                disabled={disabled}
                className={`
                  px-2 py-1 flex items-center gap-1 text-xs font-medium
                  border-2 transition-colors
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  ${
                    isOwner
                      ? 'bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200'
                      : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200'
                  }
                `}
                title={isOwner ? 'Cambiar a Colaborador' : 'Cambiar a Owner'}
              >
                {isOwner && <Crown size={12} />}
                {isOwner ? 'Owner' : 'Colaborador'}
              </button>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => handleRemoveAssignee(assignee.user)}
                disabled={disabled}
                className="p-1 hover:bg-stone-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Quitar asignado"
              >
                <X size={16} className="text-stone-400" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Add Assignee Button */}
      <button
        type="button"
        onClick={() => !disabled && !hasMaxAssignees && setIsOpen(!isOpen)}
        disabled={disabled || hasMaxAssignees}
        className={`
          w-full px-3 py-2 text-left
          border-2 border-stone-300
          bg-white
          flex items-center gap-2
          transition-colors
          ${
            disabled || hasMaxAssignees
              ? 'opacity-50 cursor-not-allowed'
              : 'hover:border-stone-400 cursor-pointer'
          }
          ${isOpen ? 'border-stone-900' : ''}
        `}
      >
        <Plus size={16} className="text-stone-400 flex-shrink-0" />
        <span className="flex-1 text-sm text-stone-600">
          {hasMaxAssignees
            ? 'Máximo de 10 asignados alcanzado'
            : 'Agregar asignado'}
        </span>
        {value.length > 0 && (
          <span className="text-xs text-stone-500">
            {value.length}/10
          </span>
        )}
      </button>

      {/* Validation Messages */}
      {(hasNoOwner || hasMultipleOwners) && value.length > 0 && (
        <div className="mt-2 flex items-start gap-2 px-3 py-2 bg-red-50 border-2 border-red-400">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {hasNoOwner && (
              <p className="text-xs text-red-800">
                Debe haber exactamente un Owner. Usa los botones de rol para asignar uno.
              </p>
            )}
            {hasMultipleOwners && (
              <p className="text-xs text-red-800">
                Solo puede haber un Owner. Cambia los demás a Colaborador.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Dropdown for adding assignees */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-stone-200">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-stone-50 border border-stone-300">
              <Search size={14} className="text-stone-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar usuario..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-stone-400"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-stone-500">
                Cargando...
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="p-4 text-center text-sm text-stone-500">
                {searchTerm
                  ? 'No se encontraron usuarios'
                  : 'Todos los usuarios ya están asignados'}
              </div>
            ) : (
              availableUsers.map((user) => (
                <button
                  key={user.name}
                  type="button"
                  onClick={() => handleAddAssignee(user.email)}
                  className="w-full px-3 py-2 flex items-center gap-2 text-left hover:bg-amber-50 transition-colors"
                >
                  <div className="w-7 h-7 bg-stone-200 border border-stone-400 flex items-center justify-center flex-shrink-0">
                    {user.user_image ? (
                      <img
                        src={user.user_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={14} className="text-stone-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">
                      {user.full_name || user.email}
                    </p>
                    {user.full_name && (
                      <p className="text-xs text-stone-500 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-stone-400">
                    {hasNoOwner ? 'Owner' : 'Colaborador'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AssigneeSelector
