# Fase 3 — Clientes, productos e inventario

## Objetivo

Habilitar operaciones básicas del catálogo y mantener las existencias trazables, con datos aislados por negocio.

## Decisiones

- Cada usuario pertenece a un negocio. Un negocio puede tener varias cuentas; cada una conserva su rol `admin` o `staff`.
- Todas las consultas de clientes, productos, movimientos y usuarios se limitan al negocio de la cuenta autenticada.
- Un administrador existente se asocia con un negocio mediante `php artisan naldo:create-business`; el comando solicita el nombre y no requiere tocar SQL ni revelar secretos.
- Clientes y productos se archivan mediante `is_active`; no se borran y no se pierde historial.
- El producto mantiene `stock_on_hand` para lectura rápida. Cada entrada o salida crea un movimiento con cantidad y saldo anterior/posterior.
- Las salidas se realizan dentro de una transacción y bloquean el producto mientras se valida y actualiza el saldo. No se permiten existencias negativas.
- El saldo solo cambia por ajuste de inventario; actualizar el producto no permite modificar directamente `stock_on_hand`.
- Inventario inicial puede registrarse al crear producto y queda anotado como movimiento de entrada.

## Rutas de la API

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET`, `POST` | `/api/clients` | Listar (con búsqueda) y crear clientes |
| `GET`, `PATCH` | `/api/clients/{clientId}` | Consultar y actualizar/archivar cliente |
| `GET`, `POST` | `/api/products` | Listar (con búsqueda) y crear productos |
| `GET`, `PATCH` | `/api/products/{productId}` | Consultar y actualizar/archivar producto |
| `GET`, `POST` | `/api/products/{productId}/inventory-movements` | Consultar movimientos y registrar entrada o salida |

Todas las rutas requieren sesión autenticada y una cuenta asociada a un negocio. Usuarios de distintos negocios no pueden leer ni modificar los registros ajenos.

## Verificación prevista

- Acceso denegado a invitados y cuentas sin negocio.
- Aislamiento de clientes/productos entre dos negocios.
- Validación de SKU único por negocio y cantidades positivas.
- Entrada/salida auditada; rechazo de salida que excede existencias.
- Migraciones aplicadas en PostgreSQL y suite `php artisan test` aprobada.

## Archivos y estado de implementación

- Modelos: `backend/app/Models/Business.php`, `Client.php`, `Product.php`, `InventoryMovement.php` y relación de negocio en `User.php`.
- Persistencia: cinco migraciones para negocio/usuario, clientes, productos y movimientos.
- API: controladores de clientes, productos y movimientos; `InventoryService` aplica ajustes transaccionales.
- Seguridad: middleware `business.assigned`; listados de usuarios también quedan acotados al negocio.
- Alta del negocio: `backend/app/Console/Commands/CreateBusiness.php` asocia un administrador existente.
- Pruebas: `backend/tests/Feature/BusinessCatalogInventoryTest.php` más las de autenticación y usuarios.

Las pruebas automatizadas terminaron con 13 pruebas aprobadas y 49 aserciones. Las migraciones se aplicaron correctamente en PostgreSQL.
