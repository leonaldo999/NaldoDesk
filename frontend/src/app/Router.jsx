import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  Link,
} from 'react-router-dom'
import { SessionProvider } from './session'
import { useSession } from './session-context'
import Layout from './Layout'
import Login from '../features/Login'
import Home from '../features/Home'
import Catalog from '../features/Catalog'
import Inventory from '../features/Inventory'
import Users from '../features/Users'
import { SalesList, SaleDetail, NewSale } from '../features/Sales'
function Protected() {
  return useSession().user ? <Outlet /> : <Navigate to="/login" replace />
}
export default function App() {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route
                path="clientes"
                element={<Catalog key="clients" kind="clients" />}
              />
              <Route
                path="productos"
                element={<Catalog key="products" kind="products" />}
              />
              <Route path="productos/:id/inventario" element={<Inventory />} />
              <Route path="ventas" element={<SalesList />} />
              <Route path="ventas/nueva" element={<NewSale />} />
              <Route path="ventas/:id" element={<SaleDetail />} />
              <Route path="usuarios" element={<Users />} />
              <Route
                path="*"
                element={
                  <section className="panel">
                    <h1>Página no encontrada</h1>
                    <Link to="/">Volver al inicio</Link>
                  </section>
                }
              />
            </Route>
          </Route>
        </Routes>
      </SessionProvider>
    </BrowserRouter>
  )
}
