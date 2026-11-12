# Fase 13 — Frontend con React, Vite y Tailwind CSS

Estado: implementada y validada localmente; entregas 13.1–13.6 cerradas. Fecha: 22 de octubre de 2026.

## Objetivo

Construir una interfaz web en español que permita demostrar NaldoDesk desde el navegador: iniciar sesión, gestionar clientes y productos, consultar y ajustar inventario y registrar ventas. Consumirá la API Laravel existente y se ejecutará localmente, dentro del presupuesto de infraestructura de USD 0.

Este documento conserva el alcance acordado y registra su implementación y validación al final. AWS sigue aplazado y no es una dependencia de esta fase.

## Tecnologías y responsabilidades

- React con JavaScript para componentes y estado de la interfaz.
- Vite para desarrollo y compilación de archivos estáticos.
- Tailwind CSS para estilos, adaptación a móvil y estados visuales compartidos.
- React Router para navegación y rutas protegidas.
- Un cliente HTTP compartido para JSON, cookies de sesión, CSRF y tratamiento de errores.
- Vitest y React Testing Library para componentes y flujos con API simulada; Playwright para el recorrido de navegador con servicios locales reales. Jest conserva su alcance en `realtime/` y PHPUnit en Laravel.

Versiones verificadas: React 19.3.1, Vite 8.3.5, Tailwind CSS 4.3.3 y React Router 7.18.4. `frontend/package-lock.json` conserva las versiones exactas; la compilación funciona con Node 22 en Docker y Node 26.3.0 en Windows. La guía `frontend-local.md` contiene los comandos comprobados.

## Alcance y navegación

| Ruta propuesta | Pantalla y operaciones |
| --- | --- |
| `/login` | Correo y contraseña, errores de acceso y estado de envío |
| `/` | Inicio protegido con accesos a módulos y datos de la cuenta/negocio disponibles en la API |
| `/clientes` | Listado paginado, búsqueda, creación, edición y archivo mediante `is_active` |
| `/productos` | Listado paginado, búsqueda, creación, edición, archivo y lectura de existencias |
| `/productos/:id/inventario` | Historial paginado y formulario de entrada/salida con motivo |
| `/ventas` | Listado paginado y acceso al detalle histórico |
| `/ventas/nueva` | Cliente opcional, selección de productos, cantidades y confirmación |
| `/ventas/:id` | Detalle de venta e importes históricos devueltos por la API |
| `/usuarios` | Solo administrador: listado y creación de cuentas del negocio |

Se incluirán cierre de sesión, pantalla de ruta inexistente y estados de acceso denegado o cuenta sin negocio. El inicio no mostrará métricas agregadas inventadas ni totales calculados desde una sola página de resultados.

Quedan fuera pagos, impuestos, descuentos, comprobantes, devoluciones, eliminación de ventas, registro público, recuperación de contraseña, cambio de negocio, reportes avanzados y despliegue público. Las pantallas no ofrecerán operaciones que la API no soporte.

## Integración y reglas

1. Restaurar la sesión con `GET /api/auth/me`. Para iniciar sesión, obtener primero `/sanctum/csrf-cookie`, enviar el encabezado CSRF correspondiente y usar cookies con credenciales. No guardar contraseñas ni tokens de sesión en `localStorage`.
2. Proteger navegación según sesión y rol. Laravel mantiene la autorización y el aislamiento por negocio; ocultar un botón no sustituye esos controles. Una cuenta sin negocio recibe una explicación y la indicación de solicitar su asociación al administrador.
3. Consumir REST para lectura y escritura en la primera entrega funcional, respetando contratos, búsqueda y paginación existentes. Revisar controladores y OpenAPI antes de construir formularios.
4. Mostrar errores de validación `422` junto al campo; tratar `401` como sesión ausente/expirada, `403` como acceso denegado, `404` como recurso no disponible y `429` como límite de intentos. Ante `419`, renovar CSRF y solicitar un nuevo intento explícito de la operación.
5. Al vender, enviar solo cliente opcional y líneas de producto/cantidad según el contrato. El total previo es una estimación; el total confirmado procede del servidor. No modificar stock desde el formulario de edición del producto.
6. Deshabilitar envíos mientras estén pendientes. Si una venta falla por pérdida de conexión y no se conoce el resultado, no reenviarla automáticamente: consultar el historial antes de volver a confirmar. La API actual no presupone idempotencia.
7. En una entrega posterior dentro de esta fase, conectar Socket.io con la sesión existente para `sale.created`: avisar y volver a consultar los datos pertinentes. Al reconectar, refrescar desde REST; el evento no es un historial durable. Limpiar listeners al desmontar y desconectar al cerrar sesión.

