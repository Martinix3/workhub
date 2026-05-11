/**
 * Viewport configurations for responsive testing
 *
 * Comprehensive mobile device configurations for thorough testing across:
 * - Different screen sizes (small, medium, large phones)
 * - Different aspect ratios (16:9, 19.5:9, 20:9)
 * - Popular devices (iPhone, Android)
 * - Landscape and portrait orientations
 */

export const viewports = {
  // ========== Mobile Devices - Portrait ==========

  // Small phones (compact devices)
  'mobile-small': { width: 320, height: 568 },   // iPhone SE 1st gen, small Android
  'iphone-se': { width: 375, height: 667 },      // iPhone SE 2nd/3rd gen
  'mobile': { width: 375, height: 667 },         // Default mobile (alias for iphone-se)

  // Medium phones (standard size)
  'iphone-12': { width: 390, height: 844 },      // iPhone 12, 13, 14
  'iphone-13-pro': { width: 390, height: 844 },  // iPhone 13 Pro, 14 Pro
  'pixel-5': { width: 393, height: 851 },        // Google Pixel 5, 6
  'galaxy-s21': { width: 360, height: 800 },     // Samsung Galaxy S21

  // Large phones (phablets)
  'iphone-14-pro-max': { width: 430, height: 932 },  // iPhone 14 Pro Max, 15 Pro Max
  'iphone-12-pro-max': { width: 428, height: 926 },  // iPhone 12/13/14 Pro Max
  'pixel-7-pro': { width: 412, height: 915 },        // Google Pixel 7 Pro
  'galaxy-s21-ultra': { width: 384, height: 854 },   // Samsung Galaxy S21 Ultra

  // ========== Mobile Devices - Landscape ==========

  'mobile-landscape': { width: 667, height: 375 },           // iPhone SE landscape
  'iphone-12-landscape': { width: 844, height: 390 },        // iPhone 12/13/14 landscape
  'iphone-14-pro-max-landscape': { width: 932, height: 430 },// iPhone 14 Pro Max landscape
  'pixel-5-landscape': { width: 851, height: 393 },          // Pixel 5 landscape

  // ========== Tablets ==========

  // iPad (portrait)
  'tablet': { width: 768, height: 1024 },        // iPad, iPad Air (default)
  'ipad': { width: 768, height: 1024 },          // iPad 9th/10th gen
  'ipad-air': { width: 820, height: 1180 },      // iPad Air 4th/5th gen
  'ipad-pro-11': { width: 834, height: 1194 },   // iPad Pro 11"
  'ipad-pro-12.9': { width: 1024, height: 1366 },// iPad Pro 12.9"

  // Android tablets
  'galaxy-tab-s8': { width: 800, height: 1280 }, // Samsung Galaxy Tab S8

  // iPad (landscape)
  'ipad-landscape': { width: 1024, height: 768 },         // iPad landscape
  'ipad-pro-11-landscape': { width: 1194, height: 834 },  // iPad Pro 11" landscape
  'ipad-pro-12.9-landscape': { width: 1366, height: 1024 },// iPad Pro 12.9" landscape

  // ========== Desktop ==========

  'desktop': { width: 1280, height: 720 },       // Standard HD desktop
  'desktop-hd': { width: 1920, height: 1080 },   // Full HD desktop
  'desktop-wide': { width: 2560, height: 1440 }, // 2K/QHD desktop
} as const

export type ViewportName = keyof typeof viewports

/**
 * Viewport categories for grouping tests
 */
export const viewportCategories = {
  mobile: [
    'mobile-small',
    'iphone-se',
    'mobile',
    'iphone-12',
    'iphone-13-pro',
    'pixel-5',
    'galaxy-s21',
    'iphone-14-pro-max',
    'iphone-12-pro-max',
    'pixel-7-pro',
    'galaxy-s21-ultra',
  ] as const,
  mobileLandscape: [
    'mobile-landscape',
    'iphone-12-landscape',
    'iphone-14-pro-max-landscape',
    'pixel-5-landscape',
  ] as const,
  tablet: [
    'tablet',
    'ipad',
    'ipad-air',
    'ipad-pro-11',
    'ipad-pro-12.9',
    'galaxy-tab-s8',
  ] as const,
  tabletLandscape: [
    'ipad-landscape',
    'ipad-pro-11-landscape',
    'ipad-pro-12.9-landscape',
  ] as const,
  desktop: [
    'desktop',
    'desktop-hd',
    'desktop-wide',
  ] as const,
} as const

/**
 * Helper to check if viewport is mobile (portrait)
 */
export function isMobileViewport(viewportName: ViewportName): boolean {
  return viewportCategories.mobile.includes(viewportName as any)
}

/**
 * Helper to check if viewport is mobile landscape
 */
export function isMobileLandscapeViewport(viewportName: ViewportName): boolean {
  return viewportCategories.mobileLandscape.includes(viewportName as any)
}

/**
 * Helper to check if viewport is tablet
 */
export function isTabletViewport(viewportName: ViewportName): boolean {
  return viewportCategories.tablet.includes(viewportName as any) ||
         viewportCategories.tabletLandscape.includes(viewportName as any)
}

/**
 * Helper to check if viewport is desktop
 */
export function isDesktopViewport(viewportName: ViewportName): boolean {
  return viewportCategories.desktop.includes(viewportName as any)
}

/**
 * Helper to get all mobile viewports for parameterized testing
 */
export function getAllMobileViewports(): ViewportName[] {
  return [...viewportCategories.mobile] as ViewportName[]
}

/**
 * Helper to get all tablet viewports for parameterized testing
 */
export function getAllTabletViewports(): ViewportName[] {
  return [...viewportCategories.tablet, ...viewportCategories.tabletLandscape] as ViewportName[]
}

/**
 * Helper to get popular mobile devices for quick testing
 */
export function getPopularMobileViewports(): ViewportName[] {
  return [
    'iphone-se',        // Small iPhone
    'iphone-12',        // Standard iPhone
    'iphone-14-pro-max',// Large iPhone
    'pixel-5',          // Standard Android
    'galaxy-s21',       // Samsung Android
  ] as ViewportName[]
}
