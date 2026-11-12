import { useEffect, useState } from 'react'
import { api, errorMessage } from '../services/api'
import { ErrorNotice, Loading } from '../components/ui'
import { SessionContext } from './session-context'
export function SessionProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  async function restore() {
    setLoading(true)
    setError('')
    try {
      setUser((await api.get('/api/auth/me')).data.user)
    } catch (e) {
      if (e.response?.status !== 401) setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    const controller = new AbortController()
    api
      .get('/api/auth/me', { signal: controller.signal })
      .then((response) => {
        if (!controller.signal.aborted) setUser(response.data.user)
      })
      .catch((e) => {
        if (!controller.signal.aborted && e.response?.status !== 401)
          setError(errorMessage(e))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    const expire = () => setUser(null)
    window.addEventListener('session-expired', expire)
    return () => {
      controller.abort()
      window.removeEventListener('session-expired', expire)
    }
  }, [])
  async function login(credentials) {
    await api.get('/sanctum/csrf-cookie')
    setUser((await api.post('/api/auth/login', credentials)).data.user)
  }
  async function logout() {
    await api.post('/api/auth/logout')
    setUser(null)
  }
  if (loading) return <Loading />
  if (error)
    return (
      <main className="page">
        <ErrorNotice message={error} retry={restore} />
      </main>
    )
  return (
    <SessionContext.Provider value={{ user, login, logout }}>
      {children}
    </SessionContext.Provider>
  )
}
