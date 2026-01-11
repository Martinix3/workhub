import { test, expect } from '../fixtures/auth.fixture'

test.describe('Notification Settings', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    // Navigate to settings page and wait for it to load
    await authenticatedPage.goto('/settings')
    await authenticatedPage.waitForLoadState('domcontentloaded')

    // Click on Notifications tab
    const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
    await notificationsTab.click()
    await authenticatedPage.waitForTimeout(300)
  })

  test.describe('Visibility Tests', () => {
    test('todas las opciones de notificación son visibles', async ({ authenticatedPage }) => {
      // Email toggle
      const emailToggle = authenticatedPage.locator('input[type="checkbox"]').first()
      await expect(emailToggle).toBeVisible()
      const emailLabel = authenticatedPage.locator('text=Notificaciones por email')
      await expect(emailLabel).toBeVisible()

      // Frequency section
      const frequencyHeading = authenticatedPage.locator('h4:has-text("Frecuencia de notificaciones")')
      await expect(frequencyHeading).toBeVisible()

      // Frequency options - all 4 should be visible
      const realtimeOption = authenticatedPage.locator('button:has-text("Tiempo real")')
      await expect(realtimeOption).toBeVisible()

      const dailyOption = authenticatedPage.locator('button:has-text("Diario")')
      await expect(dailyOption).toBeVisible()

      const weeklyOption = authenticatedPage.locator('button:has-text("Semanal")')
      await expect(weeklyOption).toBeVisible()

      const offOption = authenticatedPage.locator('button:has-text("Desactivado")')
      await expect(offOption).toBeVisible()

      // Priority bypass toggle
      const priorityBypassLabel = authenticatedPage.locator('text=Notificaciones prioritarias inmediatas')
      await expect(priorityBypassLabel).toBeVisible()

      // Quiet hours section
      const quietHoursHeading = authenticatedPage.locator('h4:has-text("Horario de silencio")')
      await expect(quietHoursHeading).toBeVisible()

      // Save button
      const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")')
      await expect(saveButton).toBeVisible()
    })

    test('opción de quiet hours muestra time pickers cuando está activada', async ({ authenticatedPage }) => {
      // Find quiet hours toggle (it's not the first checkbox, as email toggle is first)
      const quietHoursToggle = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..').locator('input[type="checkbox"]')

      // Check if quiet hours is already enabled
      const isChecked = await quietHoursToggle.isChecked()

      if (!isChecked) {
        // Enable quiet hours
        await quietHoursToggle.click()
        await authenticatedPage.waitForTimeout(200)
      }

      // Time pickers should now be visible
      const startTimeLabel = authenticatedPage.locator('label:has-text("Hora de inicio")')
      await expect(startTimeLabel).toBeVisible()

      const endTimeLabel = authenticatedPage.locator('label:has-text("Hora de fin")')
      await expect(endTimeLabel).toBeVisible()

      // The time picker selects should be visible
      const timeSelects = authenticatedPage.locator('select')
      const count = await timeSelects.count()
      expect(count).toBeGreaterThanOrEqual(4) // At least 4 selects (2 for start time, 2 for end time)
    })
  })

  test.describe('Frequency Selection Tests', () => {
    test('puede seleccionar frecuencia en tiempo real', async ({ authenticatedPage }) => {
      const realtimeOption = authenticatedPage.locator('button:has-text("Tiempo real")')
      await realtimeOption.click()
      await authenticatedPage.waitForTimeout(100)

      // Check that button has selected state (amber border and bg)
      await expect(realtimeOption).toHaveClass(/border-amber-500/)
      await expect(realtimeOption).toHaveClass(/bg-amber-50/)
    })

    test('puede seleccionar frecuencia diaria', async ({ authenticatedPage }) => {
      const dailyOption = authenticatedPage.locator('button:has-text("Diario")')
      await dailyOption.click()
      await authenticatedPage.waitForTimeout(100)

      await expect(dailyOption).toHaveClass(/border-amber-500/)
      await expect(dailyOption).toHaveClass(/bg-amber-50/)
    })

    test('puede seleccionar frecuencia semanal', async ({ authenticatedPage }) => {
      const weeklyOption = authenticatedPage.locator('button:has-text("Semanal")')
      await weeklyOption.click()
      await authenticatedPage.waitForTimeout(100)

      await expect(weeklyOption).toHaveClass(/border-amber-500/)
      await expect(weeklyOption).toHaveClass(/bg-amber-50/)
    })

    test('puede desactivar notificaciones', async ({ authenticatedPage }) => {
      const offOption = authenticatedPage.locator('button:has-text("Desactivado")')
      await offOption.click()
      await authenticatedPage.waitForTimeout(100)

      await expect(offOption).toHaveClass(/border-amber-500/)
      await expect(offOption).toHaveClass(/bg-amber-50/)
    })

    test('solo una opción de frecuencia está seleccionada a la vez', async ({ authenticatedPage }) => {
      // Select realtime
      const realtimeOption = authenticatedPage.locator('button:has-text("Tiempo real")')
      await realtimeOption.click()
      await authenticatedPage.waitForTimeout(100)

      // Now select daily
      const dailyOption = authenticatedPage.locator('button:has-text("Diario")')
      await dailyOption.click()
      await authenticatedPage.waitForTimeout(100)

      // Daily should be selected
      await expect(dailyOption).toHaveClass(/border-amber-500/)

      // Realtime should NOT be selected
      await expect(realtimeOption).not.toHaveClass(/border-amber-500/)
      await expect(realtimeOption).toHaveClass(/border-stone-200/)
    })
  })

  test.describe('Persistence Tests', () => {
    test('cambios en frecuencia persisten después de guardar', async ({ authenticatedPage }) => {
      // Select weekly frequency
      const weeklyOption = authenticatedPage.locator('button:has-text("Semanal")')
      await weeklyOption.click()
      await authenticatedPage.waitForTimeout(200)

      // Save button should be enabled
      const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")')
      await expect(saveButton).not.toBeDisabled()

      // Click save
      await saveButton.click()
      await authenticatedPage.waitForTimeout(500)

      // Should show success message
      const successMessage = authenticatedPage.locator('text=Notificaciones actualizadas')
      await expect(successMessage).toBeVisible({ timeout: 3000 })

      // Reload the page
      await authenticatedPage.reload()
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Navigate back to notifications tab
      const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
      await notificationsTab.click()
      await authenticatedPage.waitForTimeout(300)

      // Weekly should still be selected
      const weeklyOptionAfterReload = authenticatedPage.locator('button:has-text("Semanal")')
      await expect(weeklyOptionAfterReload).toHaveClass(/border-amber-500/)
      await expect(weeklyOptionAfterReload).toHaveClass(/bg-amber-50/)
    })

    test('cambios en email toggle persisten después de guardar', async ({ authenticatedPage }) => {
      // Get current state
      const emailToggle = authenticatedPage.locator('input[type="checkbox"]').first()
      const initialState = await emailToggle.isChecked()

      // Toggle it
      await emailToggle.click()
      await authenticatedPage.waitForTimeout(200)

      // Save
      const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")')
      await saveButton.click()
      await authenticatedPage.waitForTimeout(500)

      // Should show success message
      const successMessage = authenticatedPage.locator('text=Notificaciones actualizadas')
      await expect(successMessage).toBeVisible({ timeout: 3000 })

      // Reload
      await authenticatedPage.reload()
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Navigate back to notifications tab
      const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
      await notificationsTab.click()
      await authenticatedPage.waitForTimeout(300)

      // Should have the new state (opposite of initial)
      const emailToggleAfterReload = authenticatedPage.locator('input[type="checkbox"]').first()
      const newState = await emailToggleAfterReload.isChecked()
      expect(newState).toBe(!initialState)

      // Toggle back to restore original state
      await emailToggleAfterReload.click()
      await authenticatedPage.waitForTimeout(200)
      const saveButtonRestore = authenticatedPage.locator('button:has-text("Guardar cambios")')
      await saveButtonRestore.click()
      await authenticatedPage.waitForTimeout(500)
    })

    test('cambios en priority bypass persisten después de guardar', async ({ authenticatedPage }) => {
      // Find priority bypass toggle
      const priorityBypassToggle = authenticatedPage.locator('text=Notificaciones prioritarias inmediatas').locator('..').locator('..').locator('input[type="checkbox"]')
      const initialState = await priorityBypassToggle.isChecked()

      // Toggle it
      await priorityBypassToggle.click()
      await authenticatedPage.waitForTimeout(200)

      // Save
      const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")')
      await saveButton.click()
      await authenticatedPage.waitForTimeout(500)

      // Should show success message
      const successMessage = authenticatedPage.locator('text=Notificaciones actualizadas')
      await expect(successMessage).toBeVisible({ timeout: 3000 })

      // Reload
      await authenticatedPage.reload()
      await authenticatedPage.waitForLoadState('domcontentloaded')

      // Navigate back to notifications tab
      const notificationsTab = authenticatedPage.locator('button:has-text("Notificaciones"), button:has-text("Notifications")')
      await notificationsTab.click()
      await authenticatedPage.waitForTimeout(300)

      // Should have the new state
      const priorityBypassToggleAfterReload = authenticatedPage.locator('text=Notificaciones prioritarias inmediatas').locator('..').locator('..').locator('input[type="checkbox"]')
      const newState = await priorityBypassToggleAfterReload.isChecked()
      expect(newState).toBe(!initialState)

      // Toggle back to restore original state
      await priorityBypassToggleAfterReload.click()
      await authenticatedPage.waitForTimeout(200)
      const saveButtonRestore = authenticatedPage.locator('button:has-text("Guardar cambios")')
      await saveButtonRestore.click()
      await authenticatedPage.waitForTimeout(500)
    })
  })

  test.describe('Button State Tests', () => {
    test('botón de guardar está deshabilitado cuando no hay cambios', async ({ authenticatedPage }) => {
      const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")')

      // Button should be disabled when no changes
      await expect(saveButton).toBeDisabled()
      await expect(saveButton).toHaveClass(/cursor-not-allowed/)
    })

    test('botón de guardar se habilita cuando hay cambios', async ({ authenticatedPage }) => {
      // Make a change
      const realtimeOption = authenticatedPage.locator('button:has-text("Tiempo real")')
      await realtimeOption.click()
      await authenticatedPage.waitForTimeout(200)

      // Button should now be enabled
      const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")')
      await expect(saveButton).not.toBeDisabled()
      await expect(saveButton).toHaveClass(/bg-amber-500/)
    })
  })

  test.describe('Quiet Hours Tests', () => {
    test('time pickers se ocultan cuando quiet hours está desactivado', async ({ authenticatedPage }) => {
      // Find quiet hours toggle
      const quietHoursToggle = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..').locator('input[type="checkbox"]')

      // Make sure it's enabled first
      const isChecked = await quietHoursToggle.isChecked()
      if (!isChecked) {
        await quietHoursToggle.click()
        await authenticatedPage.waitForTimeout(200)
      }

      // Verify time pickers are visible
      const startTimeLabel = authenticatedPage.locator('label:has-text("Hora de inicio")')
      await expect(startTimeLabel).toBeVisible()

      // Now disable quiet hours
      await quietHoursToggle.click()
      await authenticatedPage.waitForTimeout(200)

      // Time pickers should be hidden
      await expect(startTimeLabel).not.toBeVisible()
    })

    test('puede cambiar horarios de quiet hours', async ({ authenticatedPage }) => {
      // Enable quiet hours
      const quietHoursToggle = authenticatedPage.locator('h4:has-text("Horario de silencio")').locator('..').locator('input[type="checkbox"]')
      const isChecked = await quietHoursToggle.isChecked()
      if (!isChecked) {
        await quietHoursToggle.click()
        await authenticatedPage.waitForTimeout(200)
      }

      // Find the time picker selects
      const timeSelects = authenticatedPage.locator('select')

      // Change hour for start time (first select)
      await timeSelects.nth(0).selectOption('20') // 20:00

      // Save button should be enabled after change
      const saveButton = authenticatedPage.locator('button:has-text("Guardar cambios")')
      await expect(saveButton).not.toBeDisabled()
    })
  })
})
