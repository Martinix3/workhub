// UserSelect - Combobox for selecting users
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, User, X } from 'lucide-react'
import { useUsers } from '../../api/hooks/useAdmin'

interface UserSelectProps {
  value: string | null
  onChange: (email: string | null) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function UserSelect({
  value,
  onChange,
  placeholder = 'Seleccionar usuario',
  disabled = false,
  className = ''
}: UserSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: usersData, loading, setSearch } = useUsers(20)
  const users = usersData?.users || []

  // Find selected user for display
  const selectedUser = users.find(u => u.email === value || u.name === value)

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

  const handleSelect = (email: string) => {
    onChange(email)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-3 py-2 text-left
          border-2 border-neutral-300
          bg-white
          flex items-center gap-2
          transition-colors
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-neutral-400 cursor-pointer'}
          ${isOpen ? 'border-neutral-900' : ''}
        `}
      >
        {selectedUser ? (
          <>
            <div className="w-6 h-6 bg-neutral-200 border border-neutral-400 flex items-center justify-center flex-shrink-0">
              {selectedUser.user_image ? (
                <img
                  src={selectedUser.user_image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={14} className="text-neutral-500" />
              )}
            </div>
            <span className="flex-1 truncate text-sm text-neutral-900">
              {selectedUser.full_name || selectedUser.email}
            </span>
            {!disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-0.5 hover:bg-neutral-100"
              >
                <X size={14} className="text-neutral-400" />
              </button>
            )}
          </>
        ) : (
          <>
            <User size={16} className="text-neutral-400 flex-shrink-0" />
            <span className="flex-1 text-sm text-neutral-400">{placeholder}</span>
          </>
        )}
        <ChevronDown
          size={16}
          className={`text-neutral-400 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-neutral-200 max-h-64 overflow-hidden">
          {/* Search Input */}
          <div className="p-2 border-b border-neutral-200">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-neutral-50 border border-neutral-300">
              <Search size={14} className="text-neutral-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar usuario..."
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-48 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-neutral-500">
                Cargando...
              </div>
            ) : users.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-500">
                No se encontraron usuarios
              </div>
            ) : (
              users.map((user) => (
                <button
                  key={user.name}
                  type="button"
                  onClick={() => handleSelect(user.email)}
                  className={`
                    w-full px-3 py-2 flex items-center gap-2 text-left
                    hover:bg-gold-light transition-colors
                    ${user.email === value ? 'bg-gold-light' : ''}
                  `}
                >
                  <div className="w-7 h-7 bg-neutral-200 border border-neutral-400 flex items-center justify-center flex-shrink-0">
                    {user.user_image ? (
                      <img
                        src={user.user_image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={14} className="text-neutral-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">
                      {user.full_name || user.email}
                    </p>
                    {user.full_name && (
                      <p className="text-xs text-neutral-500 truncate">
                        {user.email}
                      </p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default UserSelect
