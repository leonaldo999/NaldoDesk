import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  Users,
  Package,
  ReceiptText,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react'
import { useSession } from '../app/session-context'
const modules = [
  [
    '/clientes',
    '01',
    'Clientes',
    'Conoce a quienes vuelven.',
    'Consulta contactos y mantén sus datos al día.',
    Users,
  ],
  [
    '/productos',
    '02',
    'Productos e inventario',
    'Cada producto, en su lugar.',
    'Organiza tu catálogo y revisa las existencias.',
    Package,
  ],
  [
    '/ventas',
    '03',
    'Ventas',
    'El movimiento de tu negocio.',
    'Registra operaciones y consulta su historial.',
    ReceiptText,
  ],
]
export default function Home() {
  const { user } = useSession()
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">TU ESPACIO, EN ORDEN</span>
          <h1>Vista general</h1>
          <p>Hola, {user.name.split(' ')[0]}. ¿Qué vamos a hacer hoy?</p>
        </div>
        <Link className="button primary" to="/ventas/nueva">
          Registrar venta <ArrowUpRight size={18} />
        </Link>
      </div>
      <section className="hero">
        <div>
          <span className="eyebrow">EL DÍA A DÍA, MÁS SIMPLE</span>
          <h2>
            Menos vueltas.
            <br />
            Más tiempo para crecer.
          </h2>
          <p>
            Todo lo que necesitas para gestionar tu negocio,
            <br className="hidden sm:block" /> conectado en un mismo espacio.
          </p>
          <Link to="/productos" className="hero-link">
            Explorar mi catálogo <ArrowRight size={18} />
          </Link>
        </div>
        <div className="hero-graphic" aria-hidden="true">
          <div className="orbit" />
          <div className="orbit orbit-two" />
          <div className="graphic-tile">
            <Package size={76} strokeWidth={1} />
          </div>
          <div className="graphic-label">
            <span className="local-dot" /> Cada detalle cuenta
          </div>
        </div>
      </section>
      <div className="section-heading">
        <h2>Tu negocio, por partes</h2>
        <span>ELIGE UN MÓDULO PARA EMPEZAR</span>
      </div>
      <div className="module-grid">
        {modules.map(([to, number, title, subtitle, description, Icon]) => (
          <Link to={to} key={to} className="module-card">
            <div className="flex justify-between items-center">
              <span className="module-icon">
                <Icon size={24} />
              </span>
              <span className="module-number">{number}</span>
            </div>
            <h3>{title}</h3>
            <strong>{subtitle}</strong>
            <p>{description}</p>
            <div className="module-open">
              Abrir módulo <ArrowUpRight size={18} />
            </div>
          </Link>
        ))}
      </div>
      <section className="workspace-note">
        <ClipboardCheck size={23} />
        <div>
          <strong>Una base clara para trabajar</strong>
          <p>
            Tu sesión mantiene los datos dentro del negocio #{user.business_id}.
            Los importes y las existencias se confirman al registrar cada
            operación.
          </p>
        </div>
      </section>
    </>
  )
}
