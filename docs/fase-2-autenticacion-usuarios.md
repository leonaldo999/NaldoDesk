# Fase 2 — Autenticación y usuarios

## Objetivo

Permitir acceso seguro a la API, identificar a la persona autenticada y proteger la administración de usuarios mediante roles.

## Decisiones

- Laravel Sanctum autentica la SPA propia mediante cookie de sesión y protección CSRF. No se emiten tokens personales en esta fase.
- El navegador debe solicitar `GET /sanctum/csrf-cookie` antes del inicio de sesión y enviar cookies en solicitudes posteriores.
- Los roles iniciales son `admin` y `staff`. Se guardan como texto en PostgreSQL y se convierten a `App\Enums\UserRole` en Laravel.
- No existe registro público. El primer administrador se crea localmente con `php artisan naldo:create-admin`.
- La administración de usuarios solo está disponible para `admin`; ambos roles requieren autenticación para las rutas protegidas.
- El inicio de sesión se limita a cinco intentos por minuto por dirección IP. Las respuestas no incluyen contraseñas ni `remember_token`.
- CORS permite credenciales desde los orígenes definidos por `CORS_ALLOWED_ORIGINS`; los dominios SPA se declaran en `SANCTUM_STATEFUL_DOMAINS`.

## API implementada

| Método | Ruta | Acceso | Función |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | Público, limitado | Inicia sesión |
| `GET` | `/api/auth/me` | Autenticado | Devuelve el perfil seguro |
| `POST` | `/api/auth/logout` | Autenticado | Cierra e invalida la sesión |
| `GET` | `/api/users` | `admin` | Lista usuarios |
| `POST` | `/api/users` | `admin` | Crea un usuario |

## Archivos principales

- `backend/bootstrap/app.php`: middleware SPA de Sanctum y alias de rol.
- `backend/routes/api.php`: rutas de autenticación y administración.
- `backend/app/Enums/UserRole.php`, `backend/app/Http/Middleware/RequireUserRole.php`: roles y autorización.
- `backend/app/Http/Controllers/Auth/AuthenticatedSessionController.php`, `backend/app/Http/Controllers/UserController.php`: lógica de endpoints.
- `backend/app/Console/Commands/CreateAdminUser.php`: alta inicial protegida.
- `backend/database/migrations/2026_10_12_000000_add_role_to_users_table.php`: rol persistido.
- `backend/config/cors.php`, `backend/.env.example`: configuración de credenciales y orígenes.
- `backend/tests/Feature/AuthenticationAndUsersTest.php`: pruebas de acceso, sesión, roles y datos devueltos.

## Verificación y estado

La migración se ejecutó sobre PostgreSQL. La suite Laravel terminó con 6 pruebas aprobadas y 17 aserciones. Se verificaron rechazo de invitados, login/logout, restricción de administración al rol `admin` y ausencia de contraseña en respuestas.

## Límite conocido en la Fase 2

La primera versión de esta fase no asociaba cuentas a un negocio. La Fase 3 añadió el vínculo de usuario a negocio y el filtrado de las operaciones comerciales y de la administración de usuarios; el modelo actual permite un negocio por usuario.
