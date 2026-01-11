// Global keyboard shortcut hook
// Handles Cmd/Ctrl+K shortcut globally across all pages

import { useEffect, useCallback } from 'react'

interface UseGlobalKeyboardOptions {
  /** Callback function to execute when the shortcut is triggered */
  onShortcut: () => void
  /** Enable/disable the shortcut (default: true) */
  enabled?: boolean
}

/**
 * Hook to handle global keyboard shortcuts
 * Currently supports Cmd/Ctrl+K for quick task creation
 *
 * @param options Configuration options including callback and enabled state
 *
 * @example
 * ```tsx
 * useGlobalKeyboard({
 *   onShortcut: () => setModalOpen(true),
 *   enabled: true
 * })
 * ```
 */
export function useGlobalKeyboard({ onShortcut, enabled = true }: UseGlobalKeyboardOptions) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check for Cmd (Mac) or Ctrl (Windows/Linux) + K
    const isCmdOrCtrl = event.metaKey || event.ctrlKey
    const isKKey = event.key === 'k' || event.key === 'K'

    if (isCmdOrCtrl && isKKey) {
      // Prevent default browser behavior (e.g., Chrome's search bar)
      event.preventDefault()
      event.stopPropagation()

      // Execute callback
      onShortcut()
    }
  }, [onShortcut])

  useEffect(() => {
    if (!enabled) return

    // Add global event listener
    document.addEventListener('keydown', handleKeyDown, true)

    // Cleanup on unmount
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  }, [enabled, handleKeyDown])
}

export default useGlobalKeyboard
