# Recorrido de demostración local — NaldoDesk

## Propósito y seguridad

Este recorrido prepara datos ficticios para presentar autenticación, clientes, catálogo, inventario y ventas. No crea cuentas ni contraseñas, no borra registros y solo funciona con `APP_ENV=local` o `testing`. Las ventas se crean mediante la API para conservar validaciones, precios históricos y movimientos de inventario.

Los correos usan el dominio reservado `.test`. Los datos se limitan al negocio del administrador indicado. El comando es repetible: actualiza los dos clientes y productos identificados por sus claves de demo; las existencias iniciales y sus movimientos se crean solo la primera vez. Si ya se vendieron unidades, volver a ejecutar el comando no repone el stock.

## Preparar los servicios

Desde PowerShell, en la raíz del repositorio:

```powershell
docker compose --env-file .env.docker ps
Invoke-RestMethod http://localhost:8080/api/health
```

Si es una base local nueva, aplica migraciones y crea las cuentas de manera interactiva. Conserva las contraseñas fuera del repositorio:

```powershell
docker compose --env-file .env.docker exec app php artisan migrate --force
docker compose --env-file .env.docker exec app php artisan naldo:create-admin
docker compose --env-file .env.docker exec app php artisan naldo:create-business
```

El comando de negocio solicita el correo del administrador y el nombre del negocio. Si la cuenta y el negocio ya existen, omite esos pasos.

## Cargar los registros ficticios

Ejecuta el comando e introduce el correo del administrador asociado al negocio:

```powershell
docker compose --env-file .env.docker exec app php artisan naldo:seed-demo
```

También puedes pasar el correo como argumento:

```powershell
docker compose --env-file .env.docker exec app php artisan naldo:seed-demo admin@ejemplo.test
```

Se agregan dos clientes y dos productos con stock inicial: 24 unidades de café molido y 18 tazas reutilizables. No se crea una venta automáticamente, así cada recorrido puede demostrar el flujo real desde la API.

## Recorrer la API con Swagger UI

Abre [Swagger UI](http://localhost:8080/api/documentation). Para una sesión SPA de Sanctum, ejecuta `GET /sanctum/csrf-cookie` y luego `POST /api/auth/login`; usa las cookies obtenidas durante las siguientes solicitudes. El inicio de sesión recibe:

```json
{
  "email": "correo-del-administrador",
  "password": "la-contraseña-local"
}
```

Desde `GET /api/clients` y `GET /api/products`, copia los IDs de los registros de demo. Para crear una venta, usa `POST /api/sales`:

```json
{
  "client_id": 1,
  "items": [
    { "product_id": 1, "quantity": 2 }
  ]
}
```

Reemplaza los IDs por los que devolvió tu base local. El servidor obtiene el precio del catálogo; no envíes `total` ni `unit_price`. La respuesta contiene el total calculado y la venta creada.

Verifica el resultado con:

1. `GET /api/sales/{id}` para revisar la venta y el precio guardado como histórico.
2. `GET /api/products/{productId}` para ver el stock reducido.
3. `GET /api/products/{productId}/inventory-movements` para revisar la salida de inventario asociada a la venta.
4. `POST /api/auth/logout` para cerrar la sesión.

Para repetir la demo, puedes volver a ejecutar `naldo:seed-demo`; no repone las unidades vendidas. Otra venta solo se podrá registrar si queda suficiente stock.

## Comprobación automatizada

La prueba del comando se ejecuta en la base SQLite en memoria del perfil `test`:

```powershell
docker compose --env-file .env.docker --profile test run --build --rm tests
```

La prueba verifica repetición sin duplicados, que el stock no se restablece y el rechazo del entorno `production`. Este perfil no ejecuta cambios en los volúmenes PostgreSQL ni Redis del stack local.
