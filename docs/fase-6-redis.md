# Fase 6 — Redis

## Objetivo

Conectar Laravel a Redis para almacenar caché y procesar trabajos en segundo plano, conservando PostgreSQL como base principal de los datos del negocio.

## Problema que resuelve

La caché deja de depender de PostgreSQL y Laravel puede encolar operaciones que no necesitan bloquear una solicitud HTTP. Las reglas de negocio actuales no se cambian ni se mueven a Redis.

## Decisiones técnicas

- Laravel usa `predis/predis` como cliente PHP: está escrito en PHP y no requiere instalar la extensión nativa `phpredis`.
- La tienda predeterminada de caché es Redis. La cola predeterminada también es Redis.
- Se usan bases lógicas distintas en la misma instancia: `REDIS_DB=0` para datos/colas Redis y `REDIS_CACHE_DB=1` para caché.
- La aplicación se conecta a `127.0.0.1:6379`; el secreto, si se configura, vive en `.env`, nunca en este repositorio.
- La sesión de Sanctum permanece en PostgreSQL; no se cambia `SESSION_DRIVER`.
- El servidor local seleccionado es Memurai Developer para Windows, compatible con el protocolo Redis. Su edición de desarrollo se detiene tras 10 días y requiere reiniciarse; no es el servidor de producción.

## Preparación local en Windows

1. Abre la [página oficial de Memurai](https://www.memurai.com/get-memurai), elige **Memurai for Redis** y descarga Developer Edition para pruebas locales.
2. Ejecuta el instalador con permisos de administrador, instala el servicio en el puerto `6379` y evita agregar una excepción de firewall: la aplicación solo usará `127.0.0.1`.
3. En PowerShell, verifica que el servicio esté activo y que el puerto responda:

   ```powershell
   Get-Service -Name '*memurai*'
   Test-NetConnection 127.0.0.1 -Port 6379
   ```

4. En `backend/.env` cambia solamente estas variables locales:

   ```dotenv
   CACHE_STORE=redis
   QUEUE_CONNECTION=redis
   REDIS_CLIENT=predis
   REDIS_HOST=127.0.0.1
   REDIS_PORT=6379
   REDIS_DB=0
   REDIS_CACHE_DB=1
   ```

5. Desde `backend/`, valida la integración con una prueba que escribe en caché, envía un trabajo a Redis y lo procesa con el worker:

   ```powershell
   $env:REDIS_INTEGRATION_TESTS = 'true'
   php artisan test --filter=RedisInfrastructureTest
   Remove-Item Env:REDIS_INTEGRATION_TESTS
   ```

Para ejecutar los trabajos de forma continua en desarrollo, deja abierta otra terminal con:

```powershell
php artisan queue:work redis --sleep=1 --tries=3 --timeout=60
```

## Archivos principales

- `backend/composer.json` y `backend/composer.lock`: cliente Predis.
- `backend/.env.example`: nombres de variables y valores locales sin secretos.
- `backend/config/cache.php`, `backend/config/database.php` y `backend/config/queue.php`: configuración Redis incluida por Laravel.
- `backend/tests/Feature/RedisInfrastructureTest.php`: prueba de conexión, caché y ejecución de una cola real.

## Seguridad y límites

No expongas el puerto 6379 a Internet ni guardes contraseñas en `.env.example`. En producción se utilizará un servicio administrado y credenciales propias del entorno. Redis almacena caché y trabajos temporales; PostgreSQL conserva los registros comerciales.
