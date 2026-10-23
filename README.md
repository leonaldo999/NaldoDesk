# NaldoDesk

Proyecto de portafolio para gestión de pequeños negocios. El desarrollo avanza por fases; la arquitectura acordada está en [`docs/arquitectura.md`](docs/arquitectura.md).

## Fases 1 y 2 — Backend API, autenticación y usuarios

El backend está en `backend/` y usa Laravel 13, PHP 8.5.12 o superior y PostgreSQL 18. La API REST ofrece `GET /api/health` y autenticación de sesión mediante Laravel Sanctum.

### Requisitos locales

- PHP 8.5.12 o superior con `pdo_pgsql` habilitado. PHP 8.5.12 corrige CVE-2026-109618 y CVE-2026-109619.
- Composer 2.
- PostgreSQL en `127.0.0.1:5432`.

Docker se incorpora en la Fase 10, así que la base local se ejecuta como servicio de Windows durante esta fase.

### Preparar la base de datos

En pgAdmin, conéctate al servidor local como `postgres` y abre Query Tool sobre la base `postgres`. Ejecuta estas sentencias **por separado**:

```sql
CREATE ROLE naldo_app WITH LOGIN PASSWORD 'define_una_contrasena_local';
```

```sql
CREATE DATABASE naldo_desk OWNER naldo_app;
```

Usa una contraseña única que no compartas ni guardes en el repositorio. Si ya existe el rol, no vuelvas a crearlo; asegúrate de que su contraseña sea la que colocarás en el archivo local `.env`.

Edita `backend/.env` (no `.env.example`) y configura:

```dotenv
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=naldo_desk
DB_USERNAME=naldo_app
DB_PASSWORD="tu_contrasena_local"
```

El archivo `.env` contiene configuración local y no debe subirse al repositorio.

### Ejecutar

Desde PowerShell, en la raíz del repositorio:

```powershell
cd backend
php artisan migrate
php artisan route:list --path=api
php artisan serve --host=127.0.0.1
```

Las migraciones incluyen la tabla de sesiones y el rol de usuario. Para crear el primer administrador de forma local:

```powershell
php artisan naldo:create-admin
```

El comando solicita la contraseña de forma oculta; no la escribas en el comando ni la guardes en el repositorio.

### Autenticación de la API

Rutas disponibles:

| Método | Ruta | Acceso |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Público, limitado a 5 intentos por minuto por IP |
| `GET` | `/api/auth/me` | Usuario autenticado |
| `POST` | `/api/auth/logout` | Usuario autenticado |
| `GET` | `/api/users` | Solo administrador |
| `POST` | `/api/users` | Solo administrador |

Sanctum usa cookies de sesión y CSRF para la SPA propia. Antes del login, el navegador debe llamar `GET /sanctum/csrf-cookie`; luego envía `POST /api/auth/login` con `credentials: 'include'`. Para el frontend local, los orígenes permitidos se configuran en `backend/.env` con `SANCTUM_STATEFUL_DOMAINS` y `CORS_ALLOWED_ORIGINS`. No se habilita registro público.

Comprueba el backend con:

```powershell
php artisan test
```

La documentación detallada de autenticación y roles está en [`docs/fase-2-autenticacion-usuarios.md`](docs/fase-2-autenticacion-usuarios.md).

La Fase 3 agrega clientes, productos e inventario con separación por negocio. Consulta [`docs/fase-3-clientes-productos-inventario.md`](docs/fase-3-clientes-productos-inventario.md) para las rutas y decisiones de datos.

La Fase 4 agrega ventas transaccionales con precios históricos e integración con inventario. Consulta [`docs/fase-4-ventas.md`](docs/fase-4-ventas.md) para el contrato REST y sus reglas.

La Fase 5 documenta los endpoints REST con atributos OpenAPI y Swagger UI. Consulta [`docs/fase-5-swagger-openapi.md`](docs/fase-5-swagger-openapi.md); con Laravel activo, abre `http://127.0.0.1:8000/api/documentation`.

La Fase 6 integra Redis con la caché y las colas de Laravel, sin reemplazar PostgreSQL. Consulta [`docs/fase-6-redis.md`](docs/fase-6-redis.md) para preparar Memurai localmente y ejecutar la prueba de integración.

La Fase 7 añade consultas GraphQL protegidas para clientes, productos y ventas. REST conserva las escrituras. Consulta [`docs/fase-7-graphql.md`](docs/fase-7-graphql.md) para el esquema, autenticación y ejemplos.

La Fase 8 añade notificaciones `sale.created` mediante un servidor Node.js + Socket.io y Redis Pub/Sub. Consulta [`docs/fase-8-socket-io.md`](docs/fase-8-socket-io.md) para ejecutarlo localmente y probar el aislamiento por negocio.

La Fase 9 incorpora Jest para el servicio JavaScript `realtime/`; PHPUnit se mantiene para Laravel. Consulta [`docs/fase-9-testing.md`](docs/fase-9-testing.md) para ejecutar pruebas unitarias, cobertura e integración Redis.

Para vincular el administrador creado en la Fase 2, desde `backend/` ejecuta una vez:

```powershell
php artisan naldo:create-business
```

El comando pregunta el correo del administrador y el nombre del negocio. Después, ese administrador podrá crear cuentas `staff` desde `POST /api/users`; las cuentas nuevas pertenecerán al mismo negocio.

En otra terminal, comprueba el estado:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
```

Con la conexión correcta, la respuesta indica `status: ok` y `database: ok`. Si la API no puede conectar, devuelve HTTP 503 sin exponer detalles internos.

## Fase 10 — Docker Compose y Nginx

Docker ejecuta Laravel/PHP-FPM, PostgreSQL, Redis, Socket.io y Nginx. Prepara una sola vez el entorno local ignorado por Git siguiendo [`docs/fase-10-docker.md`](docs/fase-10-docker.md). Luego inicia desde la raíz:

```powershell
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker exec app php artisan migrate --force
```

La API queda en `http://localhost:8080`; PostgreSQL y Redis permanecen privados dentro de Compose. Este stack usa volúmenes separados y no modifica la instancia PostgreSQL de Windows.

## Fase 11 — Linux con WSL 2

La operación desde Ubuntu/WSL 2 está documentada en [`docs/fase-11-linux.md`](docs/fase-11-linux.md). Requiere Ubuntu con integración WSL habilitada en Docker Desktop; el equipo puede seguir usando el checkout actual de Windows desde `/mnt/c/Users/leona/Desktop/NaldoDesk`. No instales otro Docker Engine dentro de Ubuntu.

## Portafolio local y Fase 12 AWS aplazada

El objetivo actual es aprender y presentar el proyecto en el CV, con **USD 0 de presupuesto para servicios de infraestructura**. El [plan de portafolio y referencia de costos](docs/fase-12-aws-plan-costos.md) prioriza ejecución local con Docker, datos ficticios, documentación, pruebas y capturas/video. AWS queda aplazado; no se necesita contratar servidor ni dominio para preparar el portafolio. La estimación de pago se conserva únicamente como referencia futura.

Para preparar un recorrido reproducible de login, catálogo, inventario y ventas, sigue la [guía de demostración local](docs/demo-portafolio-local.md). `naldo:seed-demo` agrega registros ficticios al negocio indicado, no crea credenciales y no reinicia el stock al repetirse.

Las [evidencias del portafolio local](docs/evidencias-portafolio.md) incluyen capturas de Swagger y salud de la API, además de los resultados de las pruebas automatizadas.
