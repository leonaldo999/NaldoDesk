import { useState } from 'react'
import { useSession } from '../app/session-context'
import { api, errorMessage } from '../services/api'
import { useResource } from '../services/use-resource'
import { Empty, ErrorNotice, Field, Loading } from '../components/ui'

export default function Users() {
  const { user } = useSession()
  return user.role === 'admin' ? (
    <AdminUsers />
  ) : (
    <section className="panel">
      <h1>Acceso denegado</h1>
      <p>Solo un administrador puede gestionar usuarios.</p>
    </section>
  )
}
function AdminUsers() {
  const resource = useResource('/api/users')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [success, setSuccess] = useState('')
  async function submit(event) {
    event.preventDefault()
    setPending(true)
    setError('')
    setErrors({})
    setSuccess('')
    const form = event.currentTarget
    try {
      await api.post('/api/users', Object.fromEntries(new FormData(form)))
      form.reset()
      setSuccess('Cuenta creada en tu negocio.')
      resource.reload()
    } catch (e) {
      setError(errorMessage(e))
      setErrors(e.response?.data?.errors || {})
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">ADMINISTRACIÓN</span>
          <h1>Usuarios</h1>
          <p>Las cuentas que trabajan contigo.</p>
        </div>
      </div>
      {success && (
        <div className="notice" role="status">
          {success}
        </div>
      )}
      <section className="panel">
        <h2 className="text-lg mb-5">Crear cuenta</h2>
        <ErrorNotice message={error} />
        <form onSubmit={submit}>
          <fieldset disabled={pending}>
            <div className="form-grid">
              <Field
                label="Nombre"
                name="name"
                required
                maxLength={255}
                errors={errors}
              />
              <Field
                label="Correo electrónico"
                name="email"
                type="email"
                required
                maxLength={255}
                errors={errors}
              />
              <Field
                label="Contraseña (mínimo 12 caracteres)"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                errors={errors}
              />
              <Field
                label="Rol"
                name="role"
                defaultValue="staff"
                errors={errors}
              >
                <option value="staff">Colaborador</option>
                <option value="admin">Administrador</option>
              </Field>
            </div>
            <div className="form-actions">
              <button className="button primary">
                {pending ? 'Creando…' : 'Crear cuenta'}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
      <section className="panel">
        <ErrorNotice message={resource.error} retry={resource.reload} />
        {resource.loading ? (
          <Loading />
        ) : resource.data?.data?.length ? (
          <div
            className="table-wrap"
            role="region"
            aria-label="Tabla de registros"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                </tr>
              </thead>
              <tbody>
                {resource.data.data.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td>{item.email}</td>
                    <td>
                      {item.role === 'admin' ? 'Administrador' : 'Colaborador'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          !resource.error && <Empty />
        )}
      </section>
    </>
  )
}
