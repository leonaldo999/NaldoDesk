import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Catalog from './Catalog'
import Users from './Users'
import { NewSale } from './Sales'
import { amount } from '../services/format'
import { api } from '../services/api'

vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
  errorMessage: () => 'Revisa los campos indicados.',
}))
const session = { user: { role: 'staff' } }
vi.mock('../app/session-context', () => ({ useSession: () => session }))
const page = (data) => ({
  data: { data, current_page: 1, last_page: 1, total: data.length },
})
const renderPage = (node) => render(<MemoryRouter>{node}</MemoryRouter>)

beforeEach(() => {
  vi.clearAllMocks()
  session.user.role = 'staff'
})
describe('Catálogo', () => {
  it('muestra carga, vacío y búsqueda sin inventar registros', async () => {
    let resolve
    api.get.mockReturnValueOnce(
      new Promise((done) => {
        resolve = done
      }),
    )
    renderPage(<Catalog kind="clients" />)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
    resolve(page([]))
    expect(
      await screen.findByText('Todavía no hay clientes'),
    ).toBeInTheDocument()
    api.get.mockResolvedValue(page([]))
    await userEvent.type(screen.getByLabelText('Buscar por nombre'), 'Ana')
    await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
    await waitFor(() =>
      expect(api.get).toHaveBeenLastCalledWith(
        '/api/clients?page=1&search=Ana',
        expect.anything(),
      ),
    )
  })
  it('permite recuperar una consulta fallida', async () => {
    api.get
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(page([]))
    renderPage(<Catalog kind="clients" />)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(
      await screen.findByText('Todavía no hay clientes'),
    ).toBeInTheDocument()
  })
  it('asocia errores 422 a los campos y conserva datos del formulario', async () => {
    api.get.mockResolvedValue(page([]))
    api.post.mockRejectedValue({
      response: {
        status: 422,
        data: { errors: { name: ['El nombre no es válido.'] } },
      },
    })
    renderPage(<Catalog kind="clients" />)
    await userEvent.click(screen.getByRole('button', { name: 'Nuevo cliente' }))
    await userEvent.type(
      screen.getByLabelText('Nombre', { exact: true }),
      'Cliente',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar registro' }),
    )
    const input = screen.getByLabelText('Nombre', { exact: true })
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'))
    expect(input).toHaveAccessibleDescription('El nombre no es válido.')
    expect(input).toHaveValue('Cliente')
  })
})
it('deniega usuarios a staff sin solicitar los datos administrativos', () => {
  renderPage(<Users />)
  expect(
    screen.getByRole('heading', { name: 'Acceso denegado' }),
  ).toBeInTheDocument()
  expect(api.get).not.toHaveBeenCalled()
})
it('conserva centavos exactos de importes grandes', () => {
  expect(amount('999999999999.99')).toBe('999 999 999 999.99')
})
it('bloquea el reenvío de una venta cuyo resultado es incierto', async () => {
  api.get.mockResolvedValue(
    page([
      {
        id: 1,
        name: 'Producto',
        sku: 'TEST',
        is_active: true,
        stock_on_hand: 5,
        price: '10.01',
      },
    ]),
  )
  api.post.mockRejectedValue(new Error('timeout'))
  renderPage(<NewSale />)
  await userEvent.click(
    await screen.findByRole('button', { name: /Producto.*TEST/ }),
  )
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar venta' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Consulta el historial',
  )
  expect(screen.getByRole('button', { name: 'Confirmar venta' })).toBeDisabled()
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/sales', {
    client_id: null,
    items: [{ product_id: 1, quantity: 1 }],
  })
})
