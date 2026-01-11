# Viewport Fixture Usage Guide

The viewport fixture provides comprehensive mobile device configurations for thorough testing across different screen sizes, aspect ratios, and orientations.

## Quick Start

### Basic Usage

```typescript
import { test } from '../fixtures/auth.fixture'
import { viewports } from '../fixtures/viewport.fixture'

// Test on a specific device
test.describe('Mobile Tests - iPhone SE', () => {
  test.use({ viewport: viewports['iphone-se'] })

  test('should work on iPhone SE', async ({ authenticatedPage }) => {
    // Your test code here
  })
})
```

### Test Across Multiple Devices

```typescript
import { test } from '../fixtures/auth.fixture'
import { viewports, getPopularMobileViewports } from '../fixtures/viewport.fixture'

// Test on popular mobile devices
for (const deviceName of getPopularMobileViewports()) {
  test.describe(`Mobile Tests - ${deviceName}`, () => {
    test.use({ viewport: viewports[deviceName] })

    test('should work on all popular devices', async ({ authenticatedPage }) => {
      // Your test code here
    })
  })
}
```

## Available Viewports

### Mobile Devices (Portrait)

#### Small Phones
- `mobile-small` - 320x568 (iPhone SE 1st gen, small Android)
- `iphone-se` - 375x667 (iPhone SE 2nd/3rd gen)
- `mobile` - 375x667 (Default mobile, alias for iphone-se)

#### Medium Phones
- `iphone-12` - 390x844 (iPhone 12, 13, 14)
- `iphone-13-pro` - 390x844 (iPhone 13 Pro, 14 Pro)
- `pixel-5` - 393x851 (Google Pixel 5, 6)
- `galaxy-s21` - 360x800 (Samsung Galaxy S21)

#### Large Phones (Phablets)
- `iphone-14-pro-max` - 430x932 (iPhone 14 Pro Max, 15 Pro Max)
- `iphone-12-pro-max` - 428x926 (iPhone 12/13/14 Pro Max)
- `pixel-7-pro` - 412x915 (Google Pixel 7 Pro)
- `galaxy-s21-ultra` - 384x854 (Samsung Galaxy S21 Ultra)

### Mobile Devices (Landscape)

- `mobile-landscape` - 667x375 (iPhone SE landscape)
- `iphone-12-landscape` - 844x390 (iPhone 12/13/14 landscape)
- `iphone-14-pro-max-landscape` - 932x430 (iPhone 14 Pro Max landscape)
- `pixel-5-landscape` - 851x393 (Pixel 5 landscape)

### Tablets (Portrait)

