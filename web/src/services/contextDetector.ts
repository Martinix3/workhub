/**
 * Context Detector Service
 *
 * Analyzes current URL path to detect ERP document context for intelligent
 * WorkLink suggestions in the Quick Task Modal.
 *
 * Maps URL patterns to ERP doctypes (e.g., /ventas/pedidos -> Sales Order)
 */

export interface DetectedContext {
  doctype: string | null
  path: string
  section: string | null
}

/**
 * URL path to ERP DocType mapping
 * Based on WorkLink supported doctypes and app routing structure
 */
const PATH_TO_DOCTYPE_MAP: Record<string, string> = {
  // Sales (SELL IN)
  '/ventas/pedidos': 'Sales Order',
  '/ventas/pipeline': 'Opportunity',
  '/ventas/clientes': 'Customer',

  // Production
  '/produccion/lotes': 'Batch',
  '/produccion/haccp': 'Quality Inspection',

  // Marketing
  '/marketing': 'Campaign',

  // Note: Other paths like dashboards don't map to specific doctypes
  // They will return null doctype but still provide section context
}

/**
 * Extract section name from URL path
 * Examples:
 * - /ventas/pedidos -> SALES
 * - /produccion/lotes -> OPS
 * - /marketing -> MKT
 */
function extractSection(path: string): string | null {
  if (path.startsWith('/ventas')) return 'SALES'
  if (path.startsWith('/produccion')) return 'OPS'
  if (path.startsWith('/calidad')) return 'OPS'
  if (path.startsWith('/distribuidores')) return 'SALES'
  if (path.startsWith('/marketing')) return 'MKT'

  return null
}

/**
 * Detect ERP document context from current URL path
 *
 * @param pathname - Current window.location.pathname
 * @returns DetectedContext object with doctype, path, and section
 *
 * @example
 * ```ts
 * const context = detectContext('/ventas/pedidos')
 * // Returns: { doctype: 'Sales Order', path: '/ventas/pedidos', section: 'SALES' }
 * ```
 */
export function detectContext(pathname: string = window.location.pathname): DetectedContext {
  // Normalize path (remove trailing slash)
  const normalizedPath = pathname.endsWith('/') && pathname !== '/'
    ? pathname.slice(0, -1)
    : pathname

  // Try exact match first
  const doctype = PATH_TO_DOCTYPE_MAP[normalizedPath] || null

  // Extract section for department suggestion
  const section = extractSection(normalizedPath)

  return {
    doctype,
    path: normalizedPath,
    section
  }
}

/**
 * Check if current context is relevant for WorkLink suggestions
 * Returns true if we detected a specific doctype
 */
export function hasRelevantContext(context: DetectedContext): boolean {
  return context.doctype !== null
}

/**
 * Get suggested department based on detected section
 */
export function getSuggestedDepartment(context: DetectedContext): 'SALES' | 'OPS' | 'MKT' | null {
  return context.section as 'SALES' | 'OPS' | 'MKT' | null
}
