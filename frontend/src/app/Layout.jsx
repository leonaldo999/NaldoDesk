import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import { io } from 'socket.io-client'
import {
  Layers3,
  LayoutDashboard,
  Users,
  Package,
  ReceiptText,
  UserRoundCog,
  LogOut,
} from 'lucide-react'
import { useSession } from './session-context'
import { ErrorNotice } from '../components/ui'
import { errorMessage } from '../services/api'
const links = [
  ['/', 'Vista general', LayoutDashboard],
  ['/clientes', 'Clientes', Users],
  ['/productos', 'Productos', Package],
  ['/ventas', 'Ventas', ReceiptText],
]
export default function Layout() {
  const { user, logout } = useSession()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')
  const [connected, setConnected] = useState(false)
  useEffect(() => {
    if (!user.business_id) return
    // WebSocket sends Origin even on same-origin connections. The realtime
    // service deliberately rejects handshakes without an allowed Origin.
    const socket = io(
      import.meta.env.VITE_REALTIME_URL || window.location.origin,
      { withCredentials: true, transports: ['websocket'], timeout: 5000 },
    )
    const refresh = () => window.dispatchEvent(new Event('business-refresh'))
    socket.on('connect', () => {
      setConnected(true)
      refresh()
    })
    socket.on('disconnect', (reason) => {
      setConnected(false)
      if (reason === 'io server disconnect')
        window.dispatchEvent(new Event('session-expired'))
    })
    socket.on('connect_error', () => setConnected(false))
    socket.on('sale.created', (sale) => {
      setNotice(
        `Se registró la venta #${sale.id}. Los datos se han actualizado.`,
      )
      refresh()
    })
    return () => {
      socket.removeAllListeners()
      socket.disconnect()
    }
  }, [user.id, user.business_id])
  async function exit() {
    setPending(true)
    setError('')
    try {
      await logout()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <Layers3 />
          NaldoDesk<span>GESTIÓN</span>
        </Link>
        <span className="nav-label">ESPACIO DE TRABAJO</span>
        <nav aria-label="Principal">
          {links.map(([to, label, Icon]) => (
            <NavLink key={to} to={to} end={to === '/'}>
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
          {user.role === 'admin' && (
            <NavLink to="/usuarios">
              <UserRoundCog size={19} />
              Usuarios
            </NavLink>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-card">
            <span className="local-dot" /> ENTORNO LOCAL
            <p>Todo listo para tu próximo paso.</p>
          </div>
          <div className="account">
            <span className="avatar">
              {user.name.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{user.name}</strong>
              <small>
                {user.role === 'admin' ? 'Administrador' : 'Colaborador'}
              </small>
            </div>
            <button
              aria-label="Cerrar sesión"
              disabled={pending}
              onClick={exit}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>
            Mi negocio <span className="muted">/ Panel de gestión</span>
          </span>
          <span className="connection">
            <span className={connected ? 'dot online' : 'dot'} />
            {connected ? 'En tiempo real' : 'Sin conexión en tiempo real'}
          </span>
        </header>
        <main className="page">
          <ErrorNotice message={error} />
          {notice && (
            <div className="notice" role="status">
              <span>{notice}</span>
              <button onClick={() => setNotice('')} aria-label="Cerrar aviso">
                ×
              </button>
            </div>
          )}
          {user.business_id ? (
            <Outlet key={user.id} />
          ) : (
            <section className="panel">
              <h1>Tu cuenta necesita un negocio</h1>
              <p>
                Solicita al administrador que asocie tu cuenta a un negocio para
                continuar.
              </p>
            </section>
          )}
        </main>
        <footer className="footer">
          <span>NaldoDesk · Un lugar para cada parte de tu negocio.</span>
          <span>Demo local</span>
        </footer>
      </div>
    </div>
  )
}
