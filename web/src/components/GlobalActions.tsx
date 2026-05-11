// Global Actions Component
// Combines Smart Notepad FAB and Quick Task Modal with keyboard shortcut handling
// FAB shows menu with options: Smart Notepad and Quick Task
// Cmd/Ctrl+K opens Quick Task directly

import { useState, useCallback, useRef, useEffect } from 'react'
import { PenLine, Zap, X } from 'lucide-react'
import { SmartNotepadModal } from './smart-notepad/SmartNotepadModal'
import { QuickTaskModal } from './quick-task/QuickTaskModal'
import { useGlobalKeyboard } from '../hooks/useGlobalKeyboard'
import { detectContext, hasRelevantContext, getSuggestedDepartment } from '../services/contextDetector'

type ActiveModal = 'notepad' | 'quickTask' | null

export function GlobalActions() {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const [detectedContext, setDetectedContext] = useState<{
    doctype?: string
    docId?: string
    department?: 'SALES' | 'OPS' | 'MKT'
  } | undefined>(undefined)

  // Handle Cmd/Ctrl+K shortcut to open Quick Task
  useGlobalKeyboard({
    onShortcut: () => {
      setMenuOpen(false)
      detectAndOpenQuickTask()
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

  // Detect context and open Quick Task
  const detectAndOpenQuickTask = useCallback(() => {
    const context = detectContext()

    // Build initial context object
    const initialContext: {
      doctype?: string
      docId?: string
      department?: 'SALES' | 'OPS' | 'MKT'
    } = {}

    // Add doctype if relevant context detected
    if (hasRelevantContext(context) && context.doctype) {
      initialContext.doctype = context.doctype
      // Note: docId would need to be extracted from URL params if viewing a specific doc
      // For now, we just pass doctype to trigger suggestions
    }

    // Add suggested department
    const department = getSuggestedDepartment(context)
    if (department) {
      initialContext.department = department
    }

    setDetectedContext(Object.keys(initialContext).length > 0 ? initialContext : undefined)
    setActiveModal('quickTask')
  }, [])

  // Handle menu option click
  const handleSmartNotepad = useCallback(() => {
    setMenuOpen(false)
    setActiveModal('notepad')
  }, [])

  const handleQuickTask = useCallback(() => {
    setMenuOpen(false)
    detectAndOpenQuickTask()
  }, [detectAndOpenQuickTask])

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
          <div className="absolute bottom-16 right-0 w-56 bg-white border border-neutral-200 shadow-sm mb-2">
            {/* Menu Header */}
            <div className="flex items-center justify-between p-3 border-b-2 border-neutral-200">
              <span className="text-sm font-medium text-neutral-700">Acciones Rápidas</span>
              <button
                onClick={() => setMenuOpen(false)}
                className="p-0.5 hover:bg-neutral-100 transition-colors"
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
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gold-light transition-colors text-left border-2 border-transparent hover:border-gold"
              >
                <div className="w-8 h-8 bg-gold border border-neutral-900 flex items-center justify-center flex-shrink-0">
                  <PenLine size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900">Smart Notepad</div>
                  <div className="text-xs text-neutral-500">Registrar actividad</div>
                </div>
              </button>

              {/* Quick Task Option */}
              <button
                onClick={handleQuickTask}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gold-light transition-colors text-left border-2 border-transparent hover:border-gold mt-1"
              >
                <div className="w-8 h-8 bg-gold border border-neutral-900 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900">Quick Task</div>
                  <div className="text-xs text-neutral-500">
                    <kbd className="px-1 py-0.5 bg-neutral-200 border border-neutral-300 text-[10px] font-mono">
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
          className={`w-14 h-14 bg-gold hover:bg-gold-dark text-neutral-900 border border-neutral-200 shadow-sm transition-all flex items-center justify-center group ${
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
        initialContext={detectedContext}
      />
    </>
  )
}

export default GlobalActions
