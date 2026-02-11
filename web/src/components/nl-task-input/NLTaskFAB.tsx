// Natural Language Task Creation Floating Action Button
// Appears on task pages for quick NL task creation with voice input

import { useState, useEffect, useCallback } from 'react'
import { Mic } from 'lucide-react'
import { NLTaskInputModal } from './NLTaskInputModal'

interface NLTaskFABProps {
  onTaskCreated?: (taskId: string) => void
}

export function NLTaskFAB({ onTaskCreated }: NLTaskFABProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Global keyboard shortcut: Ctrl/Cmd + N
  const handleKeyboardShortcut = useCallback((e: KeyboardEvent) => {
    // Check for Ctrl+N (Windows/Linux) or Cmd+N (Mac)
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
      e.preventDefault() // Prevent browser's default "New Window" action
      setIsOpen(true)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcut)
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcut)
    }
  }, [handleKeyboardShortcut])

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gold hover:bg-gold-dark text-neutral-900 border border-neutral-200 shadow-sm transition-all flex items-center justify-center group"
        aria-label="Crear tarea con lenguaje natural"
        title="Crear Tarea - Lenguaje natural y voz (Ctrl+N)"
      >
        <Mic size={24} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Modal */}
      <NLTaskInputModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onTaskCreated={onTaskCreated}
      />
    </>
  )
}

export default NLTaskFAB
