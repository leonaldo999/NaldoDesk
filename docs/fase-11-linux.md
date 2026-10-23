# Fase 11 — Linux con WSL 2

## Objetivo

Operar el stack existente de NaldoDesk desde una terminal Ubuntu en WSL 2. Docker Desktop seguirá ejecutando los contenedores Linux; esta fase no instala un segundo daemon Docker dentro de Ubuntu, no cambia el Compose, no traslada el repositorio y no modifica el código de la aplicación.

## Situación y alcance

En el equipo del proyecto está instalada Ubuntu 26.04.1 LTS como distribución WSL 2 junto con `docker-desktop`. Al verificarla, Ubuntu aún no encontraba el comando `docker`, por lo que falta activar la integración de esa distribución en Docker Desktop antes de ejecutar las validaciones Linux.

Alcance de la fase:

- Instalar/usar Ubuntu como distribución WSL 2 e integrar su CLI Docker con Docker Desktop.
- Operar desde Linux el Compose y el checkout Windows existentes en `/mnt/c/Users/leona/Desktop/NaldoDesk`.
- Revisar estado, logs, API, Socket.io, migraciones y persistencia de los volúmenes.
- Ejecutar la suite PHP del perfil de pruebas Compose y, si Node.js 22 está instalado en Ubuntu, las pruebas Jest existentes.
- Documentar comandos Linux, límites de permisos y recuperación básica.

Fuera de alcance: mover el repositorio al sistema de archivos ext4 de WSL, instalar/configurar AWS, publicar servicios en Internet, habilitar SSH, rediseñar Docker o cambiar el backend/frontend.

## Preparar Ubuntu y Docker Desktop

1. En PowerShell **como administrador**, instala Ubuntu si todavía no aparece en `wsl -l -v`:

   ```powershell
   wsl --install -d Ubuntu
   ```

   Reinicia Windows si lo solicita. Abre Ubuntu desde Inicio y crea el usuario Linux cuando lo pida. Verifica desde PowerShell que `Ubuntu` tenga versión `2`:

   ```powershell
   wsl --list --verbose
   ```

   Si Ubuntu aparece con versión 1, conviértela con `wsl --set-version Ubuntu 2`.

2. Con Docker Desktop iniciado, abre **Settings → Resources → WSL Integration**, activa la integración para Ubuntu y selecciona **Apply**. No instales Docker Engine dentro de Ubuntu; Docker Desktop provee el daemon y la CLI integrada.

3. Abre Ubuntu y comprueba la conexión. La salida de `docker context show` puede variar; lo importante es que `docker info` muestre servidor Linux y que Compose enumere los servicios:

   ```bash
   docker version
   docker context show
   docker info --format '{{.OSType}}'
   docker compose version
   ```

   `docker info` debe imprimir `linux`. No cambies el contexto si `docker compose` ya accede al stack de Docker Desktop.

## Usar el checkout actual

El repositorio ya está en Windows. Desde Ubuntu, su ruta es:

```bash
cd /mnt/c/Users/leona/Desktop/NaldoDesk
pwd
```

La configuración `.env.docker` existente se reutiliza; no la vuelvas a crear ni reemplaces sus secretos. Comprueba que Compose puede leerla sin imprimir su contenido:

```bash
test -f .env.docker && echo 'Configuración local encontrada'
docker compose --env-file .env.docker config --quiet
```

Docker recomienda guardar proyectos que se usan principalmente desde Linux en el sistema de archivos Linux para obtener mejor rendimiento. Esta fase conserva `/mnt/c/...` porque es el checkout acordado y compartido con VS Code en Windows. Si el rendimiento de operaciones con muchos archivos resulta problemático, el traslado se planificará como cambio separado para evitar mantener dos copias divergentes.

## Operación diaria

```bash
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker logs --tail=100 app nginx db redis realtime
curl --fail --silent --show-error http://localhost:8080/api/health
curl --fail --silent --show-error 'http://localhost:8080/socket.io/?EIO=4&transport=polling' \
  -H 'Origin: http://localhost:8080'
docker compose --env-file .env.docker exec app php artisan migrate:status
```

Los servicios `app`, `db`, `nginx`, `redis` y `realtime` deben estar en ejecución; los healthchecks de `db`, `redis` y `realtime` deben aparecer saludables. La API debe responder con `status: ok` y `database: ok`. La solicitud Socket.io debe devolver una respuesta de Engine.IO (JSON de apertura), no un error de conexión.

Para reconstruir y arrancar después de cambios al código:

