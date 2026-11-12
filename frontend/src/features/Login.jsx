import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ArrowRight, Layers3 } from 'lucide-react'
import { useSession } from '../app/session-context'
import { Field, ErrorNotice } from '../components/ui'
import { errorMessage } from '../services/api'
export default function Login() {
  const { user, login } = useSession()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  if (user) return <Navigate to="/" replace />
  async function submit(event) {
    event.preventDefault()
    setPending(true)
    setError('')
    setErrors({})
    try {
      await login(Object.fromEntries(new FormData(event.currentTarget)))
    } catch (e) {
      setError(errorMessage(e))
      setErrors(e.response?.data?.errors || {})
    } finally {
      setPending(false)
    }
  }
  return (
    <main className="login">
      <section className="login-story">
        <div className="brand">
          <Layers3 /> NaldoDesk<span>GESTIÓN</span>
        </div>
        <div>
          <span className="eyebrow">MENOS FRICCIÓN. MÁS NEGOCIO.</span>
          <h1>
            Tu negocio,
            <br />
            en buen orden.
          </h1>
          <p>
            Clientes, productos y ventas en un solo lugar.
            <br />
            Una forma más clara de llevar el día a día.
          </p>
        </div>
        <small>HECHO PARA PEQUEÑOS NEGOCIOS</small>
      </section>
      <section className="login-form">
        <div className="w-full max-w-sm">
          <span className="eyebrow">BIENVENIDO A NALDODESK</span>
          <h2>Entra a tu espacio</h2>
          <p className="muted mb-8">Usa la cuenta asignada a tu negocio.</p>
          <ErrorNotice message={error} />
          <form onSubmit={submit}>
            <Field
              label="Correo electrónico"
              name="email"
              type="email"
              autoComplete="username"
              required
              errors={errors}
            />
            <Field
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              errors={errors}
            />
            <button disabled={pending} className="button primary w-full mt-3">
              {pending ? 'Entrando…' : 'Iniciar sesión'}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="login-help">
            ¿Necesitas una cuenta? Solicita acceso al administrador de tu
            negocio.
          </p>
        </div>
      </section>
    </main>
  )
}
