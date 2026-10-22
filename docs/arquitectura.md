# NaldoDesk — propuesta de arquitectura

## 1. Propósito

NaldoDesk será una aplicación SaaS para la gestión de pequeños negocios. El proyecto se desarrollará por fases pequeñas, manteniendo una versión funcional y explicable después de cada una. Este documento registra la arquitectura propuesta y las decisiones que deben revisarse cuando lleguemos a la fase correspondiente.

Este documento no implica que la aplicación, sus servicios o su infraestructura ya estén implementados.

## 2. Objetivos y criterios

- Construir una API mantenible y segura para usuarios y operaciones del negocio.
- Usar las tecnologías elegidas para el proyecto: PHP, Laravel, PostgreSQL y API REST como base.
- Añadir las tecnologías posteriores cuando exista un caso de uso claro y una fase definida para ellas.
- Mantener responsabilidades separadas entre interfaz, API, persistencia e infraestructura.
- Evitar exponer secretos en el código o en el control de versiones; la configuración sensible se manejará mediante variables de entorno.
- Documentar decisiones y validar cada incremento antes de continuar.

## 3. Arquitectura de alto nivel

La propuesta comienza como una aplicación modular, no como un conjunto de microservicios:

```text
Navegador
   │
   ├── Interfaz web (React, Vite, JavaScript y Tailwind CSS; fase por definir)
   │       │ HTTP / JSON
   │       ▼
   └── API REST (PHP y Laravel)
            │
            ▼
        PostgreSQL
```

Laravel será responsable de las reglas del negocio, validación de solicitudes, autorización, acceso a datos y respuestas de la API. PostgreSQL será la fuente principal de datos. La interfaz React consumirá la API mediante HTTP y JSON cuando se planifique su incorporación.

La Fase 1 se concentra deliberadamente en Laravel, PostgreSQL y REST. La incorporación y el despliegue del frontend requieren alcance y fase acordados antes de implementarlos; no se asume que deban adelantarse a esa fase.

## 4. Componentes y responsabilidades

| Componente | Responsabilidad prevista | Fase |
| --- | --- | ---: |
| Laravel / PHP | API REST, reglas de negocio, validación y acceso a datos | 1 en adelante |
| PostgreSQL | Persistencia relacional de usuarios y datos comerciales | 1 en adelante |
| React / Vite / JavaScript / Tailwind CSS | Interfaz web que consume la API | Pendiente de planificar |
| Swagger / OpenAPI | Contrato y documentación navegable de la API | 5 |
| Redis | Capacidad de almacenamiento en memoria para los casos de uso que se definan | 6 |
| GraphQL | Interfaz adicional de consulta, con límites claros respecto a REST | 7 |
| Socket.io | Comunicación en tiempo real para casos de uso definidos | 8 |
| Jest | Pruebas de JavaScript, principalmente para el frontend | 9 |
| Docker / Docker Compose / Nginx | Entorno reproducible y entrada HTTP al sistema | 10 |
| Linux | Entorno operativo y administración del despliegue | 11 |
| AWS | Alojamiento y servicios de despliegue, definidos al llegar a esa fase | 12 |

## 5. Organización lógica del backend

El backend se organizará por dominios funcionales dentro de una aplicación Laravel. Los límites iniciales previstos son:

- **Identidad:** autenticación, usuarios y roles.
- **Catálogo:** clientes y productos.
- **Inventario:** existencias y movimientos.
- **Ventas:** registro de ventas y sus efectos en inventario.
- **Consultas:** dashboard y reportes, cuando se planifiquen.

Esta división describe responsabilidades; no prescribe todavía nombres de clases, tablas, paquetes ni una estructura de carpetas específica. Se concretarán durante las fases de implementación correspondientes y se documentarán los cambios relevantes.

## 6. Decisiones iniciales

