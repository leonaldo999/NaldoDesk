# Fase 15 — Exportación CSV de reportes

En [Reportes](http://localhost:8080/reportes), aplica las fechas o el umbral y pulsa el botón de descarga de la sección correspondiente.

- **ventas.csv:** resumen del período aplicado, con fechas inclusivas de Lima, cantidad de ventas e importe total. Si no hay ventas, el resumen contiene ceros.
- **stock-bajo.csv:** todos los productos activos del negocio con stock igual o inferior al umbral aplicado, independientemente de la página que estés viendo. Si no hay coincidencias, solo se incluyen los encabezados.

Los archivos son UTF-8 con BOM, separados por comas y con punto decimal. Si Excel muestra todo en una columna, usa **Datos → Desde texto/CSV** y elige coma como delimitador. Los nombres y SKU que podrían interpretarse como fórmulas se exportan como texto.

Las descargas requieren una sesión y respetan el mismo aislamiento por negocio que los reportes en pantalla. No requieren servicios externos.

## Verificación

Las pruebas en Docker comprobaron el contenido y nombre de ambas descargas en el navegador, el aislamiento por negocio y la inclusión de resultados más allá de la primera página. Se retiraron los datos ficticios al finalizar.
