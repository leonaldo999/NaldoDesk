# Fase 10 — Docker, Compose y Nginx

## Objetivo

Levantar localmente el backend Laravel, PostgreSQL, Redis, el servicio Socket.io y Nginx con Docker Compose. La configuración conserva las tecnologías de las fases anteriores y mantiene la base PostgreSQL de Windows fuera del stack de contenedores.

## Servicios y límites de red

| Servicio | Función | Acceso desde Windows |
| --- | --- | --- |
| `nginx` | HTTP, archivos públicos y proxy WebSocket | `http://localhost:8080` |
| `app` | Laravel 13 sobre PHP-FPM | Solo red Compose |
| `db` | PostgreSQL 18 | Solo red Compose |
| `redis` | Caché, colas y Pub/Sub | Solo red Compose |
| `realtime` | Node.js y Socket.io | Solo red Compose, vía `/socket.io/` |

Nginx es el único servicio publicado y se enlaza a la interfaz local `127.0.0.1`. Los volúmenes `postgres_data`, `redis_data` y `laravel_storage` persisten datos entre reinicios. PostgreSQL del contenedor usa un volumen distinto del servicio de Windows.

El Dockerfile multiobjetivo comparte la etapa que compila los recursos Vite: `app` contiene PHP-FPM y `nginx` sirve el directorio público. El contenedor PHP recibe únicamente las extensiones necesarias para las dependencias de producción; Composer instala paquetes sin dependencias de desarrollo. El contenedor realtime instala dependencias de producción y escucha en `0.0.0.0` dentro de su red.

## Preparación local

Requiere Docker Desktop iniciado con contenedores Linux y Compose v2 o posterior. En PowerShell, desde la raíz:

```powershell
Copy-Item .env.docker.example .env.docker
$key = "base64:" + [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$password = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(24))
$content = Get-Content .env.docker -Raw
$content = $content.Replace('base64:replace_with_a_random_32_byte_key', $key)
$content = $content.Replace('replace_with_a_local_password', $password)
$content = $content.Replace('replace_with_the_same_local_password', $password)
Set-Content .env.docker $content -NoNewline
```

`.env.docker` está excluido de Git. No compartas ese archivo ni copies contraseñas reales de otros entornos. Si ya existe, conserva su `APP_KEY` y sus contraseñas; regenerar la clave invalida las sesiones cifradas existentes.

## Inicio y migraciones

```powershell
docker compose --env-file .env.docker config --quiet
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker exec app php artisan migrate --force
```

Las migraciones se ejecutan explícitamente para que el arranque no modifique la base de datos sin que la persona desarrolladora lo decida. En un volumen nuevo, `migrate` crea el esquema de NaldoDesk en PostgreSQL del contenedor.

Comprueba `http://localhost:8080/api/health`; debe responder `status: ok` y `database: ok`. La negociación Socket.io pasa por `http://localhost:8080/socket.io/`. Para crear el administrador y el negocio inicial:

```powershell
docker compose --env-file .env.docker exec app php artisan naldo:create-admin
docker compose --env-file .env.docker exec app php artisan naldo:create-business
```

Ambos comandos son interactivos; el primero solicita la contraseña sin mostrarla.

## Operación habitual

```powershell
docker compose --env-file .env.docker logs -f app nginx db redis realtime
docker compose --env-file .env.docker --profile test run --build --rm tests
docker compose --env-file .env.docker down
```

La imagen normal `app` excluye herramientas de desarrollo. El perfil `test` construye una imagen separada con PHPUnit, usa SQLite en memoria y ejecuta además la prueba de integración de Redis contra el servicio Compose; no necesita migrar ni escribir en PostgreSQL local o de Compose.

Los cambios al código fuente se incorporan reconstruyendo las imágenes:

```powershell
docker compose --env-file .env.docker up --build -d
```

`down` conserva volúmenes. `docker compose --env-file .env.docker down -v` borra permanentemente la base PostgreSQL y los datos Redis del stack; úsalo solo cuando quieras reiniciar esos datos.

## Decisiones y límites

- La URL publicada es HTTP para desarrollo local. TLS y nombres de dominio corresponden al despliegue de Fase 12.
- No se montan el `.env` local del backend, `vendor` ni `node_modules` del host dentro de Linux.
- PostgreSQL y Redis no publican puertos; clientes locales externos no podrán conectarse directamente sin un cambio deliberado de configuración.
- El proceso de migraciones queda separado del inicio de servicios para evitar alteraciones automáticas de datos.
- Las imágenes se basan en etiquetas oficiales con sus líneas principales acordadas (PHP 8.5, PostgreSQL 18, Node 22, Redis 7.4 y Nginx 1.31); reconstruir permite recibir actualizaciones de parche disponibles.
