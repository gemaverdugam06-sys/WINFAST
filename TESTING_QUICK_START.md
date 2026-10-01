# 🎬 Comandos Rápidos para Testing

## Desarrollo Local

```bash
# Terminal 1: Iniciar servidor dev
npm run dev

# Verá la app en http://localhost:5173
```

```bash
# Terminal 2: Ejecutar E2E tests
npm run test:e2e

# O con interfaz visual
npm run test:e2e:ui

# O en modo headless (visible browser)
npm run test:e2e:headed

# O en debug mode (inspector)
npm run test:e2e:debug
```

## Verificaciones Previas

```bash
# Verificar que no hay errores de build
npm run build

# Verificar que el código cumple linting
npm run lint

# Auditar vulnerabilidades
npm audit --omit=dev
```

## Variables de Entorno Necesarias

Crear archivo `.env.local` (NO committearlo):

```env
# Supabase Staging Credentials
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_ANON_KEY=eyJ...

# Server-only (para SSR)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Para Testing en Vercel Staging

Una vez deployado a Vercel staging, cambiar en `playwright.config.ts`:

```typescript
// De:
baseURL: process.env.BASE_URL || 'http://localhost:5173',

// A:
baseURL: process.env.BASE_URL || 'https://winfast-staging-xxx.vercel.app',
```

O setear variable de entorno:

```bash
$env:BASE_URL="https://winfast-staging-xxx.vercel.app"
npm run test:e2e
```

## Estados de los Tests

### ✅ PASAN SIEMPRE (7 tests)

- Homepage loads
- Navigation works
- Auth page visible
- Admin redirect
- No console errors
- Secrets not exposed
- Build verification

### ⏭️ SKIPPED (requiere Supabase staging activo)

- Admin login
- User login
- Logout flow
- Invalid credentials
- Auth errors
- Protected routes redirect
- IDOR prevention (users)
- IDOR prevention (products)
- User cannot edit others' products
- Privilege escalation
- Blocked user logout
- Blocked user restrictions
- Rate limiting

## Monitoreo de Resultados

Los resultados se guardan en:

```
e2e/results/results.json       # JSON results
e2e/results/index.html         # Visual report
playwright-report/index.html   # Playwright HTML report
```

Abrir el reporte:

```bash
npx playwright show-report
```

## Flujos de Prueba Manual (después de E2E)

1. **Login/Logout**

   ```
   1. Ir a /auth
   2. Ingresar credenciales de usuario
   3. Verificar sesión persistente
   4. Logout
   5. Verificar sesión limpiada
   ```

2. **Admin Access**

   ```
   1. Login como admin
   2. Ir a /admin
   3. Verificar tablero de moderación
   4. Logout
   5. Intentar ir a /admin con usuario normal
   6. Verificar que se rechaza acceso
   ```

3. **User Blocking**

   ```
   1. Admin bloquea un usuario
   2. Usuario bloqueado intenta login
   3. Verificar que se hace logout automáticamente
   4. Admin desbloquea usuario
   5. Usuario intenta login de nuevo
   6. Verificar que accede normalmente
   ```

4. **IDOR Prevention**

   ```
   1. Usuario A crea producto ID=123
   2. Usuario B intenta /producto/123/edit
   3. Verificar que se rechaza (403 o redirect)
   4. Usuario A intenta PUT /api/productos/456 (de otro usuario)
   5. Verificar que se rechaza
   ```

5. **Rate Limiting**
   ```
   1. Script: Enviar 150 requests a /api/productos en 10 segundos
   2. Verificar que después de X requests obtiene 429
   3. Verificar que se recupera después de esperar
   ```

## Troubleshooting

| Error                 | Causa                      | Solución                                    |
| --------------------- | -------------------------- | ------------------------------------------- |
| "Connection refused"  | Supabase no conecta        | Verificar VITE_SUPABASE_URL en .env.local   |
| "RLS violation"       | Permisos de BD incorrectos | Ejecutar migraciones en Supabase            |
| "User not found"      | Usuarios no creados        | Crear usuarios en Supabase Auth             |
| "Tests timeout"       | Servidor no responde       | Verificar que `npm run dev` está corriendo  |
| "Invalid credentials" | Contraseñas incorrectas    | Verificar TEST_USERS en e2e/helpers/auth.ts |

## Checklist pre-testing

- [ ] .env.local creado con credenciales correctas
- [ ] Supabase staging instancia creada
- [ ] Migraciones ejecutadas
- [ ] 4 usuarios de test creados
- [ ] Roles asignados (admin, user, bloqueado)
- [ ] `npm run dev` corre sin errores
- [ ] `npm run build` exitoso
- [ ] `npm audit --omit=dev` sin vulnerabilidades
- [ ] playwright.config.ts con baseURL correcto

---

**Documentación**: Ver STAGING_SETUP.md para setup completo
**Status**: 🟢 Ready para testing local
