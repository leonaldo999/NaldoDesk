import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Pagination,
} from '../components/ui'
import { amount } from '../services/format'
import { useResource } from '../services/use-resource'

function limaToday() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(
    new Date(),
  )
}

export default function Reports() {
  const [period, setPeriod] = useState(() => {
    const to = limaToday()
    return { from: to.slice(0, 8) + '01', to }
  })
  const [threshold, setThreshold] = useState(5)
  const [page, setPage] = useState(1)
  const sales = useResource('/api/reports/sales?' + new URLSearchParams(period))
  const stock = useResource(
    '/api/reports/low-stock?' + new URLSearchParams({ threshold, page }),
  )
  const [validation, setValidation] = useState('')

  function applyPeriod(event) {
    event.preventDefault()
    const { from, to } = Object.fromEntries(new FormData(event.currentTarget))
    const days = (Date.parse(to) - Date.parse(from)) / 86400000 + 1
    if (days < 1 || days > 366) {
      setValidation('Elige un período válido de hasta 366 días.')
      return
    }
    setValidation('')
    setPeriod({ from, to })
  }

  return (
    <>
      <section className="panel">
        <h1>Reportes</h1>
        <h2>Ventas por período</h2>
        <p>Ambas fechas se incluyen. Horario de Lima.</p>
        <form onSubmit={applyPeriod} className="flex flex-wrap items-end gap-3">
          <Field
            label="Desde"
            name="from"
            type="date"
            required
            defaultValue={period.from}
          />
          <Field
            label="Hasta"
            name="to"
            type="date"
            required
            defaultValue={period.to}
          />
          <button className="button primary">Consultar ventas</button>
        </form>
        <ErrorNotice message={validation} />
        <ErrorNotice message={sales.error} retry={sales.reload} />
        {sales.loading && <Loading />}
        {sales.data && (
          <dl className="mt-5 grid grid-cols-2 gap-4" aria-live="polite">
            <div>
              <dt>Ventas registradas</dt>
              <dd className="text-2xl font-semibold">
                {sales.data.data.sale_count}
              </dd>
            </div>
            <div>
              <dt>Importe total</dt>
              <dd className="text-2xl font-semibold">
                {amount(sales.data.data.total)}
              </dd>
            </div>
          </dl>
        )}
      </section>
      <section className="panel">
        <h2>Productos con stock bajo</h2>
        <p>
          Incluye productos activos con existencias iguales o inferiores al
          umbral.
        </p>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            setThreshold(
              Number(new FormData(event.currentTarget).get('threshold')),
            )
            setPage(1)
          }}
        >
          <Field
            label="Umbral de unidades"
            name="threshold"
            type="number"
            min="0"
            max="1000000"
            step="1"
            required
            defaultValue={threshold}
          />
          <button className="button primary">Consultar stock</button>
        </form>
        <ErrorNotice message={stock.error} retry={stock.reload} />
        {stock.loading && <Loading />}
        {stock.data && (
          <>
            {stock.data.data.length === 0 ? (
              <Empty
                title="No hay productos con stock bajo en esta página"
                text="Prueba otro umbral o revisa el catálogo."
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Producto</th>
                      <th scope="col">SKU</th>
                      <th scope="col">Unidades</th>
                      <th scope="col">Inventario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.data.data.map((product) => (
                      <tr key={product.id}>
                        <td>{product.name}</td>
                        <td>{product.sku}</td>
                        <td>{product.stock_on_hand}</td>
                        <td>
                          <Link to={'/productos/' + product.id + '/inventario'}>
                            Ver inventario de {product.name}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <Pagination data={stock.data} page={page} setPage={setPage} />
          </>
        )}
      </section>
    </>
  )
}
