import { useEffect, useCallback, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface SidePanelProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Width of the panel */
  width?: 'md' | 'lg' | 'xl'
}

const widthClasses = {
  md: 'w-full sm:w-[500px]',
  lg: 'w-full sm:w-[600px] lg:w-[700px]',
  xl: 'w-full sm:w-[700px] lg:w-[800px]'
}

export function SidePanel({
  isOpen,
  onClose,
  title,
  children,
  width = 'lg'
}: SidePanelProps) {
  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleEscape])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel - slides from right */}
      <div className={`
        ml-auto relative ${widthClasses[width]}
        h-full
        bg-white dark:bg-stone-900
        border-l-2 border-stone-900 dark:border-stone-100
        shadow-[-8px_0_24px_rgba(0,0,0,0.15)]
        flex flex-col
        animate-slide-in-right
      `}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-stone-900 dark:border-stone-100 bg-stone-50 dark:bg-stone-800">
            <h2 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              <X size={20} className="text-stone-500" />
            </button>
          </div>
        )}

        {/* Close button if no title */}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors z-10"
          >
            <X size={20} className="text-stone-500" />
          </button>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
