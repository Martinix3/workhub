import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SidePanel } from './SidePanel'

describe('SidePanel', () => {
  let triggerButton: HTMLButtonElement

  beforeEach(() => {
    // Create a trigger button to test focus restoration
    triggerButton = document.createElement('button')
    triggerButton.id = 'trigger-btn'
    triggerButton.textContent = 'Open Panel'
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
        <SidePanel isOpen={false} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      expect(container.firstChild).toBeNull()
    })

    it('should render when isOpen is true', () => {
      const mockOnClose = vi.fn()
      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Test Panel')).toBeInTheDocument()
      expect(screen.getByText('Panel content')).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      const mockOnClose = vi.fn()
      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')

      const titleId = dialog.getAttribute('aria-labelledby')
      expect(titleId).toBeTruthy()
      expect(document.getElementById(titleId!)).toHaveTextContent('Test Panel')
    })

    it('should not have aria-labelledby when title is not provided', () => {
      const mockOnClose = vi.fn()
      render(
        <SidePanel isOpen={true} onClose={mockOnClose}>
          <div>Panel content</div>
        </SidePanel>
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).not.toHaveAttribute('aria-labelledby')
    })

    it('should have focusable close button with aria-label', () => {
      const mockOnClose = vi.fn()
      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      const closeButton = screen.getByRole('button', { name: /close panel/i })
      expect(closeButton).toBeInTheDocument()
      expect(closeButton).toHaveAttribute('aria-label', 'Close panel')
    })

    it('should set body overflow hidden when open', () => {
      const mockOnClose = vi.fn()
      const { unmount } = render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      expect(document.body.style.overflow).toBe('hidden')

      unmount()
      expect(document.body.style.overflow).toBe('')
    })

    it('should render with different widths', () => {
      const mockOnClose = vi.fn()
      const { rerender } = render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel" width="md">
          <div>Panel content</div>
        </SidePanel>
      )

      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveClass('w-full', 'sm:w-[500px]')

      rerender(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel" width="xl">
          <div>Panel content</div>
        </SidePanel>
      )
      expect(dialog).toHaveClass('w-full', 'sm:w-[700px]', 'lg:w-[800px]')
    })

    it('should render close button in header when title is provided', () => {
      const mockOnClose = vi.fn()
      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      const closeButton = screen.getByRole('button', { name: /close panel/i })
      const header = closeButton.closest('.border-b-2')
      expect(header).toBeInTheDocument()
      expect(header).toHaveTextContent('Test Panel')
    })

    it('should render floating close button when title is not provided', () => {
      const mockOnClose = vi.fn()
      render(
        <SidePanel isOpen={true} onClose={mockOnClose}>
          <div>Panel content</div>
        </SidePanel>
      )

      const closeButton = screen.getByRole('button', { name: /close panel/i })
      expect(closeButton).toHaveClass('absolute')
    })
  })

  describe('Focus trapping', () => {
    it('should trap focus within panel when open', async () => {
      // Focus trigger button first
      triggerButton.focus()
      expect(document.activeElement).toBe(triggerButton)

      const mockOnClose = vi.fn()
      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>
            <button id="panel-btn-1">Button 1</button>
            <input id="panel-input" type="text" placeholder="Input field" />
            <button id="panel-btn-2">Button 2</button>
          </div>
        </SidePanel>
      )

      // Wait for focus trap to activate
      await waitFor(() => {
        // Close button should be focused first (it's the first focusable element)
        const closeButton = screen.getByRole('button', { name: /close panel/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // External trigger button should not be focusable
      const panelButtons = screen.getAllByRole('button')
      const panelInputs = screen.getAllByRole('textbox')

      // All focusable elements should be within the panel
      panelButtons.forEach(button => {
        expect(screen.getByRole('dialog')).toContainElement(button)
      })
      panelInputs.forEach(input => {
        expect(screen.getByRole('dialog')).toContainElement(input)
      })
    })

    it('should cycle forward through panel elements only on Tab', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>
            <button id="panel-btn-1">Button 1</button>
            <input id="panel-input" type="text" placeholder="Input field" />
            <button id="panel-btn-2">Button 2</button>
          </div>
        </SidePanel>
      )

      await waitFor(() => {
        // Initial focus should be on close button
        const closeButton = screen.getByRole('button', { name: /close panel/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // Tab to next element
      await user.tab()
      const btn1 = document.getElementById('panel-btn-1')
      expect(document.activeElement).toBe(btn1)

      // Tab to next element
      await user.tab()
      const input = document.getElementById('panel-input')
      expect(document.activeElement).toBe(input)

      // Tab to next element
      await user.tab()
      const btn2 = document.getElementById('panel-btn-2')
      expect(document.activeElement).toBe(btn2)

      // Tab should wrap back to close button
      await user.tab()
      const closeButton = screen.getByRole('button', { name: /close panel/i })
      expect(document.activeElement).toBe(closeButton)
    })

    it('should cycle backward through panel elements on Shift+Tab', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>
            <button id="panel-btn-1">Button 1</button>
            <button id="panel-btn-2">Button 2</button>
          </div>
        </SidePanel>
      )

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close panel/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // Shift+Tab should wrap to last element
      await user.tab({ shift: true })
      const btn2 = document.getElementById('panel-btn-2')
      expect(document.activeElement).toBe(btn2)

      // Shift+Tab to previous element
      await user.tab({ shift: true })
      const btn1 = document.getElementById('panel-btn-1')
      expect(document.activeElement).toBe(btn1)

      // Shift+Tab should wrap back to close button
      await user.tab({ shift: true })
      const closeButton = screen.getByRole('button', { name: /close panel/i })
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
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>
            <button id="panel-btn">Panel Button</button>
          </div>
        </SidePanel>
      )

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close panel/i })
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

      // Focus should be moved back to panel elements
      await waitFor(() => {
        const panelButton = document.getElementById('panel-btn')
        const closeButton = screen.getByRole('button', { name: /close panel/i })
        const focusedElement = document.activeElement

        expect(
          focusedElement === panelButton || focusedElement === closeButton
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
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>
            <button>Panel Button</button>
          </div>
        </SidePanel>
      )

      await waitFor(() => {
        // Focus should be in panel
        expect(document.activeElement).not.toBe(triggerButton)
      })

      // Close panel
      rerender(
        <SidePanel isOpen={false} onClose={mockOnClose} title="Test Panel">
          <div>
            <button>Panel Button</button>
          </div>
        </SidePanel>
      )

      // Focus should be restored to trigger button
      await waitFor(() => {
        expect(document.activeElement).toBe(triggerButton)
      })
    })
  })

  describe('Keyboard interactions', () => {
    it('should close panel on Escape key', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
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
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      // Press Escape multiple times
      await user.keyboard('{Escape}')
      await user.keyboard('{Escape}')
      await user.keyboard('{Escape}')

      expect(mockOnClose).toHaveBeenCalledTimes(3)
    })
  })

  describe('Mouse interactions', () => {
    it('should close panel when clicking overlay', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      // Click the overlay (the black background)
      const overlay = document.querySelector('.absolute.inset-0.bg-black\\/50') as HTMLElement
      expect(overlay).toBeInTheDocument()

      await user.click(overlay)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not close panel when clicking panel content', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      // Click the panel content
      const panelContent = screen.getByText('Panel content')
      await user.click(panelContent)

      expect(mockOnClose).not.toHaveBeenCalled()
    })

    it('should close panel when clicking close button', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      const closeButton = screen.getByRole('button', { name: /close panel/i })
      await user.click(closeButton)

      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Edge cases', () => {
    it('should handle panel with no focusable elements', async () => {
      const mockOnClose = vi.fn()

      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Just text content with no focusable elements</div>
        </SidePanel>
      )

      await waitFor(() => {
        // Close button should still be focused
        const closeButton = screen.getByRole('button', { name: /close panel/i })
        expect(document.activeElement).toBe(closeButton)
      })
    })

    it('should handle panel with disabled elements', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>
            <button id="enabled-btn">Enabled Button</button>
            <button id="disabled-btn" disabled>Disabled Button</button>
            <button id="another-btn">Another Button</button>
          </div>
        </SidePanel>
      )

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close panel/i })
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
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Close
      rerender(
        <SidePanel isOpen={false} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

      // Open again
      rerender(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      expect(screen.getByRole('dialog')).toBeInTheDocument()

      // Close again
      rerender(
        <SidePanel isOpen={false} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
      )

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should cleanup event listeners on unmount', () => {
      const mockOnClose = vi.fn()
      const { unmount } = render(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>Panel content</div>
        </SidePanel>
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
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>
            <button id="btn-1">Button 1</button>
          </div>
        </SidePanel>
      )

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close panel/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // Add more content
      rerender(
        <SidePanel isOpen={true} onClose={mockOnClose} title="Test Panel">
          <div>
            <button id="btn-1">Button 1</button>
            <button id="btn-2">Button 2</button>
            <button id="btn-3">Button 3</button>
          </div>
        </SidePanel>
      )

      // Tab through all elements to ensure they're all included in focus trap
      await user.tab()
      expect(document.activeElement).toBe(document.getElementById('btn-1'))

      await user.tab()
      expect(document.activeElement).toBe(document.getElementById('btn-2'))

      await user.tab()
      expect(document.activeElement).toBe(document.getElementById('btn-3'))
    })

    it('should handle panel without title', async () => {
      const user = userEvent.setup()
      const mockOnClose = vi.fn()

      render(
        <SidePanel isOpen={true} onClose={mockOnClose}>
          <div>
            <button id="panel-btn">Panel Button</button>
          </div>
        </SidePanel>
      )

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close panel/i })
        expect(document.activeElement).toBe(closeButton)
      })

      // Tab to panel button
      await user.tab()
      const panelBtn = document.getElementById('panel-btn')
      expect(document.activeElement).toBe(panelBtn)

      // Tab should wrap back to close button
      await user.tab()
      const closeButton = screen.getByRole('button', { name: /close panel/i })
      expect(document.activeElement).toBe(closeButton)
    })
  })
})
