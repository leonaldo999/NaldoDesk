import { it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SessionProvider } from './session'
import { useSession } from './session-context'
import { api } from '../services/api'
vi.mock('../services/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  errorMessage: () => 'No hay conexión.',
}))
function Consumer() {
  const { user, login, logout } = useSession()
  return (
    <>
      <p>{user?.name || 'Sin sesión'}</p>
      <button
        onClick={() =>
          login({ email: 'demo@example.test', password: 'test-only-password' })
        }
      >
        Entrar
      </button>
      <button onClick={logout}>Salir</button>
    </>
  )
}
beforeEach(() => vi.clearAllMocks())
it('restaura la sesión y elimina los datos al expirar', async () => {
  api.get.mockResolvedValue({ data: { user: { id: 1, name: 'Cuenta demo' } } })
  render(
    <SessionProvider>
      <Consumer />
    </SessionProvider>,
  )
  expect(await screen.findByText('Cuenta demo')).toBeInTheDocument()
  act(() => window.dispatchEvent(new Event('session-expired')))
  expect(screen.getByText('Sin sesión')).toBeInTheDocument()
})
it('solicita CSRF antes del login y limpia la sesión al salir', async () => {
  api.get
    .mockRejectedValueOnce({ response: { status: 401 } })
    .mockResolvedValue({ data: {} })
  api.post
    .mockResolvedValueOnce({ data: { user: { name: 'Cuenta demo' } } })
    .mockResolvedValue({ data: {} })
  render(
    <SessionProvider>
      <Consumer />
    </SessionProvider>,
  )
  await screen.findByText('Sin sesión')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(await screen.findByText('Cuenta demo')).toBeInTheDocument()
  expect(api.get).toHaveBeenLastCalledWith('/sanctum/csrf-cookie')
  expect(api.get.mock.invocationCallOrder[1]).toBeLessThan(
    api.post.mock.invocationCallOrder[0],
  )
  await userEvent.click(screen.getByRole('button', { name: 'Salir' }))
  expect(await screen.findByText('Sin sesión')).toBeInTheDocument()
})
it('ofrece recuperación de fallo de red al restaurar', async () => {
  api.get
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue({ data: { user: null } })
  render(
    <SessionProvider>
      <Consumer />
    </SessionProvider>,
  )
  expect(await screen.findByRole('alert')).toHaveTextContent('No hay conexión.')
  await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
  expect(await screen.findByText('Sin sesión')).toBeInTheDocument()
})
