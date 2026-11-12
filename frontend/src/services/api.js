import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || window.location.origin,
  withCredentials: true,
  withXSRFToken: true,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401)
      window.dispatchEvent(new Event('session-expired'))
    if (
      error.response?.status === 419 &&
      error.config?.url !== '/sanctum/csrf-cookie'
    ) {
      // Never replay mutations: their outcome can be uncertain.
      await api.get('/sanctum/csrf-cookie').catch(() => {})
    }
    return Promise.reject(error)
  },
)
export function errorMessage(error) {
  return (
    {
      401: 'Tu sesión ha terminado. Vuelve a iniciar sesión.',
      403: 'No tienes permiso para realizar esta acción.',
      404: 'El recurso ya no está disponible.',
      419: 'Se renovó la protección de sesión. Revisa los datos e inténtalo de nuevo.',
      422: 'Revisa los campos indicados.',
      429: 'Demasiados intentos. Espera un minuto antes de continuar.',
    }[error.response?.status] ||
    'No pudimos completar la solicitud. Comprueba la conexión e inténtalo de nuevo.'
  )
}
