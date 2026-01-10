// Natural Language Task Creation Floating Action Button
// Appears on task pages for quick NL task creation with voice input

import { useState } from 'react'
import { Mic } from 'lucide-react'
import { NLTaskInputModal } from './NLTaskInputModal'

interface NLTaskFABProps {
  onTaskCreated?: (taskId: string) => void
}

export function NLTaskFAB({ onTaskCreated }: NLTaskFABProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-amber-400 hover:bg-amber-500 text-stone-900 border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center group"
        aria-label="Crear tarea con lenguaje natural"
        title="Crear Tarea - Lenguaje natural y voz"
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
