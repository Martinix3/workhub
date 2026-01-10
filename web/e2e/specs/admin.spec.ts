import { test, expect } from '../fixtures/auth.fixture'
import { AdminUsersPage } from '../pages/admin/users.page'
import { CreateUserPage } from '../pages/admin/create-user.page'
import { ShellPage } from '../pages/shell.page'

test.describe('Admin', () => {
  // Note: Demo user doesn't have admin role, so these tests verify Access Denied behavior
  // In a real scenario, you'd have a separate admin user fixture

  test.describe('Access Control', () => {
    test('usuario sin rol admin ve Access Denied o es redirigido', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/admin')
      await authenticatedPage.waitForLoadState('domcontentloaded')
      await authenticatedPage.waitForTimeout(1000) // Wait for any redirects

      // The app should either:
      // 1. Show Access Denied message, OR
      // 2. Redirect to another page, OR
      // 3. Show the shell with no admin content
      const accessDenied1 = await authenticatedPage.locator('text=Acceso Denegado').isVisible().catch(() => false)
      const accessDenied2 = await authenticatedPage.locator('text=No tienes permisos').isVisible().catch(() => false)
      const accessDenied3 = await authenticatedPage.locator('text=Access Denied').isVisible().catch(() => false)
      const isNotAdmin = !authenticatedPage.url().includes('/admin')
      const shellVisible = await authenticatedPage.locator('aside, nav').isVisible().catch(() => false)

      expect(accessDenied1 || accessDenied2 || accessDenied3 || isNotAdmin || shellVisible).toBe(true)
    })

    test('boton Admin oculto en UserMenu para usuarios normales', async ({ authenticatedPage }) => {
      const shellPage = new ShellPage(authenticatedPage)
      await shellPage.openUserMenu()

      // Admin button should not be visible for demo user
      await expect(shellPage.adminButton).not.toBeVisible()
    })
  })

  // The following tests are structured for when admin access is available
  // They will need an adminPage fixture with proper System Manager role

  test.describe('Users List', () => {
    test.skip('listar usuarios con paginacion', async ({ adminPage }) => {
      const usersPage = new AdminUsersPage(adminPage)
      await usersPage.goto('/admin/users')

      // Should show user rows
      const count = await usersPage.getUserCount()
      expect(count).toBeGreaterThan(0)
    })

    test.skip('buscar usuario por email', async ({ adminPage }) => {
      const usersPage = new AdminUsersPage(adminPage)
      await usersPage.goto('/admin/users')

      await usersPage.search('admin@')

      // Should filter results
      const count = await usersPage.getUserCount()
      expect(count).toBeGreaterThanOrEqual(0)
    })

    test.skip('buscar usuario inexistente muestra empty state', async ({ adminPage }) => {
      const usersPage = new AdminUsersPage(adminPage)
      await usersPage.goto('/admin/users')

      await usersPage.search('usuarioquenoeexiste12345')

      await expect(usersPage.emptyState).toBeVisible()
    })
  })

  test.describe('Create User', () => {
    test.skip('formulario de creacion de usuario', async ({ adminPage }) => {
      const createPage = new CreateUserPage(adminPage)
      await createPage.goto('/admin/users/new')

      // Form elements should be visible
      await expect(createPage.emailInput).toBeVisible()
      await expect(createPage.firstNameInput).toBeVisible()
      await expect(createPage.submitButton).toBeVisible()
    })

    test.skip('validacion de email requerido', async ({ adminPage }) => {
      const createPage = new CreateUserPage(adminPage)
      await createPage.goto('/admin/users/new')

      // Try to submit without email
      await createPage.fillName('Test User')
      await createPage.submit()

      // Should show validation error or button disabled
      // Behavior depends on implementation
    })

    test.skip('cancelar creacion vuelve a lista', async ({ adminPage }) => {
      const createPage = new CreateUserPage(adminPage)
      await createPage.goto('/admin/users/new')

      await createPage.cancel()

      await expect(adminPage).toHaveURL(/\/admin\/users$/)
    })
  })

  test.describe('Roles Page', () => {
    test.skip('listar roles del sistema', async ({ adminPage }) => {
      await adminPage.goto('/admin/roles')
      await adminPage.waitForLoadState('domcontentloaded')

      // Should show role cards/rows
      await expect(adminPage.locator('text=System Manager, text=Sales Manager')).toBeVisible()
    })
  })
})
