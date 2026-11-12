import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const accounts = JSON.parse(
  readFileSync(new URL('../e2e.local.json', import.meta.url)),
)
const suffix = Date.now()
let cookies, productId, saleId
const productName = `Producto E2E ${suffix}`
const clientName = `Cliente E2E ${suffix}`

async function login(page, email) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(email)
  await page.getByLabel('Contraseña', { exact: true }).fill(accounts.password)
  await page
    .getByRole('button', { name: 'Iniciar sesión', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Cerrar sesión' }),
  ).toBeVisible()
}
test.describe.serial('Demo local con API, PostgreSQL y realtime reales', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext()
    const page = await context.newPage()
    await login(page, accounts.admin)
    cookies = await context.cookies()
    await context.close()
  })
  test.beforeEach(async ({ context }) => {
    await context.addCookies(cookies)
  })

  test('restaura sesión, rutas internas y navegación móvil por teclado', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { name: 'Vista general', exact: true }),
    ).toBeVisible()
    await page.reload()
    await expect(
      page.getByRole('heading', { name: 'Vista general', exact: true }),
    ).toBeVisible()
    await page.screenshot({
      path: '../docs/evidencias/frontend/inicio-escritorio.png',
      fullPage: true,
    })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/clientes')
    await expect(
      page.getByRole('heading', { name: 'Clientes', exact: true }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Nuevo cliente' }).focus()
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Nombre', { exact: true })).toBeFocused()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: '../docs/evidencias/frontend/clientes-movil.png',
      fullPage: true,
    })
  })

  test('crea cliente, producto, entrada y venta; mantiene historia y stock', async ({
    page,
    context,
  }) => {
    await page.goto('/clientes')
    await page.getByRole('button', { name: 'Nuevo cliente' }).click()
    await page.getByLabel('Nombre', { exact: true }).fill(clientName)
    await page.getByRole('button', { name: 'Guardar registro' }).click()
    await expect(
      page.getByRole('cell', { name: clientName, exact: true }),
    ).toBeVisible()
    await page.goto('/productos')
    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    await page.getByLabel('Nombre', { exact: true }).fill(productName)
    await page.getByLabel('SKU', { exact: true }).fill(`E2E-${suffix}`)
    await page.getByLabel('Precio unitario', { exact: true }).fill('12.50')
    await page.getByLabel('Stock inicial').fill('10')
    await page.getByRole('button', { name: 'Guardar registro' }).click()
    const row = page.getByRole('row').filter({ hasText: productName })
    await expect(row).toContainText('10')
    const inventoryLink = await row
      .getByRole('link', { name: 'Inventario' })
      .getAttribute('href')
    productId = Number(inventoryLink.split('/')[2])
    await row.getByRole('link', { name: 'Inventario' }).click()
    await page.getByLabel('Cantidad', { exact: true }).fill('5')
    await page.getByLabel('Motivo').fill('Entrada E2E')
    await page
      .getByRole('button', { name: 'Registrar movimiento', exact: true })
      .click()
    await expect(page.getByText('Existencias actuales:')).toContainText('15')
    // Same-business second session receives sale.created and refreshes its list.
    const observer = await context.newPage()
    await observer.goto('/ventas')
    await expect(
      observer.getByText('En tiempo real', { exact: true }),
    ).toBeVisible()
    await page.goto('/ventas/nueva')
    await page.getByRole('button', { name: 'Elegir cliente' }).click()
    await page.getByRole('button').filter({ hasText: clientName }).click()
    await page.getByRole('button').filter({ hasText: productName }).click()
    await page.getByLabel(`Cantidad de ${productName}`).fill('2')
    await page
      .getByRole('button', { name: 'Confirmar venta', exact: true })
      .click()
    await expect(page).toHaveURL(/\/ventas\/\d+$/)
    saleId = Number(new URL(page.url()).pathname.split('/')[2])
    await expect(page.getByText('30.00', { exact: true })).toHaveCount(0)
    await expect(page.getByText('25.00', { exact: true })).toHaveCount(2)
    await expect(observer.getByRole('status')).toContainText(`venta #${saleId}`)
    await expect(
      observer.getByRole('cell', { name: `#${saleId}`, exact: true }),
    ).toBeVisible()
    await page.screenshot({
      path: '../docs/evidencias/frontend/venta-confirmada.png',
      fullPage: true,
    })
    await observer.close()
    await page.goto(`/productos/${productId}/inventario`)
    await expect(page.getByText('Existencias actuales:')).toContainText('13')
    await expect(
      page.getByRole('link', { name: `Venta #${saleId}`, exact: true }),
    ).toBeVisible()
  })

  test('rechaza falta de stock y registra venta de mostrador', async ({
    page,
    browser,
  }) => {
    const observerContext = await browser.newContext()
    await observerContext.addCookies(cookies)
    const observer = await observerContext.newPage()
    let offline = false
    const sockets = []
    await observer.routeWebSocket('**/socket.io/**', (route) => {
      if (offline) {
        route.close()
        return
      }
      sockets.push({ client: route, server: route.connectToServer() })
    })
    await observer.goto('/ventas')
    await expect(
      observer.getByText('En tiempo real', { exact: true }),
    ).toBeVisible()
    offline = true
    for (const socket of sockets) {
      await socket.client.close()
      await socket.server.close()
    }
    await expect(
      observer.getByText('Sin conexión en tiempo real', { exact: true }),
    ).toBeVisible()
    await page.goto('/ventas/nueva')
    await page.getByRole('button').filter({ hasText: productName }).click()
    await page.getByLabel(`Cantidad de ${productName}`).fill('1000')
    await page
      .getByRole('button', { name: 'Confirmar venta', exact: true })
      .click()
    await expect(page.getByText(/No hay existencias suficientes/)).toBeVisible()
    await page.getByLabel(`Cantidad de ${productName}`).fill('1')
    await page
      .getByRole('button', { name: 'Confirmar venta', exact: true })
      .click()
    await expect(page).toHaveURL(/\/ventas\/\d+$/)
    await expect(page.getByText('Mostrador', { exact: true })).toBeVisible()
    const missedId = new URL(page.url()).pathname.split('/')[2]
    offline = false
    await expect(
      observer.getByText('En tiempo real', { exact: true }),
    ).toBeVisible({ timeout: 20000 })
    await expect(
      observer.getByRole('cell', { name: `#${missedId}`, exact: true }),
    ).toBeVisible()
    await observerContext.close()
    await page.goto(`/productos/${productId}/inventario`)
    await expect(page.getByText('Existencias actuales:')).toContainText('12')
  })

  test('archiva sin borrar historia y crea usuarios; búsqueda y paginación', async ({
    page,
    context,
  }) => {
    await page.goto('/productos')
    const row = page.getByRole('row').filter({ hasText: productName })
    await row.getByRole('button', { name: 'Editar' }).click()
    await page.getByLabel('Estado', { exact: true }).selectOption('false')
    await page
      .getByLabel('Nombre', { exact: true })
      .fill(`${productName} archivado`)
    await page.getByLabel('Precio unitario').fill('99.00')
    await page.getByRole('button', { name: 'Guardar registro' }).click()
    await expect(row).toContainText('Archivado')
    await page.setViewportSize({ width: 390, height: 844 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
    await page.screenshot({
      path: '../docs/evidencias/frontend/productos-movil.png',
      fullPage: true,
    })
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.goto(`/ventas/${saleId}`)
    await expect(
      page.getByRole('cell', { name: productName, exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: '12.50', exact: true }),
    ).toBeVisible()
    await page.goto('/usuarios')
    await page.getByLabel('Nombre', { exact: true }).fill('Colaborador E2E')
    await page
      .getByLabel('Correo electrónico', { exact: true })
      .fill(`staff-${suffix}@example.test`)
    await page
      .getByLabel('Contraseña (mínimo 12 caracteres)')
      .fill(accounts.password)
    await page
      .getByRole('button', { name: 'Crear cuenta', exact: true })
      .click()
    await expect(
      page.getByRole('cell', {
        name: `staff-${suffix}@example.test`,
        exact: true,
      }),
    ).toBeVisible()
    await page.goto('/clientes')
    await page.getByLabel('Buscar por nombre', { exact: true }).fill(clientName)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await expect(
      page.getByRole('cell', { name: clientName, exact: true }),
    ).toBeVisible()
    const csrf = (await context.cookies()).find(
      (cookie) => cookie.name === 'XSRF-TOKEN',
    )
    for (let i = 0; i < 16; i++) {
      const response = await context.request.post('/api/clients', {
        headers: {
          Accept: 'application/json',
          Origin: new URL(page.url()).origin,
          'X-XSRF-TOKEN': decodeURIComponent(csrf.value),
        },
        data: { name: `Paginado ${suffix} ${String(i).padStart(2, '0')}` },
      })
      expect(response.status()).toBe(201)
    }
    await page.goto('/clientes')
    await page
      .getByLabel('Buscar por nombre', { exact: true })
      .fill(`Paginado ${suffix}`)
    await page.getByRole('button', { name: 'Buscar', exact: true }).click()
    await page.getByRole('button', { name: 'Página siguiente' }).click()
    await expect(
      page.getByText('Página 2 de 2', { exact: false }),
    ).toBeVisible()
    await expect(
      page.getByRole('cell', { name: `Paginado ${suffix} 15`, exact: true }),
    ).toBeVisible()
  })

  test('aplica roles, aislamiento de negocios, cuenta sin negocio y logout', async ({
    browser,
    page,
  }) => {
    const otherContext = await browser.newContext()
    const other = await otherContext.newPage()
    await login(other, accounts.other)
    await other.goto('/ventas')
    await expect(
      other.getByText('En tiempo real', { exact: true }),
    ).toBeVisible()
    await expect(
      other.getByRole('cell', { name: `#${saleId}`, exact: true }),
    ).toHaveCount(0)
    await other.goto(`/ventas/${saleId}`)
    await expect(other.getByRole('alert')).toContainText(
      'ya no está disponible',
    )
    await other.goto(`/productos/${productId}/inventario`)
    await expect(other.getByRole('alert').first()).toContainText(
      'ya no está disponible',
    )
    await otherContext.close()

    const staffContext = await browser.newContext()
    const staff = await staffContext.newPage()
    await login(staff, accounts.staff)
    await expect(
      staff.getByRole('link', { name: 'Usuarios', exact: true }),
    ).toHaveCount(0)
    await staff.goto('/usuarios')
    await expect(
      staff.getByRole('heading', { name: 'Acceso denegado' }),
    ).toBeVisible()
    await staff.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(
      staff.getByRole('heading', { name: 'Entra a tu espacio' }),
    ).toBeVisible()
    await staffContext.close()

    const unassignedContext = await browser.newContext()
    const unassigned = await unassignedContext.newPage()
    await login(unassigned, accounts.unassigned)
    await expect(
      unassigned.getByRole('heading', {
        name: 'Tu cuenta necesita un negocio',
      }),
    ).toBeVisible()
    await unassignedContext.close()
    await page.goto('/productos')
    await page.getByRole('button', { name: 'Cerrar sesión' }).click()
    await expect(
      page.getByRole('heading', { name: 'Entra a tu espacio' }),
    ).toBeVisible()
    await page.goto('/productos')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByText(productName, { exact: true })).toHaveCount(0)
  })

  test('muestra el límite real de intentos de login', async ({ page }) => {
    await page.goto('/login')
    await page
      .getByLabel('Correo electrónico', { exact: true })
      .fill('inexistente@example.test')
    await page
      .getByLabel('Contraseña', { exact: true })
      .fill('wrong-test-password')
    let limited = false
    for (let i = 0; i < 6; i++) {
      const [response] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url().endsWith('/api/auth/login') &&
            response.request().method() === 'POST',
        ),
        page
          .getByRole('button', { name: 'Iniciar sesión', exact: true })
          .click(),
      ])
      expect([422, 429]).toContain(response.status())
      if (response.status() === 429) {
        limited = true
        break
      }
    }
    expect(limited).toBe(true)
    await expect(page.getByRole('alert')).toContainText('Demasiados intentos')
  })
})
