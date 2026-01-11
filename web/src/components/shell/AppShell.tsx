import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { MainNav } from './MainNav'
import { UserMenu } from './UserMenu'
import type { NavigationSection, User } from './types'
import { Menu, Search, X } from 'lucide-react'

interface AppShellProps {
  children: ReactNode
  navigationSections: NavigationSection[]
  user?: User
  onNavigate?: (href: string) => void
  onLogout?: () => void
}

export function AppShell({
  children,
  navigationSections,
  user,
  onNavigate,
  onLogout
}: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  // Handle keyboard shortcuts for command palette
  const handleKeyboardShortcut = useCallback((e: KeyboardEvent) => {
    // Cmd/Ctrl+K to toggle command palette
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault()
      setSearchOpen(prev => !prev)
    }
    // ESC to close command palette
    if (e.key === 'Escape') {
      setSearchOpen(false)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcut)
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcut)
    }
  }, [handleKeyboardShortcut])

  return (
    <div className="min-h-screen bg-[#fafaf8]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-60 bg-[#1e293b] text-white
        transform transition-transform duration-200 ease-out
        lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-4 border-b border-slate-700">
          <span className="font-['Playfair_Display'] text-xl font-bold tracking-tight">
            SANTA BRISA
          </span>
          <button
            className="ml-auto lg:hidden p-2 hover:bg-slate-700 rounded"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto py-4">
          <MainNav
            sections={navigationSections}
            onNavigate={(href) => {
              onNavigate?.(href)
              setSidebarOpen(false)
            }}
          />
        </div>

        {/* User Menu */}
        {user && (
          <div className="border-t border-slate-700 p-4">
            <UserMenu
              user={user}
              onLogout={onLogout}
              onNavigate={(href) => {
                onNavigate?.(href)
                setSidebarOpen(false)
              }}
            />
          </div>
        )}
      </aside>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Mobile header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b-2 border-[#1e293b] flex items-center px-4 lg:hidden">
          <button
            className="p-2 hover:bg-stone-100 -ml-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          <span className="font-['Playfair_Display'] text-lg font-bold ml-2">
            WorkHub
          </span>
          <button
            className="ml-auto p-2 hover:bg-stone-100"
            onClick={() => setSearchOpen(true)}
          >
            <Search size={20} />
          </button>
        </header>

        {/* Content area */}
        <main className="min-h-[calc(100vh-4rem)] lg:min-h-screen">
          {children}
        </main>
      </div>

      {/* Command Palette placeholder */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-24">
          <div className="w-full max-w-xl bg-white border-2 border-[#1e293b] shadow-[4px_4px_0_#1e293b] mx-4">
            <div className="flex items-center border-b-2 border-[#1e293b] p-4">
              <Search size={20} className="text-stone-400 mr-3" />
              <input
                type="text"
                placeholder="Buscar..."
                className="flex-1 outline-none font-['Inter'] text-base"
                autoFocus
              />
              <kbd className="hidden sm:inline-block px-2 py-1 text-xs font-mono bg-stone-100 border border-stone-300">
                ESC
              </kbd>
            </div>
            <div className="p-4 text-sm text-stone-500">
              Escribe para buscar paginas, clientes, pedidos...
            </div>
          </div>
          <button
            className="absolute inset-0 -z-10"
            onClick={() => setSearchOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