1. **Una aplicación Laravel modular:** mantiene el inicio comprensible y reduce el costo de operar varios servicios. Los límites de dominio permiten revisar la separación si el crecimiento del producto lo requiere.
2. **PostgreSQL como base de datos principal:** las operaciones comerciales y sus relaciones se almacenarán en una base relacional.
3. **REST como API inicial y principal:** permite establecer primero un contrato HTTP directo. GraphQL se añadirá después como interfaz adicional si los casos de consulta lo justifican.
4. **Docker se implementará en la Fase 10:** aunque facilitará la ejecución reproducible, no se adelanta a las fases de dominio acordadas.
5. **Pruebas por fase y fase específica de testing:** cada fase debe tener comprobaciones proporcionales a lo que implemente. La Fase 9 organizará y ampliará la estrategia de pruebas de JavaScript; no será la primera vez que se compruebe el funcionamiento del proyecto.
6. **Secretos fuera del repositorio:** se documentarán variables requeridas mediante un archivo de ejemplo sin valores secretos cuando se implemente la configuración.

## 7. Flujo de datos y consistencia

El cliente enviará solicitudes HTTP a Laravel. Laravel validará la entrada, ejecutará la regla de negocio y responderá con JSON y códigos HTTP adecuados. La API no permitirá que la interfaz acceda directamente a PostgreSQL.

En la Fase 7, el endpoint GraphQL `/graphql` sirve como adaptador adicional de consulta. Los resolvers reutilizan Eloquent y aplican el negocio del usuario autenticado; las escrituras continúan en REST para mantener un único camino de mutación y validación.

En la Fase 8, Laravel publica por Redis Pub/Sub el evento mínimo `sale.created` después de confirmar la venta. Un proceso Node.js con Socket.io valida la sesión con Laravel y transmite la notificación a la sala derivada del negocio autenticado. Las notificaciones no reemplazan consultas REST ni se conservan como historial.

En la Fase 9, Jest prueba el servicio JavaScript existente de Socket.io, incluidas autorización, aislamiento por negocio y una integración Redis opcional. PHPUnit continúa siendo el framework de pruebas para Laravel. La interfaz React aún no está implementada; sus pruebas se definirán cuando se planifique esa interfaz.

En la Fase 10, Docker Compose ejecuta PHP-FPM/Laravel, PostgreSQL, Redis, Socket.io y Nginx. Solo Nginx publica `127.0.0.1:8080`; los puertos de PostgreSQL y Redis permanecen en la red privada de Compose. Los datos usan volúmenes propios, la configuración sensible local va en `.env.docker` ignorado por Git y las migraciones se lanzan de forma explícita. Una imagen separada incorpora PHPUnit y ejecuta pruebas contra SQLite en memoria y Redis de Compose.

Las ventas y los cambios de inventario pueden afectar varios registros como parte de una sola operación. Al implementar esas funciones se deberán usar transacciones de base de datos y definir cómo se manejan errores y concurrencia para evitar estados parciales. El diseño concreto se resolverá en las Fases 3 y 4.

En la Fase 4, Laravel guarda venta, líneas y movimientos de inventario dentro de una transacción; bloquea las filas de producto antes de validar existencias, calcula importes en centavos enteros y conserva nombre, SKU y precio al momento de la venta. Las ventas no se editan ni borran por la API inicial.

## 8. Seguridad y configuración

- Validar en el backend todos los datos recibidos, incluso si la interfaz también los valida.
- Aplicar autenticación y autorización en las rutas protegidas cuando se implementen usuarios y roles.
- GraphQL comparte la sesión Sanctum y exige que el usuario tenga un negocio; sus consultas se filtran por `business_id` en el backend.
- Guardar credenciales y claves en variables de entorno; no incluir secretos en el repositorio.
- Limitar la información de error devuelta al cliente y registrar detalles técnicos de forma apropiada.
- Revisar CORS, sesiones o tokens y políticas de contraseñas al definir la autenticación en la Fase 2.
- Revisar permisos por rol y por recurso antes de habilitar operaciones sobre datos de negocio.

## 9. Roadmap acordado

| Fase | Alcance |
| ---: | --- |
| 0 | Arquitectura y decisiones documentadas |
| 1 | Laravel + PostgreSQL + API REST |
| 2 | Autenticación + usuarios |
| 3 | Clientes + productos + inventario |
| 4 | Ventas |
| 5 | Swagger / OpenAPI |
| 6 | Redis |
| 7 | GraphQL |
| 8 | Socket.io |
| 9 | Jest / testing |
| 10 | Docker + Docker Compose + Nginx |
| 11 | Linux |
| 12 | AWS / despliegue |

