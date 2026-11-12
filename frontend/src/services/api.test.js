import { describe, it, expect, vi } from 'vitest'
import { api, errorMessage } from './api'
describe('HTTP compartido', () => {
  it('renueva CSRF ante 419 sin repetir la escritura', async () => {
    const adapter = vi.fn((config) =>
      config.url === '/sanctum/csrf-cookie'
        ? Promise.resolve({ status: 204, data: null, config, headers: {} })
        : Promise.reject({ config, response: { status: 419 } }),
    )
    const original = api.defaults.adapter
    api.defaults.adapter = adapter
    try {
      await expect(api.post('/api/sales', { items: [] })).rejects.toMatchObject(
        { response: { status: 419 } },
      )
      expect(
        adapter.mock.calls.map(([config]) => [config.method, config.url]),
      ).toEqual([
        ['post', '/api/sales'],
        ['get', '/sanctum/csrf-cookie'],
      ])
    } finally {
      api.defaults.adapter = original
    }
  })
  it('habilita sesión y CSRF sin tokens persistidos por la aplicación', () => {
    expect(api.defaults.withCredentials).toBe(true)
    expect(api.defaults.withXSRFToken).toBe(true)
  })
  it.each([401, 403, 404, 419, 422, 429])(
    'explica la respuesta %i',
    (status) => {
      expect(errorMessage({ response: { status } })).not.toContain('conexión')
    },
  )
})
