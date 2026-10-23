# Fase 12 — Portafolio local y referencia de costos AWS

Estado: AWS aplazado; prioridad de aprendizaje y portafolio sin gasto en nube. Fecha: 22 de octubre de 2026.

## Plan vigente — portafolio sin contratar servicios

El objetivo de esta etapa es aprender y preparar una presentación verificable del proyecto para el CV, sin contratar infraestructura en la nube. La propuesta AWS conservada más abajo es solo una referencia futura y no es un requisito para preparar el portafolio.

Presupuesto actual para servicios de infraestructura: **USD 0**. Se utilizará el equipo y el entorno local existentes; electricidad, conexión y equipo no se consideran gratuitos, pero no se contratarán servicios adicionales. No se requiere cuenta AWS, tarjeta ni dominio. No se activarán pruebas de pago ni servicios con facturación por consumo.

Secuencia propuesta para preparar el portafolio:

1. Mantener el stack Docker Compose local y su guía de instalación reproducible; documentar requisitos y comandos para que otra persona pueda ejecutarlo.
2. Preparar datos ficticios de demostración y un recorrido de autenticación, clientes, productos, inventario y ventas. No publicar datos personales, contraseñas ni archivos `.env`.
3. Incorporar capturas y un video corto de la API, Swagger, pruebas y funcionamiento de Socket.io. Una demostración local permite enseñar el trabajo sin mantener un servidor público.
4. Revisar el repositorio para presentación: README claro, arquitectura, instrucciones, evidencias de pruebas y límites conocidos. El repositorio ya está en GitHub; antes de compartir una nueva versión, revisar secretos e historial. No se hará un nuevo push como parte de esta fase sin una solicitud específica.
5. Planificar la interfaz React en una fase propia para disponer de una demostración visual, manteniendo su ejecución local. No está implementada ni se considera necesaria para describir con precisión el backend existente.
6. Preparar una descripción para el CV basada en lo realmente implementado. AWS debe figurar como arquitectura propuesta o aprendizaje futuro, nunca como despliegue realizado.

Criterio de entrega del portafolio: ejecución local reproducible, recorrido con datos ficticios, evidencias de pruebas, capturas/video y descripción verificable para el CV. Estas tareas están propuestas, no completadas por este documento. El despliegue AWS queda aplazado; completar el portafolio no implica desplegar AWS.

## Referencia futura — despliegue AWS de pago (aplazado)

No se crearán recursos ni se incurrirá en cargos hasta revisar y confirmar con el usuario la región, el presupuesto mensual máximo y el dominio. Esta referencia no autoriza el despliegue ni lo declara completado.

## Alcance y punto de partida

Publicar la API Laravel, PostgreSQL, Redis y Socket.io existentes mediante Docker Compose en un servidor Linux. El frontend React continúa pendiente de planificación y no está incluido. Las verificaciones Linux de la Fase 11 constan en su documento; no se han repetido para elaborar este plan.

La propuesta inicial es una instancia Lightsail Linux de 4 GB con IPv4 pública y disco de 80 GB. Todos los servicios compartirían servidor: apropiado como hipótesis de partida para una demostración o piloto de poco tráfico, sujeto a pruebas de memoria y carga. No ofrece alta disponibilidad; una caída afecta API, datos y notificaciones. No presupone capacidad comercial validada.

Región candidata para cotizar: `us-east-1` (Virginia), sin seleccionar ni aprobar. Antes de elegir, comparar latencia desde Perú, disponibilidad del paquete, tarifa y requisitos de residencia de datos. Si estos criterios exigen otra región, recalcular antes de crear recursos.

Flujo propuesto: Internet → HTTPS en proxy del host → Nginx de Compose en 127.0.0.1:8080 → Laravel / Socket.io → PostgreSQL / Redis privados. DNS apuntaría a una IP estática asociada al servidor. El nombre definitivo depende del dominio confirmado.

## Secuencia de implementación después de la confirmación