GraphQL queda como integración opcional posterior al cierre del MVP visual; no es necesario consumir dos interfaces de consulta para demostrar el mismo flujo.

## Experiencia y accesibilidad

Usar un layout compartido con navegación, título y acciones por pantalla. Definir colores, tipografía, espaciado y componentes reutilizables: botones, campos, tablas/listas, paginación, confirmaciones y avisos.

Cada pantalla tendrá estados de carga, vacío, éxito y error con opción de recuperación. Los formularios tendrán etiquetas visibles, foco perceptible, mensajes asociados a los campos y navegación por teclado. Las confirmaciones conservarán y restaurarán el foco. No depender solo del color para comunicar resultados.

Validar el recorrido en móvil y escritorio; las tablas deben permitir consultar datos y acciones sin desbordar toda la página. Mantener cantidades e importes legibles y conservar la precisión monetaria del contrato; confirmar moneda y formato con los datos existentes antes de rotularlos.

## Archivos previstos

Crear `frontend/` separado de `backend/` y `realtime/`:

```text
frontend/
  src/
    app/          # Router, sesión y layout
    components/   # Controles compartidos
    features/     # auth, clientes, productos, inventario, ventas, usuarios
    services/     # Cliente HTTP y acceso a API / Socket.io
    styles/       # Tailwind y estilos base
  tests/          # Flujos de navegador
  .env.example    # Configuración pública sin secretos
  package.json
```

Documentar variables públicas para la conexión HTTP y realtime; cualquier variable incluida en el bundle será visible para el navegador. Conservar archivos `.env` locales fuera de Git.

## Secuencia de entregas

| Entrega | Resultado verificable antes de continuar |
| --- | --- |
| 13.1 — Base | Proyecto, estilos, router, layout adaptable, cliente HTTP y estados compartidos; compilación correcta |
| 13.2 — Sesión | Login, restauración al recargar, logout, expiración y acceso por rol contra Sanctum |
| 13.3 — Catálogo | Clientes y productos con búsqueda, paginación, formularios, validación y archivo |
| 13.4 — Operación | Historial/ajustes de inventario, nueva venta y detalle histórico con stock actualizado |
| 13.5 — Usuarios y tiempo real | Gestión de usuarios para admin, avisos `sale.created` y refresco tras reconexión |
| 13.6 — Demo y cierre | Pruebas, ejecución reproducible, capturas/video y documentación de límites |

Registrar resultados y pendientes de cada entrega antes de iniciar la siguiente. Si aparece una limitación del contrato, documentar y delimitar el ajuste de backend necesario antes de implementarlo.

## Ejecución local prevista

Durante desarrollo, Vite se ejecutará en el host y consumirá la API de Docker en `http://localhost:8080`. Se usará el mismo nombre de host en ambos servicios, revisando orígenes exactos, dominios stateful, cookies y CSRF. Se verificará también el proxy y la autenticación de Socket.io con la configuración existente.

Para la demo reproducible, añadir una etapa de compilación del frontend y servir sus archivos desde Nginx en Compose. El fallback de rutas SPA no debe interceptar `/api`, `/sanctum`, `/graphql` ni Socket.io. La demo debe abrir directamente una ruta interna y permitir recargarla. Conservar la entrada local única y los servicios de datos privados del stack actual.

Docker/Nginx ya compilan y sirven la interfaz. README y la guía `frontend-local.md` contienen los comandos de ejecución y comprobación.

## Validación y criterio de cierre

