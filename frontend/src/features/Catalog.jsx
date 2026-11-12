import { amount } from '../services/format'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { api, errorMessage } from '../services/api'
import { useResource } from '../services/use-resource'
import {
  Badge,
  Empty,
  ErrorNotice,
  Field,
  Loading,
  Pagination,
} from '../components/ui'

export default function Catalog({ kind }) {
  const trigger = useRef(null)
  const createButton = useRef(null)
  const products = kind === 'products'
  const title = products ? 'Productos' : 'Clientes'
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [success, setSuccess] = useState('')
  const resource = useResource(
    `/api/${kind}?page=${page}&search=${encodeURIComponent(query)}`,
  )
  function done() {
    setEditing(null)
    setSuccess('Registro guardado correctamente.')
    resource.reload()
    createButton.current?.focus()
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU NEGOCIO, EN ORDEN</span>
          <h1>{title}</h1>
          <p>
            {products
              ? 'Tu catálogo y las existencias, en un mismo lugar.'
              : 'Mantén cerca la información de tus clientes.'}
          </p>
        </div>
        <button
          className="button primary"
          ref={createButton}
          onClick={(event) => {
            trigger.current = event.currentTarget
            setSuccess('')
            setEditing({})
          }}
        >
          <Plus size={17} />
          {products ? 'Nuevo producto' : 'Nuevo cliente'}
        </button>
      </div>
      {success && (
        <div className="notice" role="status">
          {success}
        </div>
      )}
      {editing && (
        <CatalogForm
          key={editing.id || 'new'}
          products={products}
          record={editing}
          onDone={done}
          onCancel={() => {
            setEditing(null)
            trigger.current?.focus()
          }}
        />
      )}
      <section className="panel">
        <form
          className="toolbar"
          onSubmit={(e) => {
            e.preventDefault()
            setPage(1)
            setQuery(search)
          }}
        >
          <Field
            label={products ? 'Buscar por nombre o SKU' : 'Buscar por nombre'}
            name="search"
            value={search}
            maxLength={100}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="button secondary">
            <Search size={16} />
            Buscar
          </button>
        </form>
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
                    <th>Nombre</th>
                    <th>{products ? 'SKU' : 'Contacto'}</th>
                    {products && (
                      <>
                        <th>Precio</th>
                        <th>Stock</th>
                      </>
                    )}
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {resource.data.data.map((record) => (
                    <tr key={record.id}>
                      <td>
                        <strong>{record.name}</strong>
                      </td>
                      <td>
                        {products
                          ? record.sku
                          : record.email || record.phone || '—'}
                      </td>
                      {products && (
                        <>
                          <td>{amount(record.price)}</td>
                          <td>{record.stock_on_hand}</td>
                        </>
                      )}
                      <td>
                        <Badge active={record.is_active} />
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="button secondary"
                            onClick={() => {
                              setSuccess('')
                              setEditing(record)
                            }}
                          >
                            Editar
                          </button>
                          {products && (
                            <Link
                              className="button secondary"
                              to={`/productos/${record.id}/inventario`}
                            >
                              Inventario
                            </Link>
                          )}
                        </div>
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
              title={
                query
                  ? 'Sin coincidencias'
                  : `Todavía no hay ${title.toLowerCase()}`
              }
              text={
                query
                  ? 'Prueba con otro nombre o limpia la búsqueda.'
                  : 'Agrega el primer registro para empezar.'
              }
            />
          )
        )}
      </section>
    </>
  )
}
function CatalogForm({ products, record, onDone, onCancel }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [errors, setErrors] = useState({})
  async function submit(event) {
    event.preventDefault()
    setPending(true)
    setError('')
    setErrors({})
    const values = Object.fromEntries(new FormData(event.currentTarget))
    for (const key of Object.keys(values))
      if (values[key] === '') values[key] = null
    if (record.id) values.is_active = values.is_active === 'true'
    if (values.opening_stock != null)
      values.opening_stock = Number(values.opening_stock)
    try {
      if (record.id)
        await api.patch(
          `/api/${products ? 'products' : 'clients'}/${record.id}`,
          values,
        )
      else await api.post(`/api/${products ? 'products' : 'clients'}`, values)
      onDone()
    } catch (e) {
      setError(errorMessage(e))
      setErrors(e.response?.data?.errors || {})
    } finally {
      setPending(false)
    }
  }
  const field = (name, label, props = {}) => (
    <Field
      key={name}
      name={name}
      label={label}
      defaultValue={record[name] ?? ''}
      errors={errors}
      {...props}
    />
  )
  return (
    <section className="panel" aria-label="Formulario de registro">
      <h2 className="text-lg mb-5">
        {record.id ? 'Editar' : 'Crear'} {products ? 'producto' : 'cliente'}
      </h2>
      <ErrorNotice message={error} />
      <form onSubmit={submit}>
        <fieldset disabled={pending}>
          <div className="form-grid">
            {field('name', 'Nombre', {
              required: true,
              maxLength: 160,
              autoFocus: true,
            })}
            {products ? (
              <>
                {field('sku', 'SKU', { required: true, maxLength: 80 })}
                {field('price', 'Precio unitario', {
                  type: 'number',
                  step: '0.01',
                  min: 0,
                  max: '9999999999.99',
                  required: true,
                })}
                {!record.id &&
                  field('opening_stock', 'Stock inicial', {
                    type: 'number',
                    min: 0,
                    step: 1,
                    max: 2147483647,
                  })}
                {field('description', 'Descripción', { maxLength: 5000 })}
              </>
            ) : (
              <>
                {field('email', 'Correo electrónico', {
                  type: 'email',
                  maxLength: 255,
                })}
                {field('phone', 'Teléfono', { maxLength: 40 })}
                {field('address', 'Dirección', { maxLength: 255 })}
                {field('notes', 'Notas', { maxLength: 5000 })}
              </>
            )}
            {record.id && (
              <Field
                label="Estado"
                name="is_active"
                defaultValue={String(record.is_active)}
                errors={errors}
              >
                <option value="true">Activo</option>
                <option value="false">Archivado</option>
              </Field>
            )}
          </div>
          {record.id && <p>Archivar conserva el registro y su historial.</p>}
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button className="button primary">
              {pending ? 'Guardando…' : 'Guardar registro'}
            </button>
          </div>
        </fieldset>
      </form>
    </section>
  )
}
