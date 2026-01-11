import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom'
import { useActiveNavigation } from './useActiveNavigation'
import type { NavigationSection } from '../components/shell/types'

/**
 * Helper to render hook with router at specific path
 */
function renderWithRouter(
  hook: () => NavigationSection[],
  initialPath: string
) {
  return renderHook(hook, {
    wrapper: ({ children }) => (
      <MemoryRouter initialEntries={[initialPath]}>
        {children}
      </MemoryRouter>
    ),
  })
}

describe('useActiveNavigation', () => {
  describe('exact match for root path', () => {
    it('should mark root section as active when on / route', () => {
      const sections: NavigationSection[] = [
        { label: 'Home', href: '/' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/'
      )

      expect(result.current[0].isActive).toBe(true)
    })

    it('should NOT mark root section as active when on nested route', () => {
      const sections: NavigationSection[] = [
        { label: 'Home', href: '/' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas'
      )

      expect(result.current[0].isActive).toBe(false)
    })

    it('should NOT mark root section as active when on /ventas/pipeline', () => {
      const sections: NavigationSection[] = [
        { label: 'Home', href: '/' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas/pipeline'
      )

      expect(result.current[0].isActive).toBe(false)
    })
  })

  describe('prefix match for nested routes', () => {
    it('should mark section active for exact path match', () => {
      const sections: NavigationSection[] = [
        { label: 'Ventas', href: '/ventas' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas'
      )

      expect(result.current[0].isActive).toBe(true)
    })

    it('should mark section active for nested path with /', () => {
      const sections: NavigationSection[] = [
        { label: 'Ventas', href: '/ventas' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas/pipeline'
      )

      expect(result.current[0].isActive).toBe(true)
    })

    it('should mark section active for deeply nested paths', () => {
      const sections: NavigationSection[] = [
        { label: 'Ventas', href: '/ventas' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas/pipeline/deals/123'
      )

      expect(result.current[0].isActive).toBe(true)
    })

    it('should NOT match partial path without /', () => {
      const sections: NavigationSection[] = [
        { label: 'Ventas', href: '/ven' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas'
      )

      // /ven should not match /ventas (no trailing /)
      expect(result.current[0].isActive).toBe(false)
    })
  })

  describe('unrelated routes', () => {
    it('should NOT mark section active for unrelated path', () => {
      const sections: NavigationSection[] = [
        { label: 'Ventas', href: '/ventas' },
        { label: 'Marketing', href: '/marketing' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/produccion'
      )

      expect(result.current[0].isActive).toBe(false)
      expect(result.current[1].isActive).toBe(false)
    })

    it('should only mark the correct section active among multiple', () => {
      const sections: NavigationSection[] = [
        { label: 'Ventas', href: '/ventas' },
        { label: 'Marketing', href: '/marketing' },
        { label: 'Produccion', href: '/produccion' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/marketing/campaigns'
      )

      expect(result.current[0].isActive).toBe(false)
      expect(result.current[1].isActive).toBe(true)
      expect(result.current[2].isActive).toBe(false)
    })
  })

  describe('sections without items (single nav items)', () => {
    it('should handle sections with only href (no items)', () => {
      const sections: NavigationSection[] = [
        { label: 'Command Center', href: '/' },
        { label: 'Distribuidores', href: '/distribuidores' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/distribuidores'
      )

      expect(result.current[0].isActive).toBe(false)
      expect(result.current[1].isActive).toBe(true)
    })

    it('should compute active states independently for each section without items', () => {
      const sections: NavigationSection[] = [
        { label: 'Page 1', href: '/page1' },
        { label: 'Page 2', href: '/page2' },
        { label: 'Page 3', href: '/page3' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/page2/details'
      )

      expect(result.current[0].isActive).toBe(false)
      expect(result.current[1].isActive).toBe(true)
      expect(result.current[2].isActive).toBe(false)
    })
  })

  describe('sections with items (expandable sections)', () => {
    it('should mark item active and section active when on item path', () => {
      const sections: NavigationSection[] = [
        {
          label: 'Ventas',
          items: [
            { label: 'Dashboard', href: '/ventas' },
            { label: 'Pipeline', href: '/ventas/pipeline' },
          ],
        },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas/pipeline'
      )

      expect(result.current[0].isActive).toBe(true)
      expect(result.current[0].items?.[0].isActive).toBe(false)
      expect(result.current[0].items?.[1].isActive).toBe(true)
    })

    it('should mark section active when any child item is active', () => {
      const sections: NavigationSection[] = [
        {
          label: 'Ventas',
          items: [
            { label: 'Dashboard', href: '/ventas' },
            { label: 'Pipeline', href: '/ventas/pipeline' },
            { label: 'Clientes', href: '/ventas/clientes' },
          ],
        },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas'
      )

      expect(result.current[0].isActive).toBe(true)
      expect(result.current[0].items?.[0].isActive).toBe(true)
      expect(result.current[0].items?.[1].isActive).toBe(false)
      expect(result.current[0].items?.[2].isActive).toBe(false)
    })

    it('should NOT mark section active if no children are active', () => {
      const sections: NavigationSection[] = [
        {
          label: 'Ventas',
          items: [
            { label: 'Dashboard', href: '/ventas' },
            { label: 'Pipeline', href: '/ventas/pipeline' },
          ],
        },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/marketing'
      )

      expect(result.current[0].isActive).toBe(false)
      expect(result.current[0].items?.[0].isActive).toBe(false)
      expect(result.current[0].items?.[1].isActive).toBe(false)
    })

    it('should handle nested route activation correctly', () => {
      const sections: NavigationSection[] = [
        {
          label: 'Ventas',
          items: [
            { label: 'Dashboard', href: '/ventas' },
            { label: 'Pipeline', href: '/ventas/pipeline' },
          ],
        },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas/pipeline/deals/123'
      )

      // Section should be active because Pipeline item is active
      expect(result.current[0].isActive).toBe(true)
      // Dashboard should not be active (doesn't match deeply nested path)
      expect(result.current[0].items?.[0].isActive).toBe(false)
      // Pipeline should be active (prefix match)
      expect(result.current[0].items?.[1].isActive).toBe(true)
    })

    it('should handle multiple sections with items correctly', () => {
      const sections: NavigationSection[] = [
        {
          label: 'Ventas',
          items: [
            { label: 'Dashboard', href: '/ventas' },
            { label: 'Pipeline', href: '/ventas/pipeline' },
          ],
        },
        {
          label: 'Marketing',
          items: [
            { label: 'Campaigns', href: '/marketing/campaigns' },
            { label: 'Analytics', href: '/marketing/analytics' },
          ],
        },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/marketing/campaigns'
      )

      // Ventas section should not be active
      expect(result.current[0].isActive).toBe(false)
      expect(result.current[0].items?.[0].isActive).toBe(false)
      expect(result.current[0].items?.[1].isActive).toBe(false)

      // Marketing section should be active
      expect(result.current[1].isActive).toBe(true)
      expect(result.current[1].items?.[0].isActive).toBe(true)
      expect(result.current[1].items?.[1].isActive).toBe(false)
    })
  })

  describe('mixed navigation structure', () => {
    it('should handle combination of sections with and without items', () => {
      const sections: NavigationSection[] = [
        { label: 'Home', href: '/' },
        {
          label: 'Ventas',
          items: [
            { label: 'Dashboard', href: '/ventas' },
            { label: 'Pipeline', href: '/ventas/pipeline' },
          ],
        },
        { label: 'Distribuidores', href: '/distribuidores' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas/pipeline'
      )

      expect(result.current[0].isActive).toBe(false)
      expect(result.current[1].isActive).toBe(true)
      expect(result.current[1].items?.[0].isActive).toBe(false)
      expect(result.current[1].items?.[1].isActive).toBe(true)
      expect(result.current[2].isActive).toBe(false)
    })

    it('should handle root path with mixed structure', () => {
      const sections: NavigationSection[] = [
        { label: 'Command Center', href: '/' },
        {
          label: 'Ventas',
          items: [
            { label: 'Dashboard', href: '/ventas' },
            { label: 'Pipeline', href: '/ventas/pipeline' },
          ],
        },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/'
      )

      expect(result.current[0].isActive).toBe(true)
      expect(result.current[1].isActive).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle empty sections array', () => {
      const sections: NavigationSection[] = []

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/any-path'
      )

      expect(result.current).toEqual([])
    })

    it('should handle section with empty items array', () => {
      const sections: NavigationSection[] = [
        { label: 'Empty Section', items: [] },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/any-path'
      )

      expect(result.current[0].isActive).toBe(false)
      expect(result.current[0].items).toEqual([])
    })

    it('should handle section without href or items', () => {
      const sections: NavigationSection[] = [
        { label: 'No Link Section' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/any-path'
      )

      expect(result.current[0].isActive).toBeUndefined()
      expect(result.current[0].label).toBe('No Link Section')
    })

    it('should preserve original section data', () => {
      const sections: NavigationSection[] = [
        {
          label: 'Ventas',
          icon: 'IconVentas' as any,
          items: [
            { label: 'Dashboard', href: '/ventas' },
          ],
        },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas'
      )

      expect(result.current[0].label).toBe('Ventas')
      expect(result.current[0].icon).toBe('IconVentas')
      expect(result.current[0].items?.[0].label).toBe('Dashboard')
    })

    it('should return new array reference (immutability)', () => {
      const sections: NavigationSection[] = [
        { label: 'Home', href: '/' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/'
      )

      expect(result.current).not.toBe(sections)
      expect(result.current[0]).not.toBe(sections[0])
    })

    it('should handle paths with trailing slashes', () => {
      const sections: NavigationSection[] = [
        { label: 'Ventas', href: '/ventas' },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas/'
      )

      // /ventas/ should activate /ventas section
      expect(result.current[0].isActive).toBe(true)
    })

    it('should handle paths with query parameters', () => {
      const sections: NavigationSection[] = [
        {
          label: 'Ventas',
          items: [
            { label: 'Pipeline', href: '/ventas/pipeline' },
          ],
        },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas/pipeline?filter=open'
      )

      expect(result.current[0].isActive).toBe(true)
      expect(result.current[0].items?.[0].isActive).toBe(true)
    })

    it('should handle paths with hash fragments', () => {
      const sections: NavigationSection[] = [
        {
          label: 'Ventas',
          items: [
            { label: 'Pipeline', href: '/ventas/pipeline' },
          ],
        },
      ]

      const { result } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/ventas/pipeline#section'
      )

      expect(result.current[0].isActive).toBe(true)
      expect(result.current[0].items?.[0].isActive).toBe(true)
    })
  })

  describe('memoization', () => {
    it('should return same reference when pathname has not changed', () => {
      const sections: NavigationSection[] = [
        { label: 'Home', href: '/' },
      ]

      const { result, rerender } = renderWithRouter(
        () => useActiveNavigation(sections),
        '/'
      )

      const firstResult = result.current
      rerender()
      const secondResult = result.current

      expect(secondResult).toBe(firstResult)
    })
  })
})
