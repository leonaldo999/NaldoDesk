# NaldoDesk para el portafolio

**Texto para el CV:** Desarrollé NaldoDesk, una aplicación de gestión comercial con React, Laravel y PostgreSQL. Implementé ventas con actualización transaccional de inventario, acceso por roles y aislamiento por negocio, y notificaciones en tiempo real con Redis y Socket.io. Preparé un entorno reproducible con Docker Compose y pruebas de extremo a extremo con Playwright.

## Demostración en 90 segundos

1. **0–20 s:** abre la aplicación local y presenta los módulos y el acceso por rol.
2. **20–45 s:** crea un cliente ficticio y elige un producto con stock. Muestra la cantidad disponible antes de vender.
3. **45–75 s:** registra una venta de dos unidades. Abre el detalle y comprueba que el stock bajó en dos unidades y que el historial conserva el precio de la venta.
4. **75–90 s:** muestra el aviso de venta en otra ventana del mismo negocio y explica cómo se reproduce el entorno con Docker.

Usa un negocio dedicado a la demo. La [guía de ejecución](frontend-local.md) explica cómo preparar Docker, crear la cuenta y cargar datos ficticios. Para revisar sin instalar nada, consulta las [capturas y grabaciones](evidencias-portafolio.md).

Si dispones de unos segundos más, abre **Reportes**: muestra el total del período y ajusta el umbral de stock para localizar el producto de la demo.
