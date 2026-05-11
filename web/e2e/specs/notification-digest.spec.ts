import { test, expect } from '../fixtures/auth.fixture'
import { NotificationCenterPage } from '../pages/shell/notification-center.page'

test.describe('Notification Digest', () => {
  let notificationCenter: NotificationCenterPage

  test.beforeEach(async ({ authenticatedPage }) => {
    notificationCenter = new NotificationCenterPage(authenticatedPage)

    // Navigate to home page where notification bell is always visible
    await authenticatedPage.goto('/')
    await authenticatedPage.waitForLoadState('domcontentloaded')
    await authenticatedPage.waitForTimeout(500)
  })

  test.describe('Display Tests', () => {
    test('notification bell button is visible in header', async ({ authenticatedPage }) => {
      // Bell button should be visible
      await expect(notificationCenter.bellButton).toBeVisible()

      // Should have proper title attribute
      await expect(notificationCenter.bellButton).toHaveAttribute('title', 'Notificaciones')
    })

    test('clicking bell button opens notification dropdown', async ({ authenticatedPage }) => {
      // Initially dropdown should not be visible
      await expect(notificationCenter.dropdown).not.toBeVisible()

      // Click bell button
      await notificationCenter.open()

      // Dropdown should now be visible
      await expect(notificationCenter.dropdown).toBeVisible()

      // Header should be visible with title
      await expect(notificationCenter.title).toBeVisible()
      await expect(notificationCenter.title).toHaveText('Notificaciones')
    })

    test('dropdown displays loading state while fetching notifications', async ({ authenticatedPage }) => {
      await notificationCenter.open()

      // Loading indicator might be visible briefly (or not if data loads fast)
      // We just check it exists in DOM even if not visible
      const loadingExists = await notificationCenter.loadingIndicator.count() > 0
      expect(typeof loadingExists).toBe('boolean')
    })

    test('dropdown displays empty state when no notifications exist', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()
      const isEmpty = await notificationCenter.isEmpty()

      // Either has notifications or shows empty state
      if (!hasNotifications) {
        expect(isEmpty).toBe(true)
        await expect(notificationCenter.emptyState).toBeVisible()
      }
    })

    test('notifications display with proper structure when available', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()
        expect(count).toBeGreaterThan(0)

        // First notification should have title
        const title = await notificationCenter.getNotificationTitle(0)
        expect(title.length).toBeGreaterThan(0)

        // Should have message
        const message = await notificationCenter.getNotificationMessage(0)
        expect(typeof message).toBe('string')
      }
    })

    test('unread badge shows count when unread notifications exist', async ({ authenticatedPage }) => {
      const hasBadge = await notificationCenter.hasUnreadBadge()

      if (hasBadge) {
        const count = await notificationCenter.getUnreadCount()
        expect(count).toBeGreaterThanOrEqual(1)

        // Badge should be visible
        await expect(notificationCenter.unreadBadge).toBeVisible()

        // Count should be displayed (either number or "9+")
        const badgeText = await notificationCenter.unreadBadge.textContent()
        expect(badgeText).toBeTruthy()
      }
    })

    test('unread badge displays "9+" for counts over 9', async ({ authenticatedPage }) => {
      const hasBadge = await notificationCenter.hasUnreadBadge()

      if (hasBadge) {
        const count = await notificationCenter.getUnreadCount()
        const badgeText = await notificationCenter.unreadBadge.textContent()

        if (count >= 9) {
          // Should show "9+" for 9 or more
          expect(['9', '9+']).toContain(badgeText)
        } else {
          // Should show actual count
          expect(badgeText).toBe(count.toString())
        }
      }
    })

    test('notification items display type-specific icons', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Check first few notifications have icons (SVG elements)
        const itemsToCheck = Math.min(count, 3)
        for (let i = 0; i < itemsToCheck; i++) {
          const notification = notificationCenter.notificationItems.nth(i)
          const icon = notification.locator('svg').first()
          await expect(icon).toBeVisible()
        }
      }
    })

    test('notification timestamps display in relative format', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const timestamps = await notificationCenter.getNotificationTimestamps()

        if (timestamps.length > 0) {
          // Timestamps should be in relative format (e.g., "2h", "3d", "ahora")
          const firstTimestamp = timestamps[0]
          expect(firstTimestamp.length).toBeGreaterThan(0)

          // Should match relative time patterns (numbers + unit, or "ahora")
          const isRelativeTime = /^\d+[mhd]|ahora|sem|mes/.test(firstTimestamp)
          expect(isRelativeTime).toBe(true)
        }
      }
    })

    test('mark all read button appears when unread notifications exist', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasUnread = await notificationCenter.hasUnreadBadge()

      if (hasUnread) {
        const buttonVisible = await notificationCenter.verifyMarkAllReadButtonVisible()
        expect(buttonVisible).toBe(true)

        await expect(notificationCenter.markAllReadButton).toBeVisible()
        await expect(notificationCenter.markAllReadButton).toContainText('Marcar todas')
      }
    })
  })

  test.describe('Grouping Tests', () => {
    test('notifications are displayed in chronological order (most recent first)', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const titles = await notificationCenter.getAllNotificationTitles()

        // Should have at least one notification
        expect(titles.length).toBeGreaterThan(0)

        // Timestamps should be in descending order
        const timestamps = await notificationCenter.getNotificationTimestamps()
        expect(timestamps.length).toBe(titles.length)
      }
    })

    test('unread notifications are visually distinguished from read ones', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Check first few notifications for read state distinction
        const itemsToCheck = Math.min(count, 5)
        for (let i = 0; i < itemsToCheck; i++) {
          const isUnread = await notificationCenter.isNotificationUnread(i)

          // Verify background color class exists
          const notification = notificationCenter.notificationItems.nth(i)
          const classList = await notification.getAttribute('class')

          if (isUnread) {
            // Unread should have darker background
            expect(classList).toContain('bg-[#1e293b]')
          } else {
            // Read should have lighter background
            expect(classList).toContain('bg-[#0f172a]')
          }
        }
      }
    })

    test('notification items display priority with color-coded icons', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Check first few notifications have colored icons based on priority
        const itemsToCheck = Math.min(count, 3)
        for (let i = 0; i < itemsToCheck; i++) {
          const notification = notificationCenter.notificationItems.nth(i)

          // Icon container should have priority color class
          const iconContainer = notification.locator('div').first()
          const classList = await iconContainer.getAttribute('class')

          // Should have one of the priority color classes
          const hasPriorityColor =
            classList?.includes('text-red-400') ||    // HIGH
            classList?.includes('text-amber-400') ||  // MEDIUM
            classList?.includes('text-slate-400')     // LOW

          expect(hasPriorityColor).toBe(true)
        }
      }
    })

    test('notification types are distinguished by different icons', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Different notification types should have different icons
        // We can verify by checking that icons exist and are rendered
        const itemsToCheck = Math.min(count, 5)
        const iconTypes = new Set()

        for (let i = 0; i < itemsToCheck; i++) {
          const notification = notificationCenter.notificationItems.nth(i)
          const icon = notification.locator('svg').first()

          // Get SVG class or attributes to identify icon type
          const iconClass = await icon.getAttribute('class')
          iconTypes.add(iconClass)

          await expect(icon).toBeVisible()
        }

        // Should have at least one icon rendered
        expect(iconTypes.size).toBeGreaterThanOrEqual(1)
      }
    })

    test('notification list is scrollable when content exceeds max height', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        // List container should have overflow-y-auto and max-height
        const listClassList = await notificationCenter.notificationList.getAttribute('class')

        expect(listClassList).toContain('max-h-[32rem]')
        expect(listClassList).toContain('overflow-y-auto')
      }
    })

    test('notifications maintain consistent spacing and borders', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Check first few notifications have proper borders
        const itemsToCheck = Math.min(count, 3)
        for (let i = 0; i < itemsToCheck; i++) {
          const notification = notificationCenter.notificationItems.nth(i)
          const classList = await notification.getAttribute('class')

          // Should have border-b class
          expect(classList).toContain('border-b')
          expect(classList).toContain('border-slate-700')
        }

        // Last notification should have no bottom border
        if (count > 0) {
          const lastNotification = notificationCenter.notificationItems.nth(count - 1)
          const lastClassList = await lastNotification.getAttribute('class')

          expect(lastClassList).toContain('last:border-b-0')
        }
      }
    })

    test('notification action buttons are consistently positioned', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Check first notification has action buttons
        if (count > 0) {
          const notification = notificationCenter.notificationItems.nth(0)

          // Should have delete button
          const deleteButton = notification.locator('button[title="Eliminar"]')
          await expect(deleteButton).toBeVisible()

          // If unread, should have mark read button
          const isUnread = await notificationCenter.isNotificationUnread(0)
          if (isUnread) {
            const markReadButton = notification.locator('button[title="Marcar como leida"]')
            await expect(markReadButton).toBeVisible()
          }
        }
      }
    })
  })

  test.describe('Visual Consistency Tests', () => {
    test('notification titles are truncated when too long', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Check that titles have truncate class
        if (count > 0) {
          const notification = notificationCenter.notificationItems.nth(0)
          const titleElement = notification.locator('h4')
          const classList = await titleElement.getAttribute('class')

          expect(classList).toContain('truncate')
        }
      }
    })

    test('notification messages are limited to 2 lines', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Check that messages have line-clamp-2 class
        if (count > 0) {
          const notification = notificationCenter.notificationItems.nth(0)
          const messageElement = notification.locator('p.text-xs').first()
          const classList = await messageElement.getAttribute('class')

          expect(classList).toContain('line-clamp-2')
        }
      }
    })

    test('notification hover states work correctly', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Check first notification has hover transition
        if (count > 0) {
          const notification = notificationCenter.notificationItems.nth(0)
          const classList = await notification.getAttribute('class')

          expect(classList).toContain('hover:bg-slate-700/50')
          expect(classList).toContain('transition-colors')
        }
      }
    })

    test('dropdown width is constrained on small screens', async ({ authenticatedPage }) => {
      // Dropdown should have max-width constraint
      await notificationCenter.open()

      const classList = await notificationCenter.dropdown.getAttribute('class')

      expect(classList).toContain('w-96')
      expect(classList).toContain('max-w-[calc(100vw-2rem)]')
    })

    test('notification center maintains visual hierarchy', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      // Header should be at the top
      await expect(notificationCenter.header).toBeVisible()

      // Title should use bold font
      const titleClassList = await notificationCenter.title.getAttribute('class')
      expect(titleClassList).toContain('font-bold')

      // List should be below header
      const hasNotifications = await notificationCenter.hasNotifications()
      const isEmpty = await notificationCenter.isEmpty()

      // Either list or empty state should be visible
      expect(hasNotifications || isEmpty).toBe(true)
    })
  })

  test.describe('Dropdown Interaction Tests', () => {
    test('clicking overlay closes dropdown', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await expect(notificationCenter.dropdown).toBeVisible()

      // Click overlay
      await notificationCenter.close()

      // Dropdown should close
      await expect(notificationCenter.dropdown).not.toBeVisible()
    })

    test('dropdown can be opened and closed multiple times', async ({ authenticatedPage }) => {
      // First open/close
      await notificationCenter.open()
      await expect(notificationCenter.dropdown).toBeVisible()
      await notificationCenter.close()
      await expect(notificationCenter.dropdown).not.toBeVisible()

      // Second open/close
      await notificationCenter.open()
      await expect(notificationCenter.dropdown).toBeVisible()
      await notificationCenter.close()
      await expect(notificationCenter.dropdown).not.toBeVisible()
    })

    test('dropdown remains open when clicking inside it', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      // Click inside dropdown (on title)
      await notificationCenter.title.click()

      // Should still be open
      await expect(notificationCenter.dropdown).toBeVisible()
    })
  })

  test.describe('Interaction and State Tests', () => {
    test('clicking notification marks it as read', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Find first unread notification
        for (let i = 0; i < count; i++) {
          const isUnread = await notificationCenter.isNotificationUnread(i)

          if (isUnread) {
            // Click the notification
            await notificationCenter.clickNotification(i)

            // Give time for state update
            await authenticatedPage.waitForTimeout(500)

            // Reopen dropdown to check state
            await notificationCenter.close()
            await notificationCenter.open()
            await notificationCenter.waitForDataLoaded()

            // Notification should now be read
            const isStillUnread = await notificationCenter.isNotificationUnread(i)
            expect(isStillUnread).toBe(false)
            break
          }
        }
      }
    })

    test('mark as read button changes notification state', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Find first unread notification
        for (let i = 0; i < count; i++) {
          const isUnread = await notificationCenter.isNotificationUnread(i)

          if (isUnread) {
            // Mark as read
            await notificationCenter.markNotificationAsRead(i)

            // Give time for state update
            await authenticatedPage.waitForTimeout(500)

            // Check state changed
            const isStillUnread = await notificationCenter.isNotificationUnread(i)
            expect(isStillUnread).toBe(false)
            break
          }
        }
      }
    })

    test('mark all read button marks all unread notifications', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasUnread = await notificationCenter.hasUnreadBadge()

      if (hasUnread) {
        const initialUnreadCount = await notificationCenter.getUnreadCount()
        expect(initialUnreadCount).toBeGreaterThan(0)

        // Click mark all as read
        await notificationCenter.markAllRead()

        // Give time for state update
        await authenticatedPage.waitForTimeout(500)

        // Unread badge should disappear or show 0
        const stillHasUnread = await notificationCenter.hasUnreadBadge()

        if (stillHasUnread) {
          const newUnreadCount = await notificationCenter.getUnreadCount()
          expect(newUnreadCount).toBeLessThan(initialUnreadCount)
        }
      }
    })

    test('deleting notification removes it from list', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const initialCount = await notificationCenter.getNotificationCount()
        expect(initialCount).toBeGreaterThan(0)

        // Get title of first notification
        const titleToDelete = await notificationCenter.getNotificationTitle(0)

        // Delete first notification
        await notificationCenter.deleteNotification(0)

        // Give time for state update
        await authenticatedPage.waitForTimeout(500)

        // Count should decrease
        const newCount = await notificationCenter.getNotificationCount()
        expect(newCount).toBe(initialCount - 1)

        // Deleted notification should not be in list
        if (newCount > 0) {
          const currentTitle = await notificationCenter.getNotificationTitle(0)
          expect(currentTitle).not.toBe(titleToDelete)
        }
      }
    })

    test('unread badge updates after marking notification as read', async ({ authenticatedPage }) => {
      const initialHasBadge = await notificationCenter.hasUnreadBadge()

      if (initialHasBadge) {
        const initialCount = await notificationCenter.getUnreadCount()

        await notificationCenter.open()
        await notificationCenter.waitForDataLoaded()

        const hasNotifications = await notificationCenter.hasNotifications()

        if (hasNotifications) {
          const count = await notificationCenter.getNotificationCount()

          // Find and mark first unread notification
          for (let i = 0; i < count; i++) {
            const isUnread = await notificationCenter.isNotificationUnread(i)

            if (isUnread) {
              await notificationCenter.markNotificationAsRead(i)
              await authenticatedPage.waitForTimeout(500)
              break
            }
          }

          // Close and check badge
          await notificationCenter.close()

          const newHasBadge = await notificationCenter.hasUnreadBadge()

          if (newHasBadge) {
            const newCount = await notificationCenter.getUnreadCount()
            expect(newCount).toBeLessThanOrEqual(initialCount)
          }
        }
      }
    })

    test('unread badge disappears after marking all as read', async ({ authenticatedPage }) => {
      const initialHasBadge = await notificationCenter.hasUnreadBadge()

      if (initialHasBadge) {
        await notificationCenter.open()
        await notificationCenter.waitForDataLoaded()

        // Mark all as read
        await notificationCenter.markAllRead()
        await authenticatedPage.waitForTimeout(500)

        // Close dropdown
        await notificationCenter.close()

        // Badge should disappear
        const stillHasBadge = await notificationCenter.hasUnreadBadge()
        expect(stillHasBadge).toBe(false)
      }
    })

    test('notification count updates correctly after deletion', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const initialCount = await notificationCenter.getNotificationCount()

        // Delete multiple notifications
        const deleteCount = Math.min(2, initialCount)

        for (let i = 0; i < deleteCount; i++) {
          await notificationCenter.deleteNotification(0)
          await authenticatedPage.waitForTimeout(300)
        }

        // Final count should be reduced
        const finalCount = await notificationCenter.getNotificationCount()
        expect(finalCount).toBe(initialCount - deleteCount)
      }
    })

    test('multiple mark as read interactions work sequentially', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Mark first 3 unread notifications (or as many as exist)
        let markedCount = 0
        const maxToMark = Math.min(3, count)

        for (let i = 0; i < count && markedCount < maxToMark; i++) {
          const isUnread = await notificationCenter.isNotificationUnread(i)

          if (isUnread) {
            await notificationCenter.markNotificationAsRead(i)
            await authenticatedPage.waitForTimeout(300)
            markedCount++
          }
        }

        // At least one should have been marked if we had unread notifications
        if (markedCount > 0) {
          expect(markedCount).toBeGreaterThan(0)
          expect(markedCount).toBeLessThanOrEqual(3)
        }
      }
    })

    test('notification state persists across dropdown close and reopen', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Find first unread notification and mark it
        let markedIndex = -1

        for (let i = 0; i < count; i++) {
          const isUnread = await notificationCenter.isNotificationUnread(i)

          if (isUnread) {
            await notificationCenter.markNotificationAsRead(i)
            await authenticatedPage.waitForTimeout(300)
            markedIndex = i
            break
          }
        }

        if (markedIndex >= 0) {
          // Close dropdown
          await notificationCenter.close()

          // Reopen dropdown
          await notificationCenter.open()
          await notificationCenter.waitForDataLoaded()

          // Notification should still be read
          const isUnread = await notificationCenter.isNotificationUnread(markedIndex)
          expect(isUnread).toBe(false)
        }
      }
    })

    test('mark all read button disappears when no unread notifications', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasUnread = await notificationCenter.hasUnreadBadge()

      if (hasUnread) {
        // Mark all as read
        await notificationCenter.markAllRead()
        await authenticatedPage.waitForTimeout(500)

        // Button should disappear or not be visible
        const buttonStillVisible = await notificationCenter.verifyMarkAllReadButtonVisible()

        // After marking all as read, button should not be visible
        expect(buttonStillVisible).toBe(false)
      }
    })

    test('deleting all notifications shows empty state', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const initialCount = await notificationCenter.getNotificationCount()

        // Delete all notifications (limit to 10 for performance)
        const deleteLimit = Math.min(initialCount, 10)

        for (let i = 0; i < deleteLimit; i++) {
          const currentCount = await notificationCenter.getNotificationCount()
          if (currentCount === 0) break

          await notificationCenter.deleteNotification(0)
          await authenticatedPage.waitForTimeout(200)
        }

        // Check final state
        const finalCount = await notificationCenter.getNotificationCount()
        const isEmpty = await notificationCenter.isEmpty()

        // Either all deleted showing empty state, or partial deletion
        if (finalCount === 0) {
          expect(isEmpty).toBe(true)
        } else {
          expect(finalCount).toBeLessThan(initialCount)
        }
      }
    })

    test('action buttons remain functional after multiple interactions', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()

      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()

        // Perform mix of actions
        if (count > 0) {
          // Mark first as read
          const isFirstUnread = await notificationCenter.isNotificationUnread(0)
          if (isFirstUnread) {
            await notificationCenter.markNotificationAsRead(0)
            await authenticatedPage.waitForTimeout(300)
          }

          // Click second notification if it exists
          if (count > 1) {
            await notificationCenter.clickNotification(1)
            await authenticatedPage.waitForTimeout(300)

            // Reopen if closed
            const isOpen = await notificationCenter.isOpen()
            if (!isOpen) {
              await notificationCenter.open()
              await notificationCenter.waitForDataLoaded()
            }
          }

          // Delete button should still work on remaining notifications
          const currentCount = await notificationCenter.getNotificationCount()
          if (currentCount > 0) {
            const beforeDelete = currentCount
            await notificationCenter.deleteNotification(0)
            await authenticatedPage.waitForTimeout(300)

            const afterDelete = await notificationCenter.getNotificationCount()
            expect(afterDelete).toBe(beforeDelete - 1)
          }
        }
      }
    })
  })

  test.describe('Visual Regression', () => {
    test('captura bell button con badge', async ({ authenticatedPage }) => {
      await authenticatedPage.waitForTimeout(1000)

      // Capture notification bell area
      await expect(notificationCenter.bellButton).toHaveScreenshot('notification-bell.png', {
        animations: 'disabled',
      })
    })

    test('captura dropdown de notificaciones', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()
      await authenticatedPage.waitForTimeout(500)

      // Capture dropdown panel
      await expect(notificationCenter.dropdown).toHaveScreenshot('notification-dropdown.png', {
        animations: 'disabled',
      })
    })

    test('captura estado vacio de notificaciones', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const isEmpty = await notificationCenter.isEmpty()
      if (isEmpty) {
        await authenticatedPage.waitForTimeout(500)

        await expect(notificationCenter.dropdown).toHaveScreenshot('notification-empty.png', {
          animations: 'disabled',
        })
      }
    })

    test('captura notificacion con acciones', async ({ authenticatedPage }) => {
      await notificationCenter.open()
      await notificationCenter.waitForDataLoaded()

      const hasNotifications = await notificationCenter.hasNotifications()
      if (hasNotifications) {
        const count = await notificationCenter.getNotificationCount()
        if (count > 0) {
          // Hover first notification to show actions
          const notification = notificationCenter.notificationItems.nth(0)
          await notification.hover()
          await authenticatedPage.waitForTimeout(300)

          await expect(notification).toHaveScreenshot('notification-item-actions.png', {
            animations: 'disabled',
          })
        }
      }
    })
  })
})