- Instalación desde el archivo de bloqueo, lint, pruebas de frontend y compilación de producción sin errores.
- Pruebas de componentes para formularios, errores `422`, acceso por rol y estados de carga/vacío/error.
- Recorrido de navegador real: login → crear cliente/producto → entrada de stock → venta → detalle → comprobación del stock → logout. Probar también venta sin cliente y rechazo por existencias insuficientes sin cambio de stock.
- Comprobar sesión al recargar, acceso directo a rutas, expiración, límites de login y cuenta sin negocio. Validar con dos negocios que los recursos ajenos siguen rechazados por el servidor y no quedan datos de la sesión anterior en pantalla al cambiar de cuenta.
- Comprobar admin/staff, archivo sin pérdida del historial, paginación y navegación por teclado en móvil y escritorio.
- Comprobar aviso de venta entre dos sesiones del mismo negocio, aislamiento entre negocios y recuperación de datos tras reconectar.
- Ejecutar las suites existentes de Laravel y realtime si cambia su integración; registrar los comandos y resultados reales.
- Entregar guía reproducible, datos ficticios, capturas/video del recorrido y límites conocidos en la documentación del portafolio.

El cierre se verifica con los resultados y evidencias registrados a continuación. El alcance público y AWS permanecen aplazados.

## Registro de ejecución y cierre

| Entrega | Estado y evidencia |
| --- | --- |
| 13.1 — Base | Cerrada: React/Vite/Tailwind, router, layout adaptable, HTTP, estados compartidos; build, lint y formato aprobados |
| 13.2 — Sesión | Cerrada: login CSRF, restauración al recargar, logout, expiración, rol y cuenta sin negocio; pruebas unitarias y navegador real |
| 13.3 — Catálogo | Cerrada: clientes/productos, búsqueda, paginación, creación, edición y archivo; validación 422 y conservación de datos |
| 13.4 — Operación | Cerrada: entradas, historial, venta con cliente y mostrador, total histórico, rechazo por stock insuficiente y saldo posterior |
| 13.5 — Usuarios y tiempo real | Cerrada: cuentas admin/staff, permisos, aviso entre ventanas, recursos de otro negocio rechazados y refresco tras reconexión |
| 13.6 — Demo y cierre | Cerrada: demo Docker, pruebas, capturas, videos, guía y límites documentados |

Comprobaciones realizadas el 22 de octubre de 2026:

- `npm run lint` y `npm run format:check`: aprobados sin avisos de código.
- `npm test` en frontend: **17 pruebas aprobadas** en 3 archivos.
- `npm run build` y build Docker de Nginx: aprobados, sin dependencias de desarrollo necesarias en el host para servir la demo.
- `npm run test:e2e`: **6 pruebas aprobadas** contra Docker real. Incluyen pantalla móvil de 390 px, navegación por teclado, rutas directas y recarga, venta, historial, usuarios, paginación, aislamiento, logout y límite real de login 429.
- Reconexión E2E: se corta únicamente el transporte WebSocket de la ventana observadora con Playwright; una venta ocurre mientras está desconectada y REST recupera el registro al reconectar. Los eventos y datos se generan con Laravel, PostgreSQL, Redis y Socket.io reales.
- PHPUnit mediante perfil Compose `test`: **28 pruebas aprobadas, 130 aserciones**, incluida integración Redis.
- Jest en `realtime/`: **4 pruebas aprobadas, 1 integración optativa omitida** en esta ejecución. El recorrido Playwright sí verifica el trayecto real Laravel → Redis → Socket.io → navegador.
- Pint: aprobado en los tres archivos PHP modificados. `git diff --check`: aprobado.

La integración detectó dos ajustes necesarios: Nginx debía usar `index.html` para la raíz SPA, y el prefijo global de Redis alteraba el canal publicado por Laravel. El publicador ahora usa una conexión `realtime` sin prefijo; caché y colas conservan sus prefijos. Se actualizaron sus pruebas y se comprobó la entrega real entre navegadores. El cliente usa WebSocket para enviar Origin al mismo origen y conserva la validación estricta del servidor.

Consulta la [guía de ejecución](frontend-local.md) y las [evidencias](evidencias-portafolio.md). Las pruebas usan negocios ficticios aislados; sus cuentas, sesiones y datos temporales se retiran mediante el script de cleanup. No se modifican las credenciales de cuentas preexistentes.

Límites: sin moneda configurada en el contrato, sin claves de idempotencia para ventas, sin GraphQL en la interfaz, sin reportes agregados ni despliegue público. La entrega se guardó en Git local. No se publicó en remoto.