1. **Cerrar decisiones:** registrar región, máximo mensual y moneda, dominio o subdominio y titularidad, proveedor DNS, cuenta AWS y responsable operativo. Acordar si el máximo incluye impuestos, renovación anual y otros recursos de la cuenta. Revalidar precios y registrar la estimación final antes del aprovisionamiento.
2. **Preparar configuración de producción localmente:** crear configuración separada de Compose y ejemplo de variables sin secretos. Mantener PostgreSQL, Redis y PHP-FPM privados y Nginx ligado a loopback. Añadir `APP_ENV=production`, `APP_DEBUG=false`, URL HTTPS y paso explícito de `SESSION_SECURE_COOKIE=true` al contenedor; revisar dominio de sesión, Sanctum y orígenes exactos. Ajustar el healthcheck de Socket.io, hoy ligado al origen localhost. Verificar cabeceras HTTPS y confianza restringida en el proxy para Laravel y Socket.io. Proteger o deshabilitar Swagger público según el uso del piloto.
3. **Preparar operación:** documentar versiones e imágenes reproducibles, rotación de logs, actualizaciones, secretos con permisos restringidos y copia segura de APP_KEY. Definir worker de colas y scheduler solo si hay tareas que los requieren; el Compose actual no incluye esos procesos. Construir y probar imágenes antes de subirlas, evitando compilar con poca memoria en el servidor.
4. **Preparar cuenta y servidor:** MFA, acceso de mínimo privilegio, alertas de gasto y etiquetas del proyecto. Crear únicamente el paquete aprobado e IP asociada. Instalar Docker Engine y Compose en Linux; crear usuario de despliegue con clave SSH. Permitir SSH solo desde IP administrativa y HTTP/HTTPS públicos; revisar firewall del proveedor y host.
5. **Desplegar:** transferir imágenes y configuración segura; iniciar servicios, verificar salud y aplicar migraciones explícitamente tras un respaldo. Crear administrador mediante el comando interactivo sin contraseñas en historial. No copiar datos locales a la nube salvo decisión explícita.
6. **Dominio y TLS:** modificar únicamente los registros acordados, preservando correo y otros registros. Configurar proxy HTTPS del host con certificado ACME, renovación automática y soporte WebSocket; redirigir HTTP a HTTPS. Mantener Nginx interno en loopback y comprobar cookies y flujo CSRF completo.
7. **Respaldos y recuperación:** exportación PostgreSQL diaria y copia cifrada fuera de la instancia, incluyendo archivos persistentes necesarios. Propuesta: 7 copias diarias y 4 semanales, revisando tamaño real y caducidad. Conservar claves de recuperación fuera del servidor. Los snapshots complementan el respaldo lógico; probar restauración de PostgreSQL y archivos antes de aceptar el despliegue. Objetivos iniciales propuestos: RPO 24 h y RTO 4 h, pendientes de validar mediante ensayo. Un servidor temporal de restauración requiere costo previsto dentro de la autorización.
8. **Validación y entrega:** comprobar API, login/CSRF/logout, roles, aislamiento por negocio, ventas e inventario, GraphQL y Socket.io con reconexión; ejecutar PHPUnit/Jest y pruebas de integración. Comprobar persistencia tras reinicio, TLS/renovación, ausencia de puertos de datos públicos, backups restaurables y consumo de recursos. Registrar resultados, responsable y procedimiento de reversión.

Reversión: conservar la imagen anterior y respaldar antes de migrar. Si una migración no es compatible con la versión anterior, evaluar restauración con la pérdida de datos correspondiente al respaldo; no ejecutar rollback destructivo automáticamente. Para una retirada, exportar datos y acordar eliminación de instancia, snapshots, IP y DNS; detener la instancia por sí solo no elimina todos los cargos.

## Estimación mensual de referencia

USD, mes completo, una sola instancia, poco tráfico, sin descuentos ni créditos gratuitos. Las cantidades de respaldo son supuestos de cálculo, no consumo medido. Precios oficiales consultados al preparar el documento; volver a confirmar para la región elegida.

