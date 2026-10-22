# Fase 7 — GraphQL

## Objetivo

Añadir una interfaz GraphQL de solo lectura para consultar clientes, productos y ventas, manteniendo REST como API principal y PostgreSQL como fuente de datos.

## Decisiones técnicas

- `nuwave/lighthouse` conecta el esquema GraphQL con Laravel. Composer fija la familia `^6.72`; el lockfile conserva la versión instalada concreta.
- El endpoint es `POST /graphql`. Las solicitudes usan la sesión Sanctum existente; se exige un usuario autenticado que ya pertenezca a un negocio.
- Los builders y resolvers aplican `business_id` del usuario autenticado en el servidor. El cliente GraphQL nunca puede enviar o elegir ese identificador.
- Clientes, productos y ventas se consultan con paginación (`first`, `page`, máximo 100); clientes y productos admiten búsqueda de hasta 100 caracteres.
- La consulta `sale` permite solicitar sus líneas históricas y relaciones. Los precios y totales se exponen como cadenas decimales para conservar el formato del backend.
- No se implementan mutaciones. Altas y cambios siguen usando los endpoints REST y sus validaciones/reglas existentes.
- El esquema declara explícitamente los campos públicos; evita heredar la consulta genérica de usuarios que Lighthouse publica en su esquema de ejemplo.

## Consultas disponibles

```graphql
query Catalogo($search: String!) {
  products(search: $search, first: 10, page: 1) {
    data { id sku name price stock_on_hand }
    paginatorInfo { total currentPage perPage }
  }
}
```

También están disponibles `clients(search, first, page)`, `client(id)`, `product(id)`, `sales(first, page)` y `sale(id)`. `sale` puede seleccionar `client`, `user` y `items`.

Para probar desde una herramienta HTTP, inicia sesión primero usando el flujo Sanctum de la API: solicita `/sanctum/csrf-cookie`, autentícate en `/api/auth/login` y conserva las cookies. Después envía la consulta como JSON a `/graphql` usando la misma sesión. La SPA deberá enviar `credentials: 'include'` y el encabezado CSRF que ya utiliza con REST.

## Archivos principales

- `backend/composer.json` y `backend/composer.lock`: dependencia Lighthouse.
- `backend/config/lighthouse.php`: endpoint, guard Sanctum y middleware de sesión/autorización.
- `backend/graphql/schema.graphql`: tipos y operaciones GraphQL permitidas.
- `backend/app/GraphQL/Queries/`: builders paginados y resolvers por ID limitados al negocio actual.
- `backend/tests/Feature/GraphQLQueriesTest.php`: autenticación, asignación, búsqueda, paginación, datos relacionados y aislamiento entre negocios.

## Comprobación

Desde `backend/`:

```powershell
php artisan lighthouse:validate-schema
php artisan route:list --path=graphql
php artisan test --filter=GraphQLQueriesTest
php artisan test
```

La API GraphQL y la REST comparten autenticación y almacenamiento, pero sus contratos de consulta son independientes. La documentación Swagger/OpenAPI de la Fase 5 sigue describiendo REST; este documento describe GraphQL.
