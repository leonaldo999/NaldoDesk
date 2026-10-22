# Fase 5 — Swagger y OpenAPI

## Objetivo

Publicar un contrato navegable de la API REST actual, para consultar rutas, datos de entrada, respuestas y reglas de autenticación desde Swagger UI.

## Decisión técnica

Se usa L5-Swagger 11.1.0 con swagger-php 6 y atributos PHP 8. La versión elegida declara compatibilidad con Laravel 13. El contrato se mantiene en `backend/app/OpenApi/ApiSpecification.php`; al generarlo, Laravel guarda JSON/YAML en `backend/storage/api-docs/`. La configuración del paquete se mantiene en `backend/config/l5-swagger.php`.

## Uso local

Desde `backend/`, con el servidor Laravel activo:

```powershell
php artisan l5-swagger:generate
```

Abre [http://127.0.0.1:8000/api/documentation](http://127.0.0.1:8000/api/documentation). El JSON del contrato queda accesible en `http://127.0.0.1:8000/docs?api-docs.json`.

Sanctum autentica mediante cookies de sesión. En Swagger UI, ejecuta primero `GET /sanctum/csrf-cookie`, luego `POST /api/auth/login`; la interfaz conserva las cookies de sesión y envía el token CSRF leído de la cookie `XSRF-TOKEN`. Usa exclusivamente datos locales de prueba.

## Alcance documentado

Incluye salud, sesión, usuarios, clientes, productos, movimientos de inventario y ventas. Todas las operaciones protegidas son por negocio; las de usuarios requieren rol administrador. Las solicitudes inválidas responden con `422`, una sesión faltante con `401`, y recursos ajenos/inexistentes con `404`.

## Validación

Genera la especificación y comprueba que `backend/storage/api-docs/api-docs.json` sea JSON válido con `openapi` y las rutas esperadas. La suite de Laravel valida que las funciones existentes continúen operativas.

## Fuera de alcance

No cambia autenticación ni rutas de negocio. No añade bearer tokens, ni crea credenciales de prueba. La documentación sigue la API actual; al cambiar un endpoint hay que actualizar estos atributos y regenerar la especificación. La vista Swagger se publica en `backend/resources/views/vendor/l5-swagger/` para añadir el encabezado CSRF requerido por la sesión Sanctum.
