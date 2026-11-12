import { date } from '../services/format'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, errorMessage } from '../services/api'
import { useResource } from '../services/use-resource'
import {
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Pagination,
} from '../components/ui'

export default function Inventory() {
  const { id } = useParams()
  const [page, setPage] = useState(1)
  const product = useResource(`/api/products/${id}`)
  const movements = useResource(
    `/api/products/${id}/inventory-movements?page=${page}`,
  )
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
    const values = Object.fromEntries(new FormData(form))
    values.quantity = Number(values.quantity)
    try {
      await api.post(`/api/products/${id}/inventory-movements`, values)
      form.reset()
      setSuccess('Movimiento registrado.')
      product.reload()
      movements.reload()
    } catch (e) {
      setError(errorMessage(e))
      setErrors(e.response?.data?.errors || {})
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <Link className="text-sm muted" to="/productos">
        ← Volver a productos
      </Link>
      <div className="page-heading mt-5">
        <div>
          <span className="eyebrow">INVENTARIO</span>
          <h1>{product.data?.data?.name || 'Movimientos del producto'}</h1>
          <p>
            Existencias actuales:{' '}
            <strong>{product.data?.data?.stock_on_hand ?? '—'}</strong>
          </p>
        </div>
      </div>
      <ErrorNotice message={product.error} retry={product.reload} />
      {success && (
        <div className="notice" role="status">
          {success}
        </div>
      )}
      {product.data && (
        <section className="panel">
          <h2 className="text-lg mb-5">Registrar movimiento</h2>
          <ErrorNotice message={error} />
          <form onSubmit={submit}>
            <fieldset disabled={pending}>
              <div className="form-grid">
                <Field label="Tipo" name="type" errors={errors}>
                  <option value="in">Entrada</option>
                  <option value="out">Salida</option>
                </Field>
                <Field
                  label="Cantidad"
                  name="quantity"
                  type="number"
                  min={1}
                  max={2147483647}
                  step={1}
                  required
                  errors={errors}
                />
                <Field
                  label="Motivo"
                  name="reason"
                  maxLength={255}
                  errors={errors}
                />
              </div>
              <div className="form-actions">
                <button className="button primary">
                  {pending ? 'Registrando…' : 'Registrar movimiento'}
                </button>
              </div>
            </fieldset>
          </form>
        </section>
      )}
      <section className="panel">
        <h2 className="text-lg mb-5">Historial de movimientos</h2>
        <ErrorNotice message={movements.error} retry={movements.reload} />
        {movements.loading ? (
          <Loading />
        ) : movements.data?.data?.length ? (
          <>
            <div
              className="table-wrap"
              role="region"
              aria-label="Tabla de registros"
              tabIndex={0}
            >
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Saldo anterior</th>
                    <th>Saldo posterior</th>
                    <th>Motivo / venta</th>
                    <th>Usuario</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.data.data.map((item) => (
                    <tr key={item.id}>
                      <td>{date(item.created_at)}</td>
                      <td>{item.type === 'in' ? 'Entrada' : 'Salida'}</td>
                      <td>{item.quantity}</td>
                      <td>{item.stock_before}</td>
                      <td>{item.stock_after}</td>
                      <td>
                        {item.sale_id ? (
                          <Link to={`/ventas/${item.sale_id}`}>
                            Venta #{item.sale_id}
                          </Link>
                        ) : (
                          item.reason || '—'
                        )}
                      </td>
                      <td>{item.user?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination data={movements.data} page={page} setPage={setPage} />
          </>
        ) : (
          !movements.error && <Empty />
        )}
      </section>
    </>
  )
}
