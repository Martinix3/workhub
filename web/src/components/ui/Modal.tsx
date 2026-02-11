import { useEffect, useCallback, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useFocusTrap } from '../../hooks'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** Progress value 0-100 for TDAH-friendly progress bar */
  progress?: number
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl'
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'lg',
  progress
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)
  const titleId = `modal-title-${useRef(Math.random().toString(36).slice(2, 11)).current}`

  // Trap focus within the modal when open
  useFocusTrap(modalRef, isOpen)

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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`
        relative w-full ${sizeClasses[size]}
        bg-white dark:bg-neutral-800
        border border-neutral-200 dark:border-neutral-100

        max-h-[calc(100vh-6rem)] flex flex-col
      `}>
        {/* Header with progress bar */}
        <div className="border-b border-neutral-200 dark:border-neutral-100">
          {/* Progress bar */}
          {progress !== undefined && (
            <div className="h-1.5 bg-neutral-200 dark:bg-neutral-700">
              <div
                className="h-full bg-gold transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {/* Title and close */}
          <div className="flex items-center justify-between p-4">
            <h2
              id={titleId}
              className="font-heading text-lg font-bold text-neutral-800 dark:text-neutral-100"
            >
              {title}
            </h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X size={20} className="text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