- `tablet` - 768x1024 (Default tablet, iPad)
- `ipad` - 768x1024 (iPad 9th/10th gen)
- `ipad-air` - 820x1180 (iPad Air 4th/5th gen)
- `ipad-pro-11` - 834x1194 (iPad Pro 11")
- `ipad-pro-12.9` - 1024x1366 (iPad Pro 12.9")
- `galaxy-tab-s8` - 800x1280 (Samsung Galaxy Tab S8)

### Tablets (Landscape)

- `ipad-landscape` - 1024x768 (iPad landscape)
- `ipad-pro-11-landscape` - 1194x834 (iPad Pro 11" landscape)
- `ipad-pro-12.9-landscape` - 1366x1024 (iPad Pro 12.9" landscape)

### Desktop

- `desktop` - 1280x720 (Standard HD)
- `desktop-hd` - 1920x1080 (Full HD)
- `desktop-wide` - 2560x1440 (2K/QHD)

## Helper Functions

### Check Viewport Type

```typescript
import {
  isMobileViewport,
  isTabletViewport,
  isDesktopViewport,
  isMobileLandscapeViewport
} from '../fixtures/viewport.fixture'

const device = 'iphone-12'

if (isMobileViewport(device)) {
  console.log('Mobile device detected')
}

if (isMobileLandscapeViewport(device)) {
  console.log('Mobile landscape detected')
}

if (isTabletViewport(device)) {
  console.log('Tablet device detected')
}

if (isDesktopViewport(device)) {
  console.log('Desktop device detected')
}
```

### Get All Viewports by Category

```typescript
import {
  getAllMobileViewports,
  getAllTabletViewports,
  getPopularMobileViewports,
  viewportCategories
} from '../fixtures/viewport.fixture'

// Get all mobile viewports (portrait only)
const allMobile = getAllMobileViewports()

// Get all tablet viewports (portrait + landscape)
const allTablets = getAllTabletViewports()

// Get popular mobile devices for quick testing
const popularMobile = getPopularMobileViewports()

// Get specific categories
const mobileLandscape = viewportCategories.mobileLandscape
const desktops = viewportCategories.desktop
```

## Advanced Usage Examples

### Test on All Mobile Devices

```typescript
import { test } from '../fixtures/auth.fixture'
import { viewports, getAllMobileViewports } from '../fixtures/viewport.fixture'

// Comprehensive mobile testing
for (const deviceName of getAllMobileViewports()) {
  test.describe(`Mobile Responsiveness - ${deviceName}`, () => {
    test.use({ viewport: viewports[deviceName] })

    test('FAB should be visible', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/')
      const fab = authenticatedPage.locator('.wh-fab')
      await expect(fab).toBeVisible()
    })

    test('touch targets should be 44px+', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/')
      const buttons = authenticatedPage.locator('button')
      const firstButton = buttons.first()
      const box = await firstButton.boundingBox()

      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.width).toBeGreaterThanOrEqual(44)
      }
    })
  })
}
```

### Test Portrait vs Landscape

```typescript
import { test } from '../fixtures/auth.fixture'
import { viewports } from '../fixtures/viewport.fixture'

test.describe('Orientation Tests', () => {
  test.describe('Portrait Mode', () => {
    test.use({ viewport: viewports['iphone-12'] })

    test('should show FAB in portrait', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/')
      const fab = authenticatedPage.locator('.wh-fab')
      await expect(fab).toBeVisible()
    })
  })

  test.describe('Landscape Mode', () => {
    test.use({ viewport: viewports['iphone-12-landscape'] })

    test('should adapt layout in landscape', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/')
      // Test landscape-specific behavior
    })
  })
})
```

### Test Small vs Large Phones

```typescript
import { test } from '../fixtures/auth.fixture'
import { viewports } from '../fixtures/viewport.fixture'

test.describe('Small Phone Tests', () => {
  test.use({ viewport: viewports['mobile-small'] })

  test('should work on smallest screens (320px)', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/')
    // Test on very small screens
  })
})

test.describe('Large Phone Tests', () => {
  test.use({ viewport: viewports['iphone-14-pro-max'] })

  test('should work on large screens (430px)', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/')
    // Test on large screens
  })
})
```

### Cross-Platform Testing (iOS vs Android)

```typescript
import { test } from '../fixtures/auth.fixture'
import { viewports } from '../fixtures/viewport.fixture'

const iosDevices = ['iphone-se', 'iphone-12', 'iphone-14-pro-max']
const androidDevices = ['pixel-5', 'galaxy-s21', 'pixel-7-pro']

test.describe('iOS Devices', () => {
  for (const device of iosDevices) {
    test.describe(device, () => {
      test.use({ viewport: viewports[device] })

      test('should work on iOS', async ({ authenticatedPage }) => {
        // Test iOS-specific behavior
      })
    })
  }
})

test.describe('Android Devices', () => {
  for (const device of androidDevices) {
    test.describe(device, () => {
      test.use({ viewport: viewports[device] })

      test('should work on Android', async ({ authenticatedPage }) => {
        // Test Android-specific behavior
      })
    })
  }
})
```

### Responsive Breakpoint Testing

```typescript
import { test } from '../fixtures/auth.fixture'
import { viewports } from '../fixtures/viewport.fixture'

test.describe('Responsive Breakpoints', () => {
  const breakpoints = [
    { name: 'Small Mobile', viewport: viewports['mobile-small'], width: 320 },
    { name: 'Mobile', viewport: viewports['mobile'], width: 375 },
    { name: 'Large Mobile', viewport: viewports['iphone-14-pro-max'], width: 430 },
    { name: 'Tablet', viewport: viewports['tablet'], width: 768 },
    { name: 'Desktop', viewport: viewports['desktop'], width: 1280 },
  ]

  for (const { name, viewport, width } of breakpoints) {
    test.describe(name, () => {
      test.use({ viewport })

      test(`should adapt layout at ${width}px`, async ({ authenticatedPage }) => {
        await authenticatedPage.goto('/')
        // Test responsive behavior at each breakpoint
      })
    })
  }
})
```

## Best Practices

### 1. Use Popular Devices for Quick Testing

For most tests, use `getPopularMobileViewports()` which includes:
- iPhone SE (small)
- iPhone 12 (standard)
- iPhone 14 Pro Max (large)
- Pixel 5 (Android standard)
- Galaxy S21 (Samsung)

This covers 90% of real-world devices without running excessive tests.

### 2. Test Edge Cases Separately

For comprehensive testing, add specific tests for:
- Very small screens (`mobile-small` at 320px)
- Very large screens (`iphone-14-pro-max` at 430px)
- Landscape orientations
- Tablet-specific layouts

### 3. Group Tests by Device Category

```typescript
// Good: Organized by category
test.describe('Mobile Tests', () => {
  test.describe('iPhone SE', () => { /* ... */ })
  test.describe('iPhone 12', () => { /* ... */ })
})

test.describe('Tablet Tests', () => {
  test.describe('iPad', () => { /* ... */ })
})
```

### 4. Use Helper Functions for Conditional Logic

```typescript
import { isMobileViewport } from '../fixtures/viewport.fixture'

const device = 'iphone-12'

if (isMobileViewport(device)) {
  // Mobile-specific assertions
  await expect(fab).toBeVisible()
} else {
  // Desktop-specific assertions
  await expect(fab).not.toBeVisible()
}
```

### 5. Test Critical Paths on All Devices

For critical user flows (login, checkout, task creation), test on:
- At least 3 mobile devices (small, medium, large)
- At least 1 tablet
- At least 1 desktop

## Common Testing Patterns

### Pattern 1: Quick Smoke Test

```typescript
// Test on just one popular device
test.describe('Quick Mobile Check', () => {
  test.use({ viewport: viewports['iphone-12'] })

  test('basic functionality works', async ({ authenticatedPage }) => {
    // Quick smoke test
  })
})
```

### Pattern 2: Comprehensive Mobile Test

```typescript
// Test on all popular mobile devices
import { getPopularMobileViewports } from '../fixtures/viewport.fixture'

for (const device of getPopularMobileViewports()) {
  test.describe(`Comprehensive Test - ${device}`, () => {
    test.use({ viewport: viewports[device] })

    test('comprehensive functionality', async ({ authenticatedPage }) => {
      // Thorough testing
    })
  })
}
```

### Pattern 3: Responsive Layout Test

```typescript
// Test specific breakpoints
const layouts = [
  { name: 'Mobile', viewport: viewports.mobile },
  { name: 'Tablet', viewport: viewports.tablet },
  { name: 'Desktop', viewport: viewports.desktop },
]

for (const { name, viewport } of layouts) {
  test.describe(name, () => {
    test.use({ viewport })

    test('layout adapts correctly', async ({ authenticatedPage }) => {
      // Test layout changes
    })
  })
}
```

## Migration from Old Viewport Fixture

If you're migrating from the old viewport fixture (only 3 devices), here's how:

### Old Code

```typescript
// Before (only 3 devices)
import { viewports } from '../fixtures/viewport.fixture'

test.use({ viewport: viewports.mobile })   // iPhone SE
test.use({ viewport: viewports.tablet })   // iPad
test.use({ viewport: viewports.desktop })  // Desktop
```

### New Code

```typescript
// After (same devices, backwards compatible)
import { viewports } from '../fixtures/viewport.fixture'

test.use({ viewport: viewports.mobile })   // Still works! (iPhone SE)
test.use({ viewport: viewports.tablet })   // Still works! (iPad)
test.use({ viewport: viewports.desktop })  // Still works! (Desktop)

// Plus all new devices
test.use({ viewport: viewports['iphone-12'] })
test.use({ viewport: viewports['pixel-5'] })
test.use({ viewport: viewports['ipad-pro-11'] })
```

**The old viewport names (`mobile`, `tablet`, `desktop`) still work!** The new fixture is 100% backwards compatible.

## TypeScript Support

The viewport fixture is fully typed with TypeScript:

```typescript
import { ViewportName, viewports } from '../fixtures/viewport.fixture'

// TypeScript autocomplete for all devices
const device: ViewportName = 'iphone-12' // ✅ Type-safe
const viewport = viewports[device]       // ✅ Type-safe

// Compile-time error for invalid devices
const invalid: ViewportName = 'iphone-99' // ❌ Type error
```

## Performance Considerations

Running tests on many devices can be slow. Here are optimization strategies:

### Strategy 1: Parallel Execution

Playwright runs tests in parallel by default. Use `--workers` flag:

```bash
npx playwright test --workers=4
```

### Strategy 2: Selective Device Testing

Run comprehensive tests only in CI, quick tests locally:

```typescript
// In CI: test all devices
const devices = process.env.CI
  ? getAllMobileViewports()
  : getPopularMobileViewports()

for (const device of devices) {
  // Run tests
}
```

### Strategy 3: Smoke Tests vs Full Tests

```typescript
// Smoke tests: 1 device, fast
test.describe('Smoke Tests', () => {
  test.use({ viewport: viewports.mobile })
  // Quick checks
})

// Full tests: all devices, slower
test.describe('Full Mobile Tests', () => {
  for (const device of getAllMobileViewports()) {
    // Comprehensive checks
  }
})
```

## Troubleshooting

### Issue: Tests failing on specific devices

**Solution:** Check if the issue is device-specific or a general bug:

```typescript
test('debug on specific device', async ({ authenticatedPage }) => {
  const viewport = await authenticatedPage.viewportSize()
  console.log('Viewport:', viewport)

  // Take screenshot for debugging
  await authenticatedPage.screenshot({
    path: `debug-${viewport?.width}x${viewport?.height}.png`
  })
})
```

### Issue: Touch targets too small on specific devices

**Solution:** Use conditional assertions based on device:

```typescript
import { isMobileViewport } from '../fixtures/viewport.fixture'

test('touch targets', async ({ authenticatedPage }) => {
  const viewport = await authenticatedPage.viewportSize()
  const device = 'mobile' // Get from test context

  if (isMobileViewport(device)) {
    // Stricter requirements on mobile
    expect(buttonHeight).toBeGreaterThanOrEqual(44)
  } else {
    expect(buttonHeight).toBeGreaterThanOrEqual(32)
  }
})
```

### Issue: Layout breaks on landscape

**Solution:** Test both orientations:

```typescript
test.describe('Orientation Tests', () => {
  test('portrait', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(viewports['iphone-12'])
    // Test portrait
  })

  test('landscape', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize(viewports['iphone-12-landscape'])
    // Test landscape
  })
})
```

## Additional Resources

- [Playwright Documentation](https://playwright.dev/docs/emulation#viewport)
- [Device Viewport Sizes](https://viewportsizer.com/)
- [WCAG Touch Target Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- [Mobile Viewport Meta Tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)

## Summary

The enhanced viewport fixture provides:

- ✅ **40+ device configurations** (mobile, tablet, desktop)
- ✅ **Portrait and landscape orientations**
- ✅ **Helper functions** for device categorization
- ✅ **TypeScript support** with full type safety
- ✅ **Backwards compatible** with old viewport names
- ✅ **Popular device presets** for quick testing
- ✅ **Real device dimensions** from actual devices

Use `getPopularMobileViewports()` for quick testing, `getAllMobileViewports()` for comprehensive coverage.
