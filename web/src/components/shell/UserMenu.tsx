import { useState } from 'react'
import { LogOut, Settings, User as UserIcon, ChevronUp, Shield } from 'lucide-react'
import type { User } from './types'

interface UserMenuProps {
  user: User
  onLogout?: () => void
  onNavigate?: (href: string) => void
}

// Check if user has admin roles
function isAdmin(roles?: string[]): boolean {
  if (!roles) return false
  return roles.some(role => ['System Manager', 'HR Manager'].includes(role))
}

export function UserMenu({ user, onLogout, onNavigate }: UserMenuProps) {
  const [open, setOpen] = useState(false)

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const handleNavigate = (href: string) => {
    setOpen(false)
    onNavigate?.(href)
  }

  const showAdmin = isAdmin(user.roles)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-2 rounded hover:bg-neutral-700 transition-colors"
      >
        {/* Avatar */}
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name}
            className="w-9 h-9 rounded-full object-cover border-2 border-neutral-600"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-[#f5ce3e] text-[#1e293b] flex items-center justify-center text-sm font-bold font-['Inter']">
            {initials}
          </div>
        )}

        {/* Name & Role */}
        <div className="flex-1 text-left min-w-0">
          <div className="text-sm font-medium text-white truncate font-['Inter']">
            {user.name}
          </div>
          {user.role && (
            <div className="text-xs text-neutral-400 truncate font-['Inter']">
              {user.role}
            </div>
          )}
        </div>

        <ChevronUp
          size={16}
          className={`text-neutral-400 transition-transform ${open ? '' : 'rotate-180'}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#0f172a] border border-neutral-700 shadow-lg z-50">
            <div className="py-1">
              <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                onClick={() => handleNavigate('/settings')}
              >
                <UserIcon size={16} />
                <span className="font-['Inter']">Mi Perfil</span>
              </button>
              <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-700 hover:text-white transition-colors"
                onClick={() => handleNavigate('/settings')}
              >
                <Settings size={16} />
                <span className="font-['Inter']">Configuracion</span>
              </button>
              {showAdmin && (
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gold hover:bg-neutral-700 hover:text-gold transition-colors"
                  onClick={() => handleNavigate('/admin')}
                >
                  <Shield size={16} />
                  <span className="font-['Inter']">Administracion</span>
                </button>
              )}
              <hr className="my-1 border-neutral-700" />
              <button
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-neutral-700 hover:text-error transition-colors"
                onClick={() => {
                  setOpen(false)
                  onLogout?.()
                }}
              >
                <LogOut size={16} />
                <span className="font-['Inter']">Cerrar Sesion</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
