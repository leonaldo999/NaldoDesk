# Fase 4 — Ventas

## Objetivo

Registrar ventas desde el catálogo y actualizar inventario de forma segura, preservando el importe cobrado aunque cambien los productos.

## Decisiones

- Solo cuentas autenticadas y asociadas a un negocio pueden crear o consultar ventas; cada operación queda limitada al negocio de la cuenta.
- El cliente es opcional para permitir ventas de mostrador.
- La solicitud solo envía `client_id` opcional y una lista de `product_id`/`quantity`. El backend obtiene los precios vigentes y calcula cada importe y el total.
- Las líneas guardan nombre, SKU y precio unitario como fotografía histórica. Editar el catálogo no modifica una venta existente.
- La venta, sus líneas y las salidas de inventario ocurren en una transacción de base de datos. Los productos se bloquean en orden de ID para evitar que dos ventas simultáneas consuman las mismas unidades.
- Cada salida de stock registra `sale_id` y el motivo `Venta #<id>` en el historial de inventario.
- No se permite vender productos archivados, productos de otro negocio ni más unidades que las disponibles. Las líneas duplicadas del mismo producto se rechazan; se envía una única línea con la cantidad total.
- Las ventas son registros históricos: no se actualizan ni eliminan mediante la API.
- No incluye pagos, anulaciones, devoluciones, descuentos, impuestos ni comprobantes; requieren reglas propias en fases posteriores.

## API implementada

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/sales` | Lista ventas del negocio, con paginación |
| `POST` | `/api/sales` | Crea una venta y descuenta inventario |
| `GET` | `/api/sales/{sale}` | Devuelve detalle y líneas históricas de una venta |

Ejemplo de solicitud:

```json
{
  "client_id": 3,
  "items": [
    { "product_id": 12, "quantity": 2 },
    { "product_id": 18, "quantity": 1 }
  ]
}
```

No se aceptan precio ni total del cliente. El endpoint crea la venta con HTTP `201`; datos inválidos o falta de stock responden `422`, invitados reciben `401`, y ventas ajenas al negocio no se revelan (`404`).

## Persistencia

- `sales`: negocio, usuario que registró la venta, cliente opcional y total.
- `sale_items`: producto, nombre/SKU/precio históricos, cantidad e importe de línea.
- `inventory_movements.sale_id`: vínculo nullable que conserva intactos los movimientos manuales previos y permite rastrear las salidas por venta.

Se usa aritmética en centavos enteros para calcular importes, evitando errores de redondeo de números flotantes. La venta admite un total máximo de `999999999999.99`.

## Archivos principales

- `backend/app/Models/Sale.php`, `SaleItem.php`: relaciones y tipos decimales.
- `backend/app/Services/SalesService.php`: transacción, validación de stock, cálculo y snapshots.
- `backend/app/Services/InventoryService.php`: salida de stock enlazada con la venta.
- `backend/app/Http/Controllers/SaleController.php`, `backend/routes/api.php`: API REST y acceso por negocio.
- `backend/database/migrations/2026_10_12_000006_create_sales_table.php` y migraciones siguientes: venta, líneas y relación con inventario.
- `backend/tests/Feature/SalesTest.php`: integración, aislamiento, snapshots y rechazo sin cambios de stock cuando falta inventario.

## Verificación y estado

Las migraciones se aplicaron en PostgreSQL. La suite completa terminó con 18 pruebas aprobadas y 77 aserciones. Se verificó cálculo desde precios persistidos, stock posterior, vínculo de movimientos, protección multi-negocio, venta sin cliente y ausencia de registros parciales cuando falta stock.
