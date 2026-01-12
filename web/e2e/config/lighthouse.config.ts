/**
 * Lighthouse CI Performance Testing Configuration
 *
 * Centralized configuration for Lighthouse performance tests including:
 * - Performance thresholds for critical metrics
 * - Accessibility and best practices standards
 * - Report generation settings
 * - Critical page definitions
 *
 * IMPORTANT: Default Lighthouse behavior fails if ANY metric is under 100 (extremely strict).
 * This configuration provides realistic thresholds based on industry standards.
 */

/**
 * Critical pages to test with Lighthouse
 */
export const CRITICAL_PAGES = [
  {
    name: 'dashboard',
    path: '/dashboard',
    description: 'Main dashboard page',
  },
  {
    name: 'tasks',
    path: '/tasks',
    description: 'Task list page',
  },
  {
    name: 'task-detail',
    path: '/tasks/1',
    description: 'Task detail view',
  },
] as const

/**
 * Lighthouse threshold configuration
 * Scores range from 0-100, where:
 * - 90-100: Good (green)
 * - 50-89: Needs improvement (orange)
 * - 0-49: Poor (red)
 */
export const LIGHTHOUSE_THRESHOLDS = {
  /**
   * Performance score threshold (85)
   * Includes metrics: LCP, FCP, TBT, TTI, CLS, Speed Index
   */
  performance: 85,

  /**
   * Accessibility score threshold (95)
   * Validates WCAG compliance and a11y best practices
   */
  accessibility: 95,

  /**
   * Best practices score threshold (90)
   * Covers security, browser compatibility, and modern standards
   */
  'best-practices': 90,

  /**
   * SEO score threshold (85)
   * Validates meta tags, mobile-friendliness, and crawlability
   */
  seo: 85,

  /**
   * Progressive Web App score (optional)
   * Not enforced by default as WorkHub may not be a PWA
   */
  pwa: 0,
} as const

/**
 * Visual performance metrics thresholds
 * These are the most critical metrics for user experience
 */
export const PERFORMANCE_METRICS = {
  /**
   * Largest Contentful Paint (LCP)
   * Measures loading performance
   * Good: ≤2.5s, Needs improvement: ≤4s, Poor: >4s
   */
  lcp: {
    threshold: 2500, // milliseconds
    description: 'Largest Contentful Paint',
  },

  /**
   * First Contentful Paint (FCP)
   * Measures when first content appears
   * Good: ≤1.8s, Needs improvement: ≤3s, Poor: >3s
   */
  fcp: {
    threshold: 1800, // milliseconds
    description: 'First Contentful Paint',
  },

  /**
   * Cumulative Layout Shift (CLS)
   * Measures visual stability
   * Good: ≤0.1, Needs improvement: ≤0.25, Poor: >0.25
   */
  cls: {
    threshold: 0.1, // unitless score
    description: 'Cumulative Layout Shift',
  },

  /**
   * Total Blocking Time (TBT)
   * Measures interactivity
   * Good: ≤200ms, Needs improvement: ≤600ms, Poor: >600ms
   */
  tbt: {
    threshold: 200, // milliseconds
    description: 'Total Blocking Time',
  },

  /**
   * Time to Interactive (TTI)
   * Measures when page becomes fully interactive
   * Good: ≤3.8s, Needs improvement: ≤7.3s, Poor: >7.3s
   */
  tti: {
    threshold: 3800, // milliseconds
    description: 'Time to Interactive',
  },

  /**
   * Speed Index
   * Measures how quickly content is visually displayed
   * Good: ≤3.4s, Needs improvement: ≤5.8s, Poor: >5.8s
   */
  speedIndex: {
    threshold: 3400, // milliseconds
    description: 'Speed Index',
  },
} as const

/**
 * Report generation configuration
 */
export const REPORT_CONFIG = {
  /**
   * Output formats for Lighthouse reports
   */
  formats: {
    html: true, // Human-readable HTML report
    json: true, // Machine-readable JSON for CI parsing
    csv: false, // Optional CSV export
  },

  /**
   * Report output directory (relative to web/)
   */
  directory: './e2e/reports/lighthouse',

  /**
   * Whether to open HTML report automatically (local dev only)
   */
  autoOpen: false,
} as const

/**
 * Lighthouse audit configuration
 * Controls which audits to run and settings
 */
export const AUDIT_CONFIG = {
  /**
   * Network throttling settings
   * Simulates slower connections for realistic performance testing
   */
  throttling: {
    // Mobile 4G simulation
    mobile: {
      rttMs: 150,
      throughputKbps: 1638.4,
      cpuSlowdownMultiplier: 4,
    },
    // Desktop simulation (no throttling)
    desktop: {
      rttMs: 40,
      throughputKbps: 10240,
      cpuSlowdownMultiplier: 1,
    },
  },

  /**
   * Device emulation
   */
  emulation: {
    mobile: 'Moto G4',
    desktop: 'Desktop',
  },

  /**
   * Screenshot settings
   */
  screenshots: {
    enabled: true,
    fullPage: false, // Only viewport screenshot for performance
  },
} as const

/**
 * Generate playwright-lighthouse options for a specific page
 */
export const getLighthouseOptions = (pageName: string) => {
  return {
    thresholds: LIGHTHOUSE_THRESHOLDS,
    reports: {
      formats: REPORT_CONFIG.formats,
      name: `${pageName}-performance`,
      directory: REPORT_CONFIG.directory,
    },
  }
}

/**
 * Get critical page configuration by name
 */
export const getCriticalPage = (name: string) => {
  return CRITICAL_PAGES.find((page) => page.name === name)
}

/**
 * Default wait options before running Lighthouse audit
 * Ensures page is fully loaded and stable
 */
export const LIGHTHOUSE_WAIT_OPTIONS = {
  // Wait for network to be idle
  waitUntil: 'networkidle' as const,
  // Timeout for page load
  timeout: 30000,
}
