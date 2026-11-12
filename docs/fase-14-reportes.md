# Fase 14 — Reportes básicos

- Ventas por período: cantidad de ventas y suma de importes registrados, usando fechas inclusivas de Lima y un máximo de 366 días. La API entrega el importe como texto decimal, sin asumir moneda.
- Stock bajo: productos activos con existencias menores o iguales al umbral elegido (5 por defecto); incluye los agotados y enlaza con inventario. La lista se pagina.
- Ambos reportes son de solo lectura y se limitan al negocio de la sesión, para administradores y personal de operación.

La validación cubre límites de fecha, períodos vacíos, umbrales, productos archivados y aislamiento entre negocios. AWS, exportaciones y reportes contables quedan fuera del alcance.

En [NaldoDesk local](http://localhost:8080/reportes), inicia sesión con una cuenta de tu negocio y elige **Reportes**. El período inicial abarca desde el primer día del mes hasta hoy. Los importes son totales de venta registrados, no un cálculo de utilidad.

API: "GET /api/reports/sales?from=AAAA-MM-DD&to=AAAA-MM-DD" y "GET /api/reports/low-stock?threshold=5&page=1". Ambos endpoints se documentan en Swagger.

**Cierre (11 de noviembre de 2026):** 31 pruebas de backend en Docker, 17 de frontend y 7 E2E aprobadas. También pasaron lint, formato y compilación. La [captura de reportes](evidencias/frontend/reportes.png) usa datos ficticios retirados al finalizar.
