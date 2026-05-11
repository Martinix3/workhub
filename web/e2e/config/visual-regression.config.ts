/**
 * Visual Regression Testing Configuration
 *
 * Centralized configuration for visual regression tests including:
 * - Viewport definitions for responsive testing
 * - Screenshot comparison thresholds
 * - Browser-specific settings
 */

export interface Viewport {
  name: string
  width: number
  height: number
  category: 'mobile' | 'tablet' | 'desktop'
}

/**
 * Standard viewport definitions for responsive testing
 * Covers 9 viewport sizes across mobile, tablet, and desktop
 */
export const VIEWPORTS: Viewport[] = [
  // Mobile viewports (3 sizes)
  {
    name: 'mobile-small',
    width: 375,
    height: 667,
    category: 'mobile',
  },
  {
    name: 'mobile-medium',
    width: 390,
    height: 844,
    category: 'mobile',
  },
  {
    name: 'mobile-large',
    width: 414,
    height: 896,
    category: 'mobile',
  },
  // Tablet viewports (3 sizes)
  {
    name: 'tablet-small',
    width: 768,
    height: 1024,
    category: 'tablet',
  },
  {
    name: 'tablet-medium',
    width: 834,
    height: 1194,
    category: 'tablet',
  },
  {
    name: 'tablet-large',
    width: 1024,
    height: 1366,
    category: 'tablet',
  },
  // Desktop viewports (3 sizes)
  {
    name: 'desktop-hd',
    width: 1280,
    height: 720,
    category: 'desktop',
  },
  {
    name: 'desktop-fhd',
    width: 1920,
    height: 1080,
    category: 'desktop',
  },
  {
    name: 'desktop-2k',
    width: 1440,
    height: 900,
    category: 'desktop',
  },
]

/**
 * Get viewports by category
 */
export const getViewportsByCategory = (
  category: 'mobile' | 'tablet' | 'desktop'
): Viewport[] => {
  return VIEWPORTS.filter((vp) => vp.category === category)
}

/**
 * Get viewport by name
 */
export const getViewportByName = (name: string): Viewport | undefined => {
  return VIEWPORTS.find((vp) => vp.name === name)
}

/**
 * Screenshot comparison thresholds
 * Used to configure acceptable visual differences
 */
export const SCREENSHOT_THRESHOLDS = {
  // Component tests - small UI elements
  component: {
    maxDiffPixels: 100, // Allow up to 100 pixels difference
  },
  // Page tests - full page screenshots
  page: {
    maxDiffPixelRatio: 0.01, // Allow 1% difference
  },
  // Chart/visualization tests - more variance expected
  chart: {
    maxDiffPixels: 500,
  },
  // Animation tests - may have timing variance
  animation: {
    maxDiffPixels: 200,
  },
} as const

/**
 * Browser-specific configuration
 */
export const BROWSER_CONFIG = {
  chromium: {
    name: 'chromium',
    displayName: 'Chrome',
  },
  firefox: {
    name: 'firefox',
    displayName: 'Firefox',
  },
  webkit: {
    name: 'webkit',
    displayName: 'Safari',
  },
} as const

/**
 * Interaction states to test
 */
export const INTERACTION_STATES = [
  'default',
  'hover',
  'focus',
  'active',
  'disabled',
  'error',
  'loading',
] as const

export type InteractionState = (typeof INTERACTION_STATES)[number]

/**
 * Screenshot naming convention helper
 * Generates consistent screenshot names across tests
 */
export const generateScreenshotName = (options: {
  component: string
  variant?: string
  state?: InteractionState
  viewport?: string
  browser?: string
}): string => {
  const parts = [options.component]

  if (options.variant) {
    parts.push(options.variant)
  }

  if (options.state) {
    parts.push(options.state)
  }

  if (options.viewport) {
    parts.push(options.viewport)
  }

  if (options.browser) {
    parts.push(options.browser)
  }

  return `${parts.join('-')}.png`
}

/**
 * Default wait options for stable screenshots
 */
export const SCREENSHOT_WAIT_OPTIONS = {
  // Wait for network to be idle before capturing
  waitUntil: 'networkidle' as const,
  // Timeout for page load
  timeout: 30000,
}

/**
 * Animation disable options
 */
export const DISABLE_ANIMATIONS = {
  reducedMotion: 'reduce' as const,
}

/**
 * Unified visual configuration object
 * Consolidates all visual regression settings
 */
export const VISUAL_CONFIG = {
  viewports: {
    mobile: {
      small: { width: 375, height: 667 },
      medium: { width: 390, height: 844 },
      large: { width: 414, height: 896 },
    },
    tablet: {
      small: { width: 768, height: 1024 },
      medium: { width: 834, height: 1194 },
      large: { width: 1024, height: 1366 },
    },
    desktop: {
      hd: { width: 1280, height: 720 },
      fhd: { width: 1920, height: 1080 },
      '2k': { width: 1440, height: 900 },
    },
  },
  screenshots: {
    thresholds: {
      component: 100,
      page: { maxDiffPixelRatio: 0.01 },
      chart: 500,
      animation: 200,
    },
  },
} as const