La interfaz React está en los requisitos del producto, pero no aparece como fase independiente en este orden. Su momento de implementación debe acordarse antes de construirla. El dashboard, notificaciones y reportes también necesitan alcance detallado en las fases de dominio correspondientes.

## 10. Riesgos técnicos y mitigaciones

| Riesgo | Mitigación propuesta |
| --- | --- |
| Empezar demasiadas tecnologías a la vez | Respetar el roadmap y limitar cada fase a un incremento demostrable. |
| Roles o permisos insuficientes | Definir capacidades y probar acceso permitido y denegado al implementar autenticación. |
| Venta e inventario quedan en estados inconsistentes | Diseñar operaciones transaccionales y contemplar concurrencia en las Fases 3 y 4. |
| REST, GraphQL y Socket.io duplican lógica | Mantener las reglas de negocio en Laravel y tratar las interfaces adicionales como adaptadores con responsabilidades explícitas. |
| Notificaciones en tiempo real no son durables | Redis Pub/Sub puede perder mensajes si el consumidor no está conectado. Mantener PostgreSQL como fuente de verdad y hacer que el cliente vuelva a consultar REST al reconectar. |
| Aislamiento incorrecto en Socket.io | Validar la sesión mediante Laravel y derivar en el servidor la sala desde el `business_id`; no aceptar sala o negocio enviado por el cliente. |
| Pruebas automatizadas se incorporan tarde | Hacer verificaciones necesarias en cada fase y reservar la Fase 9 para formalizar y ampliar la estrategia. Jest cubre JavaScript; las pruebas del backend Laravel requieren seleccionar y documentar una herramienta adecuada al iniciar ese trabajo. |
| Despliegue complejo al final | Documentar configuración y dependencias durante las fases; diseñar Docker en la Fase 10 y despliegue AWS en la Fase 12. |

## 11. Decisiones de autenticación implementadas en Fase 2

- **Sanctum con sesiones para la SPA propia:** el navegador autentica con cookie de sesión y protección CSRF. El flujo de React será solicitar primero `GET /sanctum/csrf-cookie` y luego enviar solicitudes con credenciales. Los tokens personales para integraciones externas quedan fuera del alcance actual.
- **Roles iniciales:** `admin` y `staff`, guardados como texto en PostgreSQL y representados como enum en PHP. Las rutas de administración de usuarios requieren autenticación y rol `admin`.
- **Alta inicial protegida:** el primer administrador se crea desde el comando local `php artisan naldo:create-admin`; no hay registro público abierto.
- **Protecciones de acceso:** inicio de sesión limitado a cinco intentos por minuto por IP; respuestas de usuario omiten la contraseña y el token de recordar sesión.
- **CORS local:** se permiten credenciales solo desde los orígenes definidos en `CORS_ALLOWED_ORIGINS`. En desarrollo Vite usa los puertos 5173 de `localhost` y `127.0.0.1`.
- **Negocios y pertenencia (Fase 3):** cada usuario pertenece a un negocio; varios usuarios pueden compartir uno. Clientes, productos, movimientos y listados de usuarios quedan limitados a ese negocio. Los roles se aplican dentro del negocio.

## 12. Decisiones pendientes

Se resolverán cuando sean necesarias, evitando fijar detalles sin contexto de implementación:

- Momento y alcance de la interfaz React dentro del roadmap.
- Soportar una cuenta que pertenezca a varios negocios, si el producto lo requiere; el MVP asigna cada usuario a un solo negocio.
- Modelo de datos y reglas para inventario, ventas, devoluciones y concurrencia.
- Casos de uso adicionales para Redis, GraphQL y tiempo real fuera de la consulta GraphQL inicial y el evento `sale.created`.
- Herramientas de pruebas del backend y estrategia completa de pruebas JavaScript.
- Versiones compatibles de PHP, Laravel, PostgreSQL y Node.js al iniciar las fases respectivas.
- Servicios AWS, dominio, TLS, almacenamiento, copias de seguridad y estrategia de despliegue.

## 13. Criterio de cierre de la Fase 0

La Fase 0 se considera documentada cuando el roadmap, los componentes base, las responsabilidades y los riesgos están visibles en este archivo. Antes de iniciar cada fase de implementación se explicarán su objetivo, problema, archivos, tecnologías y comprobaciones, y se aclararán las decisiones pendientes que afecten su alcance.
