// Global Actions Component
// Combines Smart Notepad FAB and Quick Task Modal with keyboard shortcut handling
// FAB shows menu with options: Smart Notepad and Quick Task
// Cmd/Ctrl+K opens Quick Task directly

import { useState, useCallback, useRef, useEffect } from 'react'
import { PenLine, Zap, X } from 'lucide-react'
import { SmartNotepadModal } from './smart-notepad/SmartNotepadModal'
import { QuickTaskModal } from './quick-task/QuickTaskModal'
import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard'

type ActiveModal = 'notepad' | 'quickTask' | null

export function GlobalActions() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Handle Cmd/Ctrl+K shortcut to open Quick Task
  useGlobalKeyboard({
    onShortcut: () => {
      setMenuOpen(false)
      setActiveModal('quickTask')
    },
    enabled: activeModal === null // Only enable when no modal is open
  })

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Handle FAB click - toggle menu
  const handleFABClick = useCallback(() => {
    setMenuOpen(prev => !prev)
  }, [])

  // Handle menu option click
  const handleSmartNotepad = useCallback(() => {
    setMenuOpen(false)
    setActiveModal('notepad')
  }, [])

  const handleQuickTask = useCallback(() => {
    setMenuOpen(false)
    setActiveModal('quickTask')
  }, [])

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setActiveModal(null)
  }, [])

  return (
    <>
      {/* Floating Action Button with Menu */}
      <div ref={menuRef} className="fixed bottom-6 right-6 z-40">
        {/* Menu (appears above FAB) */}
        {menuOpen && (
          <div className="absolute bottom-16 right-0 w-56 bg-white border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] mb-2">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-3 border-b-2 border-stone-200">
              <span className="text-sm font-medium text-stone-700">Acciones Rápidas</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-0.5 hover:bg-stone-100 transition-colors"
                aria-label="Cerrar menú"
              >
                <X size={16} />
              </button>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {/* Smart Notepad Option */}
              <button
                onClick={handleSmartNotepad}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 transition-colors text-left border-2 border-transparent hover:border-amber-200"
              >
                <div className="w-8 h-8 bg-amber-400 border border-stone-900 flex items-center justify-center flex-shrink-0">
                  <PenLine size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-900">Smart Notepad</div>
                  <div className="text-xs text-stone-500">Registrar actividad</div>
                </div>
              </button>

              {/* Quick Task Option */}
              <button
                onClick={handleQuickTask}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-amber-50 transition-colors text-left border-2 border-transparent hover:border-amber-200 mt-1"
              >
                <div className="w-8 h-8 bg-amber-400 border border-stone-900 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-stone-900">Quick Task</div>
                  <div className="text-xs text-stone-500">
                    <kbd className="px-1 py-0.5 bg-stone-200 border border-stone-300 text-[10px] font-mono">
                      ⌘K
                    </kbd>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* FAB Button */}
        <button
          onClick={handleFABClick}
          className={`w-14 h-14 bg-amber-400 hover:bg-amber-500 text-stone-900 border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center group ${
            menuOpen ? 'rotate-45' : ''
          }`}
          aria-label="Acciones rápidas"
          title="Acciones rápidas (Cmd/Ctrl+K para tarea rápida)"
        >
          {menuOpen ? (
            <X size={24} className="group-hover:scale-110 transition-transform" />
          ) : (
            <Zap size={24} className="group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* Modals */}
      <SmartNotepadModal
        isOpen={activeModal === 'notepad'}
        onClose={handleCloseModal}
      />

      <QuickTaskModal
        isOpen={activeModal === 'quickTask'}
        onClose={handleCloseModal}
      />
    </>
  )
}

export default GlobalActions
