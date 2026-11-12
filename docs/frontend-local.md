# Frontend local — NaldoDesk

La interfaz está en `frontend/`: sesión, clientes, productos, inventario, ventas históricas y usuarios. Socket.io avisa de ventas y refresca datos tras reconectar.

## Demo Docker

Desde la raíz, con `.env.docker` preparado según Fase 10:

```powershell
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker exec app php artisan migrate --force
```

Abre [NaldoDesk](http://localhost:8080). Nginx sirve React y conserva `/api`, `/sanctum`, `/graphql`, Swagger y `/socket.io/`. Permite recargar rutas internas. No necesitas Node en el host para usar la demo.

Usa tu cuenta local existente. Si todavía no hay una, créala y asóciala a un negocio de forma interactiva:

```powershell
docker compose --env-file .env.docker exec app php artisan naldo:create-admin
docker compose --env-file .env.docker exec app php artisan naldo:create-business
docker compose --env-file .env.docker exec app php artisan naldo:seed-demo
```

El seed incorpora datos ficticios y no repone stock consumido. No hay credenciales predeterminadas ni registro público.

## Desarrollo con Vite

La compilación se comprobó con Node 22 en Docker y Node 26.3.0 en Windows. El proyecto requiere Node >=22.12; las dependencias exactas están en `frontend/package-lock.json`.

Desde `frontend/`:

```powershell
npm ci
Copy-Item .env.example .env
npm run dev
```

Copia el ejemplo solo si todavía no tienes `.env`. Abre [Vite](http://localhost:5173); el ejemplo apunta la API y realtime a `http://localhost:8080`. Usa el mismo nombre de host en ambos servicios, sin mezclar `localhost` y `127.0.0.1`.

`VITE_API_URL` y `VITE_REALTIME_URL` son públicas y se incorporan al compilar. Docker las omite y usa el mismo origen de la página. Nunca coloques secretos en variables `VITE_*`. Los archivos `.env`, credenciales temporales y resultados de pruebas están ignorados por Git y por el contexto Docker.

Sanctum requiere orígenes exactos en `SANCTUM_STATEFUL_DOMAINS` y `CORS_ALLOWED_ORIGINS`; realtime usa `FRONTEND_ORIGINS`. El frontend usa WebSocket: envía `Origin` también al conectar al mismo origen, necesario para el control existente del servidor.

Laravel publica por la conexión Redis `realtime` sin prefijo para coincidir con el canal literal de Node. Caché y colas conservan sus prefijos.

## Comprobaciones

Desde `frontend/`:

```powershell
npm run lint
npm run format:check
npm test
npm run build
```

Las E2E requieren el stack Docker activo, Chrome instalado y el componente de video de Playwright:

```powershell
npx playwright install ffmpeg
npm run test:fixtures
npm run test:e2e
npm run test:cleanup
```

Las fixtures crean dos negocios ficticios aislados, cuentas admin/staff y una cuenta sin negocio. Sus contraseñas aleatorias van en `e2e.local.json` ignorado. Solo acepta `APP_ENV=local`. No cambia las credenciales de tus cuentas. Cleanup elimina únicamente datos del marcador de esa ejecución; úsalo también tras una prueba fallida antes de crear otras fixtures.

No ejecutes E2E simultáneamente. El límite de login sigue activo: espera un minuto si varias ejecuciones seguidas provocan `429`. Playwright prueba la compilación en `http://localhost:8080`; reconstruye Nginx tras modificar el frontend. `E2E_BASE_URL` permite elegir otro origen local compatible.

Videos y diagnósticos se guardan en `frontend/test-results/`. Las capturas seleccionadas están en `docs/evidencias/frontend/`.

## Recorrido visual

1. Inicia sesión y recarga para restaurarla.
2. Crea cliente y producto con stock inicial; registra una entrada de inventario.
3. Registra una venta con cliente o de mostrador y comprueba detalle y stock posterior.
4. Intenta vender más stock del disponible: el rechazo conserva las existencias.
5. Abre otra ventana del mismo negocio para recibir avisos. Tras reconectar se consultan de nuevo los datos REST.
6. Como admin, crea una cuenta staff y comprueba que no puede gestionar usuarios. Cierra sesión.

Los importes no llevan símbolo porque la API no define moneda. El servidor confirma totales. No hay reportes agregados ni ventas editables. Ante un resultado incierto de venta, consulta el historial antes de repetirla: la API todavía no tiene claves de idempotencia.

La ejecución es local. AWS y publicación pública siguen aplazados.

## Referencias de implementación

- [Integración oficial Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite).
- [Guía de Vite](https://vite.dev/guide/).
- [WebSocketRoute de Playwright](https://playwright.dev/docs/api/class-websocketroute): permite cortar el transporte en la prueba de reconexión; los mensajes se entregan desde el servidor real.

## Recuperar una contraseña local

Desde la raíz del repositorio, con Docker activo:

```powershell
docker compose --env-file .env.docker exec app php artisan naldo:reset-password
```

Escribe el correo de tu cuenta y confirma una contraseña nueva de al menos 12 caracteres. La terminal oculta lo que escribes. El comando conserva tu cuenta, rol y datos del negocio, y cierra las sesiones anteriores. Si el contenedor se creó con una imagen anterior al comando, reconstruye el servicio `app` antes de ejecutarlo.
