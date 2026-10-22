# Fase 9 — Jest y estrategia de pruebas

## Objetivo

Adoptar Jest para probar el servicio JavaScript `realtime/`, que es el código JavaScript ejecutable del proyecto en esta etapa. Laravel conserva PHPUnit para sus pruebas de backend. La interfaz React sigue pendiente de planificación; cuando se implemente, su estrategia de pruebas se añadirá sobre esta base.

## Alcance

- Migrar las pruebas del servicio realtime desde `node:test` a Jest.
- Mantener pruebas para autorización de conexiones, aislamiento por negocio, expiración de sesión, validación de mensajes y entrega mediante Redis Pub/Sub y Socket.io.
- Mantener la prueba de integración Redis optativa para que `npm test` no dependa de Memurai/Redis.
- Añadir medición de cobertura de código JavaScript.
- Mantener PHPUnit como suite del backend Laravel.

No se modifica el comportamiento ni la arquitectura de producción de Laravel, Redis o Socket.io.

## Configuración

`realtime/package.json` habilita Jest como script de prueba. `realtime/jest.config.js` configura Node como entorno, usa módulos ESM y descubre las pruebas en `realtime/test/`. La opción experimental de módulos virtuales de Node es necesaria para que Jest ejecute directamente los archivos ESM existentes sin transformarlos.

## Ejecución

Desde PowerShell, en `realtime/`:

```powershell
npm test
npm run test:coverage
```

`npm test` ejecuta las pruebas deterministas con dobles de Redis; la prueba de integración Redis se omite por defecto. Para incluirla con Memurai/Redis activo:

```powershell
$env:REALTIME_INTEGRATION_TESTS = 'true'
npm test
Remove-Item Env:REALTIME_INTEGRATION_TESTS
```

Desde `backend/`, las pruebas PHP permanecen separadas:

```powershell
php artisan test
```

## Límites

- Jest cubre el servicio JavaScript existente; aún no hay componentes React que probar.
- PHPUnit cubre Laravel. Esta fase no cambia su framework.
- Las pruebas unitarias usan un doble de Redis; la integración activa verifica el transporte real con Memurai/Redis local.
- Los porcentajes de cobertura son una métrica para detectar áreas sin pruebas, no una garantía de calidad por sí solos.
