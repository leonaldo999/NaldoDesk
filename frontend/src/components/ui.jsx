import { useId } from 'react'
import {
  AlertCircle,
  LoaderCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
export function Field({ label, name, errors = {}, children, ...props }) {
  const id = useId()
  const message = errors[name]?.[0]
  const common = {
    id,
    name,
    'aria-invalid': !!message,
    'aria-describedby': message ? `${id}-error` : undefined,
    ...props,
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {children ? (
        <select {...common}>{children}</select>
      ) : (
        <input {...common} />
      )}
      {message && (
        <span id={`${id}-error`} className="field-error">
          {message}
        </span>
      )}
    </div>
  )
}
export function ErrorNotice({ message, retry }) {
  if (!message) return null
  return (
    <div role="alert" className="notice error">
      <AlertCircle size={19} />
      <span>{message}</span>
      {retry && (
        <button className="button secondary" onClick={retry}>
          Reintentar
        </button>
      )}
    </div>
  )
}
export function Loading() {
  return (
    <div role="status" className="loading">
      <LoaderCircle className="animate-spin" size={21} /> Cargando datos…
    </div>
  )
}
export function Empty({
  title = 'Todavía no hay registros',
  text = 'Los registros que agregues aparecerán aquí.',
}) {
  return (
    <div className="empty">
      <span className="empty-mark">＋</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  )
}
export function Pagination({ data, page, setPage }) {
  if (!data?.last_page || data.last_page < 2) return null
  return (
    <nav aria-label="Paginación" className="pagination">
      <span>
        Página {data.current_page} de {data.last_page} · {data.total} registros
      </span>
      <div className="flex gap-2">
        <button
          className="button secondary"
          disabled={page <= 1}
          onClick={() => setPage(page - 1)}
          aria-label="Página anterior"
        >
          <ChevronLeft size={17} />
        </button>
        <button
          className="button secondary"
          disabled={page >= data.last_page}
          onClick={() => setPage(page + 1)}
          aria-label="Página siguiente"
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </nav>
  )
}
export function Badge({ active }) {
  return (
    <span className={`badge ${active ? 'active' : ''}`}>
      {active ? 'Activo' : 'Archivado'}
    </span>
  )
}
