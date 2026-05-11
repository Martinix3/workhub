import { useEffect, useRef, type RefObject } from 'react'

/**
 * Hook to trap focus within a container element
 * Useful for accessible modals and dialogs (WCAG 2.1 AA requirement)
 *
 * @param containerRef - Ref to the container element
 * @param isActive - Whether the focus trap is active
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean
) {
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!isActive || !containerRef.current) return

    // Store the previously focused element to restore later
    previousActiveElement.current = document.activeElement as HTMLElement

    const container = containerRef.current

    // Selector for all focusable elements
    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(', ')

    /**
     * Get all currently focusable elements in the container
     */
    const getFocusableElements = (): HTMLElement[] => {
      const elements = container.querySelectorAll<HTMLElement>(focusableSelector)
      return Array.from(elements).filter(el => {
        // Filter out elements that are not visible or are aria-hidden
        return el.offsetParent !== null &&
               el.getAttribute('aria-hidden') !== 'true'
      })
    }

    /**
     * Handle keyboard events to trap focus
     */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const focusableElements = getFocusableElements()

      if (focusableElements.length === 0) {
        // If no focusable elements, prevent default tab behavior
        e.preventDefault()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      const currentElement = document.activeElement as HTMLElement

      if (e.shiftKey) {
        // Shift+Tab: Moving backwards
        if (currentElement === firstElement || !container.contains(currentElement)) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab: Moving forwards
        if (currentElement === lastElement || !container.contains(currentElement)) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Set initial focus on first focusable element
    const focusableElements = getFocusableElements()
    if (focusableElements.length > 0) {
      // Small delay to ensure the container is fully rendered
      setTimeout(() => {
        focusableElements[0].focus()
      }, 0)
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown)

    // Cleanup function
    return () => {
      document.removeEventListener('keydown', handleKeyDown)

      // Restore focus to the previously focused element
      if (previousActiveElement.current && document.body.contains(previousActiveElement.current)) {
        previousActiveElement.current.focus()
      }
    }
  }, [isActive, containerRef])
}
