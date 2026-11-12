import { amount, date } from '../services/format'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { api, errorMessage } from '../services/api'
import { useResource } from '../services/use-resource'
import {
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Pagination,
} from '../components/ui'

export function SalesList() {
  const [page, setPage] = useState(1)
  const resource = useResource(`/api/sales?page=${page}`)
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MOVIMIENTO DEL NEGOCIO</span>
          <h1>Ventas</h1>
          <p>Cada operación, con su historia.</p>
        </div>
        <Link className="button primary" to="/ventas/nueva">
          <Plus size={17} />
          Registrar venta
        </Link>
      </div>
      <section className="panel">
        <ErrorNotice message={resource.error} retry={resource.reload} />
        {resource.loading ? (
          <Loading />
        ) : resource.data?.data?.length ? (
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
                    <th>Venta</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Registrada por</th>
                    <th>Total</th>
                    <th>Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.data.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td>{date(item.created_at)}</td>
                      <td>{item.client?.name || 'Mostrador'}</td>
                      <td>{item.user?.name}</td>
                      <td>{amount(item.total)}</td>
                      <td>
                        <Link
                          className="button secondary"
                          to={`/ventas/${item.id}`}
                        >
                          Ver venta
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination data={resource.data} page={page} setPage={setPage} />
          </>
        ) : (
          !resource.error && (
            <Empty
              title="Tu próxima venta empieza aquí"
              text="Registra una venta y consulta aquí su detalle."
            />
          )
        )}
      </section>
    </>
  )
}
export function SaleDetail() {
  const { id } = useParams()
  const resource = useResource(`/api/sales/${id}`)
  const sale = resource.data?.data
  return (
    <>
      <Link className="text-sm muted" to="/ventas">
        ← Volver a ventas
      </Link>
      <div className="page-heading mt-5">
        <div>
          <span className="eyebrow">REGISTRO HISTÓRICO</span>
          <h1>Venta #{id}</h1>
          <p>{sale && date(sale.created_at)}</p>
        </div>
      </div>
      <ErrorNotice message={resource.error} retry={resource.reload} />
      {resource.loading && <Loading />}
      {sale && (
        <section className="panel">
          <div className="form-grid">
            <p>
              Cliente
              <br />
              <strong>{sale.client?.name || 'Mostrador'}</strong>
            </p>
            <p>
              Registrada por
              <br />
              <strong>{sale.user?.name}</strong>
            </p>
          </div>
          <div
            className="table-wrap"
            role="region"
            aria-label="Tabla de registros"
            tabIndex={0}
          >
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>SKU</th>
                  <th>Cantidad</th>
                  <th>Precio unitario</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{item.product_sku}</td>
                    <td>{item.quantity}</td>
                    <td>{amount(item.unit_price)}</td>
                    <td>{amount(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-right mt-6">
            Total confirmado{' '}
            <strong className="text-2xl ml-4">{amount(sale.total)}</strong>
          </p>
          <p className="mt-6">
            Los precios y nombres corresponden al momento de la venta.
          </p>
        </section>
      )}
    </>
  )
}

// Search and pagination avoid silently restricting selection to the first page.
function Picker({ kind, onSelect }) {
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const resource = useResource(
    `/api/${kind}?search=${encodeURIComponent(query)}&page=${page}&per_page=10`,
  )
  const products = kind === 'products'
  return (
    <div>
      <form
        className="toolbar"
        onSubmit={(e) => {
          e.preventDefault()
          setPage(1)
          setQuery(search)
        }}
      >
        <Field
          name={`search-${kind}`}
          label={
            products
              ? 'Buscar producto por nombre o SKU'
              : 'Buscar cliente por nombre'
          }
          maxLength={100}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="button secondary">Buscar</button>
      </form>
      <ErrorNotice message={resource.error} retry={resource.reload} />
      {resource.loading ? (
        <Loading />
      ) : (
        <>
          <div className="picker-results">
            {resource.data?.data
              ?.filter((item) => item.is_active)
              .map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="picker-option"
                  onClick={() => onSelect(item)}
                >
                  <strong>{item.name}</strong>
                  <span>
                    {products
                      ? `${item.sku} · Stock ${item.stock_on_hand} · ${amount(item.price)}`
                      : item.email || 'Seleccionar'}{' '}
                    <Plus size={15} />
                  </span>
                </button>
              ))}
          </div>
          {!resource.data?.data?.some((item) => item.is_active) &&
            !resource.error && (
              <Empty
                title="No hay registros activos en esta página"
                text="Cambia de página o prueba otra búsqueda."
              />
            )}
          <Pagination data={resource.data} page={page} setPage={setPage} />
        </>
      )}
    </div>
  )
}
export function NewSale() {
  const navigate = useNavigate()
  const [client, setClient] = useState(null)
  const [showClients, setShowClients] = useState(false)
  const [items, setItems] = useState([])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  const [uncertain, setUncertain] = useState(false)
  function add(product) {
    setItems((current) =>
      current.some((item) => item.product.id === product.id)
        ? current
        : [...current, { product, quantity: '1' }],
    )
  }
  const total = items.reduce((sum, item) => {
    const cents = BigInt(item.product.price.replace('.', ''))
    return (
      sum + cents * BigInt(/^\d+$/.test(item.quantity) ? item.quantity : '0')
    )
  }, 0n)
  async function submit(event) {
    event.preventDefault()
    if (pending || uncertain) return
    setPending(true)
    setError('')
    setErrors({})
    try {
      const response = await api.post('/api/sales', {
        client_id: client?.id || null,
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: Number(item.quantity),
        })),
      })
      navigate(`/ventas/${response.data.data.id}`)
    } catch (e) {
      if (!e.response || e.response.status >= 500) {
        setUncertain(true)
        setError(
          'No se pudo confirmar el resultado de la venta. Consulta el historial antes de volver a registrarla.',
        )
      } else {
        setError(errorMessage(e))
        setErrors(e.response?.data?.errors || {})
      }
    } finally {
      setPending(false)
    }
  }
  return (
    <>
      <Link className="text-sm muted" to="/ventas">
        ← Volver a ventas
      </Link>
      <div className="page-heading mt-5">
        <div>
          <span className="eyebrow">UNA NUEVA OPERACIÓN</span>
          <h1>Registrar venta</h1>
          <p>Los precios y las existencias se validan al confirmar.</p>
        </div>
      </div>
      <fieldset disabled={pending || uncertain}>
        <section className="panel">
          <div className="section-heading mt-0">
            <h2>1. Cliente</h2>
            <button
              type="button"
              className="button secondary"
              onClick={() => setShowClients(!showClients)}
            >
              {showClients ? 'Cerrar búsqueda' : 'Elegir cliente'}
            </button>
          </div>
          <p>
            {client ? client.name : 'Venta de mostrador · sin cliente asignado'}
          </p>
          {client && (
            <button
              type="button"
              className="button secondary mb-4"
              onClick={() => setClient(null)}
            >
              Quitar cliente
            </button>
          )}
          {showClients && (
            <Picker
              kind="clients"
              onSelect={(value) => {
                setClient(value)
                setShowClients(false)
              }}
            />
          )}
        </section>
        <section className="panel">
          <h2 className="text-lg mb-5">2. Productos</h2>
          <Picker kind="products" onSelect={add} />
        </section>
      </fieldset>
      <section className="panel">
        <h2 className="text-lg mb-5">3. Revisar y confirmar</h2>
        <ErrorNotice message={error} />
        {uncertain && (
          <Link className="button secondary mb-4" to="/ventas">
            Consultar historial de ventas
          </Link>
        )}
        <form onSubmit={submit}>
          <fieldset disabled={pending || uncertain}>
            {items.length ? (
              <div
                className="table-wrap"
                role="region"
                aria-label="Tabla de registros"
                tabIndex={0}
              >
                <table>
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Precio</th>
                      <th>Cantidad</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.product.id}>
                        <td>
                          {item.product.name}
                          <div className="field-error">
                            {errors[`items.${index}.product_id`]?.[0]}
                          </div>
                        </td>
                        <td>{amount(item.product.price)}</td>
                        <td>
                          <Field
                            label={`Cantidad de ${item.product.name}`}
                            name={`items.${index}.quantity`}
                            type="number"
                            min={1}
                            max={1000000}
                            step={1}
                            value={item.quantity}
                            required
                            errors={errors}
                            onChange={(e) =>
                              setItems((current) =>
                                current.map((row, i) =>
                                  i === index
                                    ? { ...row, quantity: e.target.value }
                                    : row,
                                ),
                              )
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="button secondary"
                            aria-label={`Quitar ${item.product.name}`}
                            onClick={() =>
                              setItems((current) =>
                                current.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Empty
                title="Elige al menos un producto"
                text="Busca arriba y selecciona los productos de la venta."
              />
            )}
            {Object.entries(errors)
              .filter(
                ([key]) => !key.match(/^items\.\d+\.(quantity|product_id)$/),
              )
              .map(([key, messages]) => (
                <p className="field-error" key={key}>
                  {messages[0]}
                </p>
              ))}
            <p className="text-right mt-6">
              Total estimado{' '}
              <strong className="text-2xl ml-4">
                {amount(
                  `${total / 100n}.${String(total % 100n).padStart(2, '0')}`,
                )}
              </strong>
            </p>
            <div className="form-actions">
              <Link className="button secondary" to="/ventas">
                Cancelar
              </Link>
              <button
                className="button primary"
                disabled={!items.length || pending || uncertain}
              >
                {pending ? 'Confirmando…' : 'Confirmar venta'}
              </button>
            </div>
          </fieldset>
        </form>
      </section>
    </>
  )
}