```bash
docker compose --env-file .env.docker up --build -d
docker compose --env-file .env.docker ps
```

Migraciones y pruebas:

```bash
docker compose --env-file .env.docker exec app php artisan migrate --force
docker compose --env-file .env.docker --profile test run --build --rm tests
```

El perfil `tests` usa SQLite en memoria para PHPUnit y Redis de Compose para la integración. Para Jest, Node.js 22 o posterior debe estar disponible en Ubuntu; desde `realtime/` ejecuta `npm ci` la primera vez y luego `npm test`. Estos comandos crean `node_modules/`, que no debe añadirse a Git.

## Persistencia y apagado

`down` elimina contenedores y red, pero conserva los volúmenes `postgres_data`, `redis_data` y `laravel_storage`. Para comprobar persistencia sin borrar datos:

```bash
docker compose --env-file .env.docker down
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker ps
docker compose --env-file .env.docker exec app php artisan migrate:status
curl --fail --silent --show-error http://localhost:8080/api/health
```

No uses `docker compose down -v` para esta comprobación: `-v` borra permanentemente los volúmenes de datos del proyecto. Antes de eliminar volúmenes de desarrollo, exporta cualquier información que necesites conservar.

## Linux, rutas y permisos

- El checkout de Windows se monta como `/mnt/c/...`; el modelo de permisos allí depende de la configuración de WSL/Windows. No uses `chmod -R` sobre el repositorio para corregir permisos de volúmenes.
- El código se empaqueta en imágenes; `storage` usa el volumen administrado `laravel_storage`. No se monta `backend/.env`, `vendor` ni `node_modules` del host dentro del contenedor PHP.
- Ejecuta `docker compose` como el usuario Linux normal cuando la integración de Docker Desktop está habilitada. No agregues repositorio, contraseña ni archivos `.env` al grupo `docker` ni los publiques en comandos/logs.
- `systemctl` dentro de Ubuntu no administra el daemon de Docker Desktop. Inicia Docker Desktop desde Windows y verifica la integración de la distribución.
- Para diagnosticar puertos en Ubuntu: `ss -ltn`; para espacio: `df -h`; para identidad: `id`. La API publicada continúa limitada por Compose a `127.0.0.1:8080` en el host.

## Criterio de validación y límites

La fase queda verificada en el equipo cuando Ubuntu está en WSL 2, Docker Desktop es accesible desde esa terminal, Compose valida la configuración, los servicios se recuperan con `down`/`up` conservando volúmenes, la API y Socket.io responden y las suites PHPUnit/Jest pasan en sus entornos correspondientes.

## Validación realizada en el equipo

El 22 de octubre de 2026 se comprobó desde Ubuntu 26.04.1 LTS en WSL 2:

- Docker responde como servidor `linux`, Compose valida con `config --quiet` y lista los cinco servicios activos.
- PostgreSQL, Redis y Socket.io aparecen saludables; `/api/health` devuelve `status: ok` y `database: ok`; el handshake Socket.io a través de Nginx devuelve Engine.IO correctamente.
- `php artisan migrate:status` muestra las 12 migraciones aplicadas. El perfil de pruebas Compose pasó 24 pruebas con 108 aserciones.
- `docker compose down` seguido de `up -d --wait` conservó los tres volúmenes `naldodesk_postgres_data`, `naldodesk_redis_data` y `naldodesk_laravel_storage`. Una clave temporal de Redis sobrevivió al reinicio; se eliminó después de comprobarla. La API, Socket.io y las migraciones siguieron operativos.
- Jest pasó en Windows con 4 pruebas aprobadas y 1 omitida. En esta distribución Ubuntu, Node informa versión 11.16.0 y no está disponible `npm`, por lo que Jest no se ejecutó desde WSL. El entorno Linux no se modificó para instalar otro runtime; para correr Jest allí se necesitará Node.js 22 o posterior con npm.

Los servicios quedaron iniciados después de la validación.

Esta fase valida operación Linux local con WSL; no es una guía de administración de servidores Linux ni de despliegue. Usuarios de sistema, firewall, TLS, copias de seguridad remotas y despliegue corresponden a fases posteriores, principalmente AWS.

## Referencias oficiales

- [Instalar Linux con WSL (Microsoft)](https://learn.microsoft.com/en-us/windows/wsl/install)
- [Backend WSL 2 de Docker Desktop](https://docs.docker.com/desktop/features/wsl/)
- [Desarrollar con Docker Desktop y WSL 2](https://docs.docker.com/desktop/features/wsl/use-wsl/)
