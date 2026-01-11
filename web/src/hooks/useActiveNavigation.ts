// Hook to compute active navigation states based on current route
import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import type { NavigationSection, NavigationItem } from '../components/shell/types'

/**
 * Hook to compute active navigation states based on current route
 *
 * Handles:
 * - Exact match for root path (/)
 * - Prefix match for nested routes (/ventas matches /ventas/pipeline)
 * - Section-level and item-level active states
 *
 * @param sections - Navigation sections to process
 * @returns Navigation sections with computed isActive states
 */
export function useActiveNavigation(sections: NavigationSection[]): NavigationSection[] {
  const location = useLocation()
  const currentPath = location.pathname

  return useMemo(() => {
    return sections.map(section => {
      // For sections with direct href (no children)
      if (section.href && !section.items) {
        const isActive = isPathActive(currentPath, section.href)
        return { ...section, isActive }
      }

      // For sections with items (expandable)
      if (section.items) {
        const itemsWithActive = section.items.map(item => ({
          ...item,
          isActive: isPathActive(currentPath, item.href)
        }))

        // Section is active if any of its items are active
        const sectionIsActive = itemsWithActive.some(item => item.isActive)

        return {
          ...section,
          items: itemsWithActive,
          isActive: sectionIsActive
        }
      }

      // Default: no change
      return section
    })
  }, [sections, currentPath])
}

/**
 * Check if a path is active based on current location
 *
 * - Root path (/): Only exact match
 * - Other paths: Prefix match (e.g., /ventas matches /ventas/pipeline)
 */
function isPathActive(currentPath: string, targetPath: string): boolean {
  // Exact match for root path
  if (targetPath === '/') {
    return currentPath === '/'
  }

  // Prefix match for all other paths
  // /ventas matches /ventas, /ventas/, /ventas/pipeline
  return currentPath === targetPath || currentPath.startsWith(targetPath + '/')
}
