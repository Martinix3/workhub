/**
 * Viewport configurations for responsive testing
 */

export const viewports = {
  mobile: { width: 375, height: 667 },   // iPhone SE
  tablet: { width: 768, height: 1024 },  // iPad
  desktop: { width: 1280, height: 720 }, // Standard desktop
} as const

export type ViewportName = keyof typeof viewports
