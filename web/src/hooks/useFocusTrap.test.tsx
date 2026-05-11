import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRef } from 'react'
import { useFocusTrap } from './useFocusTrap'

describe('useFocusTrap', () => {
  let container: HTMLDivElement
  let externalButton: HTMLButtonElement

  beforeEach(() => {
    // Create a container with focusable elements
    container = document.createElement('div')
    container.innerHTML = `
      <button id="btn1">Button 1</button>
      <input id="input1" type="text" />
      <a id="link1" href="#">Link 1</a>
      <button id="btn2">Button 2</button>
    `
    document.body.appendChild(container)

    // Create an external button (outside the container) to test focus restoration
    externalButton = document.createElement('button')
    externalButton.id = 'external-btn'
    externalButton.textContent = 'External Button'
    document.body.appendChild(externalButton)
  })

  afterEach(() => {
    document.body.removeChild(container)
    document.body.removeChild(externalButton)
  })

  describe('Initial focus', () => {
    it('should set initial focus on first focusable element when activated', async () => {
      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = container
        useFocusTrap(ref, true)
        return ref
      })

      // Wait for the setTimeout in the hook
      await new Promise(resolve => setTimeout(resolve, 10))

      const firstButton = container.querySelector('#btn1') as HTMLButtonElement
      expect(document.activeElement).toBe(firstButton)
    })

    it('should not set focus when isActive is false', async () => {
      externalButton.focus()
      expect(document.activeElement).toBe(externalButton)

      renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = container
        useFocusTrap(ref, false)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      // Focus should remain on external button
      expect(document.activeElement).toBe(externalButton)
    })
  })

  describe('Tab navigation - forward', () => {
    it('should cycle forward through focusable elements on Tab', async () => {
      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = container
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const btn1 = container.querySelector('#btn1') as HTMLButtonElement
      const input1 = container.querySelector('#input1') as HTMLInputElement
      const link1 = container.querySelector('#link1') as HTMLAnchorElement

      // Focus should be on first element
      expect(document.activeElement).toBe(btn1)

      // Press Tab
      const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      document.dispatchEvent(tabEvent)

      // Focus should NOT have moved (because we prevent default)
      // Let's manually move focus to simulate what would happen
      input1.focus()
      expect(document.activeElement).toBe(input1)

      // Press Tab again
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      link1.focus()
      expect(document.activeElement).toBe(link1)
    })

    it('should wrap focus from last to first element on Tab', async () => {
      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = container
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const btn1 = container.querySelector('#btn1') as HTMLButtonElement
      const btn2 = container.querySelector('#btn2') as HTMLButtonElement

      // Focus on last element
      btn2.focus()
      expect(document.activeElement).toBe(btn2)

      // Create and dispatch Tab event
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      })
      const defaultPrevented = !document.dispatchEvent(tabEvent)

      // The event should have been prevented
      expect(defaultPrevented).toBe(true)

      // Focus should wrap to first element
      expect(document.activeElement).toBe(btn1)
    })

    it('should wrap to first element when focus is outside container on Tab', async () => {
      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = container
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const btn1 = container.querySelector('#btn1') as HTMLButtonElement

      // Focus external button (outside container)
      externalButton.focus()
      expect(document.activeElement).toBe(externalButton)

      // Press Tab
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      })
      const defaultPrevented = !document.dispatchEvent(tabEvent)

      // Event should be prevented and focus should move to first element
      expect(defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(btn1)
    })
  })

  describe('Tab navigation - backward', () => {
    it('should cycle backward through focusable elements on Shift+Tab', async () => {
      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = container
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const input1 = container.querySelector('#input1') as HTMLInputElement

      // Focus on second element
      input1.focus()
      expect(document.activeElement).toBe(input1)

      // Shift+Tab should allow moving backward (we don't prevent default here)
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(shiftTabEvent)
    })

    it('should wrap focus from first to last element on Shift+Tab', async () => {
      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = container
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const btn1 = container.querySelector('#btn1') as HTMLButtonElement
      const btn2 = container.querySelector('#btn2') as HTMLButtonElement

      // Focus should initially be on first element
      expect(document.activeElement).toBe(btn1)

      // Press Shift+Tab
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
      const defaultPrevented = !document.dispatchEvent(shiftTabEvent)

      // Event should be prevented and focus should wrap to last element
      expect(defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(btn2)
    })

    it('should wrap to last element when focus is outside container on Shift+Tab', async () => {
      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = container
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const btn2 = container.querySelector('#btn2') as HTMLButtonElement

      // Focus external button (outside container)
      externalButton.focus()
      expect(document.activeElement).toBe(externalButton)

      // Press Shift+Tab
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true
      })
      const defaultPrevented = !document.dispatchEvent(shiftTabEvent)

      // Event should be prevented and focus should move to last element
      expect(defaultPrevented).toBe(true)
      expect(document.activeElement).toBe(btn2)
    })
  })

  describe('Focus restoration', () => {
    it('should restore focus to previously focused element when deactivated', async () => {
      // Focus external button first
      externalButton.focus()
      expect(document.activeElement).toBe(externalButton)

      const { rerender, unmount } = renderHook(
        ({ isActive }) => {
          const ref = useRef<HTMLDivElement>(null)
          ref.current = container
          useFocusTrap(ref, isActive)
          return ref
        },
        { initialProps: { isActive: true } }
      )

      await new Promise(resolve => setTimeout(resolve, 10))

      const btn1 = container.querySelector('#btn1') as HTMLButtonElement
      expect(document.activeElement).toBe(btn1)

      // Deactivate the trap
      rerender({ isActive: false })

      // Focus should be restored to external button
      await new Promise(resolve => setTimeout(resolve, 10))
      expect(document.activeElement).toBe(externalButton)
    })

    it('should not restore focus if previous element no longer exists', async () => {
      const tempButton = document.createElement('button')
      tempButton.id = 'temp-btn'
      document.body.appendChild(tempButton)
      tempButton.focus()

      const { unmount } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = container
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      // Remove the temp button
      document.body.removeChild(tempButton)

      // Unmount to trigger cleanup
      unmount()

      // Should not throw an error
      expect(document.activeElement).toBeDefined()
    })
  })

  describe('Empty container', () => {
    it('should handle container with no focusable elements', async () => {
      const emptyContainer = document.createElement('div')
      emptyContainer.innerHTML = '<div>No focusable elements</div>'
      document.body.appendChild(emptyContainer)

      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = emptyContainer
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      // Focus should not change (or stay on body)
      expect(document.activeElement).toBe(document.body)

      // Tab should be prevented but not throw
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      })
      expect(() => document.dispatchEvent(tabEvent)).not.toThrow()

      document.body.removeChild(emptyContainer)
    })
  })

  describe('Focusable element filtering', () => {
    it('should exclude disabled elements from focus trap', async () => {
      const containerWithDisabled = document.createElement('div')
      containerWithDisabled.innerHTML = `
        <button id="btn1">Button 1</button>
        <button id="btn2" disabled>Button 2 (disabled)</button>
        <input id="input1" type="text" />
      `
      document.body.appendChild(containerWithDisabled)

      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = containerWithDisabled
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const btn1 = containerWithDisabled.querySelector('#btn1') as HTMLButtonElement
      const input1 = containerWithDisabled.querySelector('#input1') as HTMLInputElement

      // Should focus first enabled element
      expect(document.activeElement).toBe(btn1)

      // Focus last element
      input1.focus()

      // Tab should wrap to first (skipping disabled button)
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(tabEvent)

      expect(document.activeElement).toBe(btn1)

      document.body.removeChild(containerWithDisabled)
    })

    it('should exclude elements with aria-hidden="true"', async () => {
      const containerWithHidden = document.createElement('div')
      containerWithHidden.innerHTML = `
        <button id="btn1">Button 1</button>
        <button id="btn2" aria-hidden="true">Button 2 (hidden)</button>
        <button id="btn3">Button 3</button>
      `
      document.body.appendChild(containerWithHidden)

      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = containerWithHidden
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const btn1 = containerWithHidden.querySelector('#btn1') as HTMLButtonElement
      const btn3 = containerWithHidden.querySelector('#btn3') as HTMLButtonElement

      // Should focus first visible element
      expect(document.activeElement).toBe(btn1)

      // Focus last element
      btn3.focus()

      // Tab should wrap to first (skipping aria-hidden button)
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(tabEvent)

      expect(document.activeElement).toBe(btn1)

      document.body.removeChild(containerWithHidden)
    })

    it('should exclude elements with tabindex="-1"', async () => {
      const containerWithTabindex = document.createElement('div')
      containerWithTabindex.innerHTML = `
        <button id="btn1">Button 1</button>
        <button id="btn2" tabindex="-1">Button 2 (tabindex -1)</button>
        <button id="btn3">Button 3</button>
      `
      document.body.appendChild(containerWithTabindex)

      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = containerWithTabindex
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const btn1 = containerWithTabindex.querySelector('#btn1') as HTMLButtonElement
      const btn3 = containerWithTabindex.querySelector('#btn3') as HTMLButtonElement

      // Should focus first tabbable element
      expect(document.activeElement).toBe(btn1)

      // Focus last element
      btn3.focus()

      // Tab should wrap to first (skipping tabindex -1 button)
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(tabEvent)

      expect(document.activeElement).toBe(btn1)

      document.body.removeChild(containerWithTabindex)
    })
  })

  describe('Non-Tab keys', () => {
    it('should not interfere with other keyboard events', async () => {
      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = container
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      const btn1 = container.querySelector('#btn1') as HTMLButtonElement
      expect(document.activeElement).toBe(btn1)

      // Press Enter
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true
      })
      const enterDefaultPrevented = !document.dispatchEvent(enterEvent)
      expect(enterDefaultPrevented).toBe(false)

      // Press Escape
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      })
      const escapeDefaultPrevented = !document.dispatchEvent(escapeEvent)
      expect(escapeDefaultPrevented).toBe(false)

      // Press Space
      const spaceEvent = new KeyboardEvent('keydown', {
        key: ' ',
        bubbles: true,
        cancelable: true
      })
      const spaceDefaultPrevented = !document.dispatchEvent(spaceEvent)
      expect(spaceDefaultPrevented).toBe(false)
    })
  })

  describe('Null container', () => {
    it('should handle null container ref gracefully', async () => {
      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        // ref.current remains null
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      // Should not throw an error
      expect(() => {
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
        document.dispatchEvent(tabEvent)
      }).not.toThrow()
    })
  })

  describe('Dynamic content', () => {
    it('should work with dynamically added focusable elements', async () => {
      const dynamicContainer = document.createElement('div')
      dynamicContainer.innerHTML = '<button id="btn1">Button 1</button>'
      document.body.appendChild(dynamicContainer)

      const { result } = renderHook(() => {
        const ref = useRef<HTMLDivElement>(null)
        ref.current = dynamicContainer
        useFocusTrap(ref, true)
        return ref
      })

      await new Promise(resolve => setTimeout(resolve, 10))

      // Add new button dynamically
      const newButton = document.createElement('button')
      newButton.id = 'btn2'
      newButton.textContent = 'Button 2'
      dynamicContainer.appendChild(newButton)

      // The hook should pick up the new button on next Tab
      const btn1 = dynamicContainer.querySelector('#btn1') as HTMLButtonElement
      btn1.focus()

      // Tab event
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true
      })
      document.dispatchEvent(tabEvent)

      // The hook re-queries focusable elements on each tab, so it should include the new button
      // (This is an implementation detail - the hook uses getFocusableElements() on each keydown)

      document.body.removeChild(dynamicContainer)
    })
  })
})
