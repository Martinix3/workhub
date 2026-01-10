// Smart Notepad Floating Action Button
// Appears on all pages for quick note entry

import { useState } from 'react'
import { PenLine } from 'lucide-react'
import { SmartNotepadModal } from './SmartNotepadModal'

export function SmartNotepadFAB() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-amber-400 hover:bg-amber-500 text-stone-900 border-2 border-stone-900 shadow-[4px_4px_0_#1c1917] hover:shadow-[2px_2px_0_#1c1917] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center justify-center group"
        aria-label="Abrir Smart Notepad"
        title="Smart Notepad - Registrar actividad"
      >
        <PenLine size={24} className="group-hover:scale-110 transition-transform" />
      </button>

      {/* Modal */}
      <SmartNotepadModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}

export default SmartNotepadFAB