| Concepto | Cálculo | USD/mes |
| --- | --- | ---: |
| Lightsail Linux, 2 vCPU, 4 GB RAM, 80 GB SSD, IPv4 pública | 1 paquete | 24,00 |
| Snapshots almacenados | supuesto de 80 GB facturables × 0,05 | 4,00 |
| DNS de Lightsail | incluido; registro del dominio aparte | 0,00 |
| Reserva para copia externa y operación | provisión de planificación, no tarifa de servicio | 5,00 |
| **Subtotal de planificación** | 24 + 4 + 5 | **33,00** |
| Contingencia propuesta del 20 % | 33 × 0,20 | 6,60 |
| **Previsión con margen, antes de dominio e impuestos** | 33 + 6,60 | **39,60** |

El paquete de referencia incluye 4 TB de transferencia; verificar condiciones regionales y sobrecostos. Los snapshots se cobran por almacenamiento facturable acumulado: 80 GB es un escenario, no una garantía para la retención propuesta. Si fueran 160 GB, esa partida sería USD 8 y la previsión subiría a USD 44,40 con el mismo margen. La reserva de USD 5 debe sustituirse por una cotización del destino de backup elegido, incluyendo almacenamiento, solicitudes, recuperación y transferencia, antes del despliegue.

Para revisar: **USD 40/mes antes de dominio e impuestos** como envolvente inicial aproximada, no como límite aprobado ni garantía. Si se necesita un tope integral de USD 40, habrá que descontar impuestos y dominio y ajustar la configuración antes de autorizar.

Si el dominio cuesta D USD/año y los impuestos aplicables son T USD/mes, la previsión recurrente equivalente es **39,60 + D/12 + T**. La compra o renovación se paga anualmente: flujo de caja del primer mes **39,60 + D + impuestos aplicables**. D queda pendiente de dominio, extensión, registrador y precio de renovación; no se ha comprobado disponibilidad ni contratado nada. Mano de obra y mantenimiento humano no están valorizados.

Route 53 sería opcional: una zona alojada cuesta USD 0,50/mes más consultas; no está incluida ni es necesaria si se utiliza DNS de Lightsail. Tampoco se incluyen RDS, ElastiCache, balanceador, NAT Gateway, CDN, correo transaccional, segundo entorno permanente, soporte de pago ni alta disponibilidad. Incorporarlos exige nuevo cálculo.

## Control de gasto y criterios de cierre

Tras autorización, proponer alertas al 50 %, 80 % y 100 % del máximo confirmado, revisión semanal y retención limitada de respaldos y logs. AWS Budgets puede notificar con retraso: las alertas no garantizan un corte automático ni un máximo absoluto de facturación. Las copias, IP sin asociar, exceso de tráfico y recursos olvidados pueden seguir generando cargos. El máximo acordado será una restricción de diseño y operación que exige seguimiento.

| Decisión obligatoria | Estado |
| --- | --- |
| Región definitiva | Pendiente de confirmación |
| Presupuesto mensual máximo, moneda e inclusiones | Pendiente de confirmación |
| Dominio/subdominio y gestión DNS | Pendiente de confirmación |

El plan de portafolio local queda definido, pero sus tareas aún no están completadas. El despliegue AWS queda en espera y solo se retomará con un alcance y un presupuesto aprobados por separado. No se han creado recursos, cambiado DNS ni realizado compras como parte de esta preparación.

## Fuentes oficiales

- [Paquetes Lightsail](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html): capacidad y tarifa del paquete.
- [Facturación Lightsail](https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-frequently-asked-questions-faq-billing-and-account-management.html): snapshots y cargos de IP sin asociar.
- [Precios Lightsail](https://aws.amazon.com/lightsail/pricing/): DNS incluido y condiciones de precios.
- [Precios Route 53](https://aws.amazon.com/route53/pricing/): alternativa de DNS.
- [AWS Budgets](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html): alertas y retrasos de notificación.
