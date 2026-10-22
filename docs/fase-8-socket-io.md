# Fase 8 — Socket.io

## Objetivo

Emitir una notificación `sale.created` cuando Laravel registra una venta, y entregarla en tiempo real únicamente a las sesiones conectadas al mismo negocio.

## Arquitectura

```text
Laravel confirma la venta
        │ Redis Pub/Sub: naldo:events
        ▼
Servidor Node.js + Socket.io
        │ sala business:{id}
        ▼
Sesiones autorizadas del negocio
```

- Laravel sigue siendo la autoridad para ventas, reglas y pertenencia al negocio. Socket.io es un canal de notificaciones.
- Laravel publica el evento después de completar la transacción de venta. Si Redis no está disponible, registra una advertencia y conserva la venta; una notificación perdida no revierte una operación ya confirmada.
- Redis Pub/Sub entrega datos de forma efímera. Al reconectarse, el cliente debe consultar REST para recuperar el estado actual.
- Node.js valida la cookie de sesión con `GET /api/auth/me` y recibe el `business_id` desde Laravel. El cliente no proporciona el nombre de la sala.
- Node.js repite la validación cada 60 segundos y desconecta la sesión si expiró o cambió de negocio.
- El payload incluye solo el identificador, el total y la fecha de la venta. No incluye cliente, correo, ni otros datos personales.
- La primera versión usa un proceso Node.js y no añade el adaptador Redis de Socket.io para múltiples servidores. Si se despliegan varias instancias, habrá que incorporarlo y revisar permisos de Pub/Sub.

## Ejecución local

Requisitos: Node.js 22 o superior, npm, Laravel activo en `127.0.0.1:8000` y Memurai/Redis en `127.0.0.1:6379`.

1. En `backend/.env`, comprueba que `REALTIME_ENABLED=true` y que Redis apunte al servidor local. `backend/.env.example` documenta las variables. La venta continúa funcionando aunque la publicación en tiempo real falle.
2. En una terminal, inicia Laravel desde `backend/`:

   ```powershell
   php artisan serve --host=127.0.0.1
   ```

3. En otra terminal, configura e inicia el servidor Socket.io:

   ```powershell
   cd realtime
   Copy-Item .env.example .env
   npm install
   npm start
   ```

   Si ya existe `realtime/.env`, edita sus variables sin copiar encima. Usa credenciales Redis locales en ese archivo si Memurai las requiere; `.env` está excluido de Git.

4. La futura SPA conectará al mismo host usado para iniciar sesión, por ejemplo:

   ```javascript
   import { io } from 'socket.io-client';

   const socket = io('http://127.0.0.1:3001', { withCredentials: true });
   socket.on('sale.created', (sale) => console.log('Nueva venta:', sale));
   ```

   La SPA debe iniciar sesión mediante Sanctum y conservar las cookies. El origen también debe estar permitido en `FRONTEND_ORIGINS`, `SANCTUM_STATEFUL_DOMAINS` y `CORS_ALLOWED_ORIGINS`. Para evitar problemas de cookies, no mezcles `localhost` y `127.0.0.1` entre API, SPA y Socket.io.

## Archivos principales

- `backend/app/Events/SaleCreated.php`: evento de dominio luego de crear la venta.
- `backend/app/Listeners/PublishSaleCreated.php` y `backend/app/Services/Realtime/RedisEventPublisher.php`: publicación de payload en Redis.
- `backend/config/realtime.php` y `backend/.env.example`: configuración del evento.
- `realtime/src/server.js`: autorización de sesión, salas por negocio y recepción de eventos Redis.
- `realtime/package.json` y `realtime/package-lock.json`: servidor Socket.io, cliente Redis y pruebas Node.js.
- `backend/tests/Feature/RealtimeSaleEventsTest.php` y `realtime/test/`: publicación, fallos de Redis, autenticación, aislamiento entre negocios y transporte real Redis/Socket.io.

## Comprobación

Desde `backend/`:

```powershell
php artisan test
```

Desde `realtime/`, las pruebas con servidor Redis real se activan expresamente:

```powershell
npm test
$env:REALTIME_INTEGRATION_TESTS = 'true'
npm test
Remove-Item Env:REALTIME_INTEGRATION_TESTS
```

La primera ejecución usa dobles de prueba. La segunda comprueba Pub/Sub con Memurai o Redis local.
