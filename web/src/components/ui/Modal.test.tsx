import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'

describe('Modal', () => {
  let triggerButton: HTMLButtonElement

  beforeEach(() => {
    // Create a trigger button to test focus restoration
    triggerButton = document.createElement('button')
    triggerButton.id = 'trigger-btn'
    triggerButton.textContent = 'Open Modal'
    document.body.appendChild(triggerButton)
  })

  afterEach(() => {
    document.body.removeChild(triggerButton)
    // Reset body overflow
    document.body.style.overflow = ''
  })

  describe('Rendering and accessibility', () => {
    it('should not render when isOpen is false', () => {
      const mockOnClose = vi.fn()
      const { container } = render(
        <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render when isOpen is true', () => {
      const mockOnClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Test Modal')).toBeInTheDocument()
      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      const mockOnClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')

      const titleId = dialog.getAttribute('aria-labelledby')
      expect(titleId).toBeTruthy()
      expect(document.getElementById(titleId!)).toHaveTextContent('Test Modal')
    })

    it('should have focusable close button with aria-label', () => {
      const mockOnClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      const closeButton = screen.getByRole('button', { name: /close modal/i })
      expect(closeButton).toBeInTheDocument()
      expect(closeButton).toHaveAttribute('aria-label', 'Close modal')
    })

    it('should set body overflow hidden when open', () => {
      const mockOnClose = vi.fn()
      const { unmount } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      expect(document.body.style.overflow).toBe('hidden')

      unmount()
      expect(document.body.style.overflow).toBe('')
    })

    it('should render with different sizes', () => {
      const mockOnClose = vi.fn()
      const { container, rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" size="sm">
          <div>Modal content</div>
        </Modal>
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('max-w-md')

      rerender(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" size="xl">
          <div>Modal content</div>
        </Modal>
      )
      expect(dialog).toHaveClass('max-w-4xl')
    })

    it('should render progress bar when progress prop is provided', () => {
      const mockOnClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal" progress={50}>
          <div>Modal content</div>
        </Modal>
      )

      // Check that the progress bar container exists
      const progressBar = document.querySelector('.h-full.bg-amber-400')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveStyle({ width: '50%' })
    })
  })

  describe('Focus trapping', () => {
    it('should trap focus within modal when open', async () => {
      // Focus trigger button first
      triggerButton.focus()
      expect(document.activeElement).toBe(triggerButton)

      const mockOnClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>
            <button id="modal-btn-1">Button 1</button>
            <input id="modal-input" type="text" placeholder="Input field" />
            <button id="modal-btn-2">Button 2</button>
          </div>
        </Modal>
      )

      // Wait for focus trap to activate
      await waitFor(() => {
        // Close button should be focused first (it's the first focusable element)
        const closeButton = screen.getByRole('button', { name: /close modal/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // External trigger button should not be focusable
      const modalButtons = screen.getAllByRole('button')
      const modalInputs = screen.getAllByRole('textbox')

      // All focusable elements should be within the modal
      modalButtons.forEach(button => {
        expect(screen.getByRole('dialog')).toContainElement(button)
      })
      modalInputs.forEach(input => {
        expect(screen.getByRole('dialog')).toContainElement(input)
      })
    })

    it('should cycle forward through modal elements only on Tab', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>
            <button id="modal-btn-1">Button 1</button>
            <input id="modal-input" type="text" placeholder="Input field" />
            <button id="modal-btn-2">Button 2</button>
          </div>
        </Modal>
      )

      await waitFor(() => {
        // Initial focus should be on close button
        const closeButton = screen.getByRole('button', { name: /close modal/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // Tab to next element
      await user.tab()
      const btn1 = document.getElementById('modal-btn-1')
      expect(document.activeElement).toBe(btn1)

      // Tab to next element
      await user.tab()
      const input = document.getElementById('modal-input')
      expect(document.activeElement).toBe(input)

      // Tab to next element
      await user.tab()
      const btn2 = document.getElementById('modal-btn-2')
      expect(document.activeElement).toBe(btn2)

      // Tab should wrap back to close button
      await user.tab()
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      expect(document.activeElement).toBe(closeButton)
    })

    it('should cycle backward through modal elements on Shift+Tab', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>
            <button id="modal-btn-1">Button 1</button>
            <button id="modal-btn-2">Button 2</button>
          </div>
        </Modal>
      )

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close modal/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // Shift+Tab should wrap to last element
      await user.tab({ shift: true })
      const btn2 = document.getElementById('modal-btn-2')
      expect(document.activeElement).toBe(btn2)

      // Shift+Tab to previous element
      await user.tab({ shift: true })
      const btn1 = document.getElementById('modal-btn-1')
      expect(document.activeElement).toBe(btn1)

      // Shift+Tab should wrap back to close button
      await user.tab({ shift: true })
      const closeButton = screen.getByRole('button', { name: /close modal/i })
      expect(document.activeElement).toBe(closeButton)
    })

    it('should not allow focus to escape to background elements', async () => {
      // Create background elements
      const backgroundButton = document.createElement('button')
      backgroundButton.id = 'background-btn'
      backgroundButton.textContent = 'Background Button'
      document.body.appendChild(backgroundButton)

      const mockOnClose = vi.fn()
      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>
            <button id="modal-btn">Modal Button</button>
          </div>
        </Modal>
      )

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close modal/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // Try to focus background button programmatically
      backgroundButton.focus()

      // Simulate Tab event to ensure focus trap catches it
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(tabEvent)

      // Focus should be moved back to modal elements
      await waitFor(() => {
        const modalButton = document.getElementById('modal-btn')
        const closeButton = screen.getByRole('button', { name: /close modal/i })
        const focusedElement = document.activeElement

        expect(
          focusedElement === modalButton || focusedElement === closeButton
        ).toBe(true)
      })

      document.body.removeChild(backgroundButton)
    })

    it('should restore focus to trigger element when closed', async () => {
      // Focus trigger button first
      triggerButton.focus()
      expect(document.activeElement).toBe(triggerButton)

      const mockOnClose = vi.fn()
      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>
            <button>Modal Button</button>
          </div>
        </Modal>
      )

      await waitFor(() => {
        // Focus should be in modal
        expect(document.activeElement).not.toBe(triggerButton)
      })

      // Close modal
      rerender(
        <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
          <div>
            <button>Modal Button</button>
          </div>
        </Modal>
      )

      // Focus should be restored to trigger button
      await waitFor(() => {
        expect(document.activeElement).toBe(triggerButton)
      })
    })
  })

  describe('Keyboard interactions', () => {
    it('should close modal on Escape key', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Press Escape
      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should handle multiple Escape presses', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      // Press Escape multiple times
      await user.keyboard('{Escape}')
      await user.keyboard('{Escape}')
      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalledTimes(3)
    })
  })

  describe('Mouse interactions', () => {
    it('should close modal when clicking overlay', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      // Click the overlay (the black background)
      const overlay = document.querySelector('.absolute.inset-0.bg-black\\/50') as HTMLElement
      expect(overlay).toBeInTheDocument()

      await user.click(overlay)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not close modal when clicking modal content', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      // Click the modal content
      const modalContent = screen.getByText('Modal content')
      await user.click(modalContent)

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should close modal when clicking close button', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      const closeButton = screen.getByRole('button', { name: /close modal/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge cases', () => {
    it('should handle modal with no focusable elements', async () => {
      const mockOnClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Just text content with no focusable elements</div>
        </Modal>
      )

      await waitFor(() => {
        // Close button should still be focused
        const closeButton = screen.getByRole('button', { name: /close modal/i })
        expect(document.activeElement).toBe(closeButton)
      })
    })

    it('should handle modal with disabled elements', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>
            <button id="enabled-btn">Enabled Button</button>
            <button id="disabled-btn" disabled>Disabled Button</button>
            <button id="another-btn">Another Button</button>
          </div>
        </Modal>
      )

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close modal/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // Tab through elements
      await user.tab()
      const enabledBtn = document.getElementById('enabled-btn')
      expect(document.activeElement).toBe(enabledBtn)

      // Tab should skip disabled button
      await user.tab()
      const anotherBtn = document.getElementById('another-btn')
      expect(document.activeElement).toBe(anotherBtn)
    })

    it('should handle rapid open/close cycles', async () => {
      const mockOnClose = vi.fn()
      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Close
      rerender(
        <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // Open again
      rerender(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Close again
      rerender(
        <Modal isOpen={false} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should cleanup event listeners on unmount', () => {
      const mockOnClose = vi.fn()
      const { unmount } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      )

      expect(document.body.style.overflow).toBe('hidden')

      unmount()

      // Body overflow should be reset
      expect(document.body.style.overflow).toBe('')

      // Escape key should not trigger onClose after unmount
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true
      })
      document.dispatchEvent(escapeEvent)

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should handle dynamic content updates', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      const { rerender } = render(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>
            <button id="btn-1">Button 1</button>
          </div>
        </Modal>
      )

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close modal/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // Add more content
      rerender(
        <Modal isOpen={true} onClose={mockOnClose} title="Test Modal">
          <div>
            <button id="btn-1">Button 1</button>
            <button id="btn-2">Button 2</button>
            <button id="btn-3">Button 3</button>
          </div>
        </Modal>
      )

      // Tab through all elements to ensure they're all included in focus trap
      await user.tab()
      expect(document.activeElement).toBe(document.getElementById('btn-1'))

      await user.tab()
      expect(document.activeElement).toBe(document.getElementById('btn-2'))

      await user.tab()
      expect(document.activeElement).toBe(document.getElementById('btn-3'))
    })
  })
})
