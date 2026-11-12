# Evidencias del portafolio local

Verificación realizada el 22 de octubre de 2026 con el stack local de Docker Compose. Las capturas no incluyen credenciales.

## Swagger UI

La interfaz carga la especificación OpenAPI y usa `/` como origen, por lo que las solicitudes van al mismo host y puerto donde se abrió Swagger (Docker: `http://localhost:8080`).

![Swagger UI de NaldoDesk](evidencias/swagger-ui.png)

## Salud de la API

`GET /api/health` respondió `status: ok` y `database: ok`.

![Respuesta de salud de la API](evidencias/api-health.png)

## Verificaciones automatizadas

- PHPUnit: **28 pruebas aprobadas, 128 aserciones**. Incluye autenticación, aislamiento por negocio, ventas e inventario, integración de Redis y formato JSON de errores API.
- Jest: **5 pruebas aprobadas** con la integración de Redis y Socket.io habilitada. La verificación conectó el servicio realtime con el Redis de Compose.
- Pint: análisis de formato PHP ejecutado; se corrigieron dos hallazgos y luego se validaron nuevamente los archivos modificados.
- Rutas REST: Laravel registró 19 rutas bajo `/api`.
- API protegida: `GET /api/clients` sin sesión devolvió HTTP 401 y JSON, aun sin encabezado `Accept`.

## Reproducir las verificaciones principales

Desde la raíz del repositorio, con Docker iniciado y `.env.docker` preparado:

```powershell
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker --profile test run --build --rm tests
Invoke-RestMethod http://localhost:8080/api/health
curl.exe -i http://localhost:8080/api/clients
```

Para comandos de Jest y el modo de integración, consulta [`docs/fase-9-testing.md`](fase-9-testing.md); para iniciar el entorno completo, consulta [`docs/fase-10-docker.md`](fase-10-docker.md).

## Alcance de la evidencia

Estas evidencias muestran el backend y la interfaz React implementada en la Fase 13, con sus servicios locales. No se publicó el proyecto ni se desplegó infraestructura en AWS.

## Frontend React — Fase 13

Validación local del 22 de octubre de 2026. Se usaron cuentas y negocios ficticios aislados; las capturas y videos seleccionados no muestran contraseñas.

- Frontend: 17 pruebas Vitest aprobadas; lint, formato y compilación aprobados.
- Navegador: 6 pruebas Playwright aprobadas contra el stack Docker real; incluyen móvil, ventas, inventario, paginación, roles, aislamiento, desconexión/reconexión y límite de login.
- Backend después del ajuste de canal Redis: 28 pruebas aprobadas, 130 aserciones.
- Realtime en esta ejecución: 4 pruebas Jest aprobadas y 1 integración optativa omitida. Playwright verifica la entrega real del evento desde Laravel hasta una segunda ventana.

![Inicio del frontend](evidencias/frontend/inicio-escritorio.png)

![Detalle de venta confirmada](evidencias/frontend/venta-confirmada.png)

[Captura de clientes en móvil](evidencias/frontend/clientes-movil.png) · [Productos en móvil](evidencias/frontend/productos-movil.png)

[Video del recorrido de venta](evidencias/frontend/recorrido-venta.webm) · [Video de la ventana observadora](evidencias/frontend/aviso-venta.webm)

Para reproducirlo, consulta la [guía de frontend local](frontend-local.md). El detalle del cierre está en la [Fase 13](fase-13-frontend.md). Los videos son grabaciones de pruebas automatizadas, sin narración, y los datos se retiran al finalizar el cleanup.
