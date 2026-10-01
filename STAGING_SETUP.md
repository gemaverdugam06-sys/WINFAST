# 🚀 Guía Completa: Setup Staging - Supabase + Vercel + E2E Tests

> **Fecha**: 2026-09-01  
> **Objetivo**: Preparar environment de staging listo para testing  
> **Tiempo estimado**: 2-3 horas

---

## ✅ PASO 1: Crear Supabase Staging (30 mins)

### 1.1 Crear nuevo proyecto en Supabase

1. Ir a https://supabase.com/dashboard
2. Click en **"New Project"**
3. **Name**: `winfast-staging`
4. **Database Password**: Guardar en lugar seguro
5. **Region**: Seleccionar la más cercana
6. Click **Create new project**
7. Esperar a que se termine de crear (5-10 mins)

### 1.2 Obtener credenciales

Una vez creado, ir a **Settings > API**:

- Copiar `Project URL` → Guardar como `SUPABASE_URL`
- Copiar `anon public key` → Guardar como `SUPABASE_ANON_KEY`
- Copiar `service_role key` → Guardar como `SUPABASE_SERVICE_ROLE_KEY`

```env
# Guardar en lugar seguro (NO en .env.example)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...
VITE_SUPABASE_ANON_KEY=eyJxxx...

SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx... (SECRETO - NUNCA EN REPO)
```

---

## ✅ PASO 2: Ejecutar Migraciones en Supabase (20 mins)

### 2.1 Acceder a SQL Editor

1. En Supabase dashboard → Click en **SQL Editor**
2. Click en **New Query**

### 2.2 Ejecutar migraciones EN ORDEN

Copiar cada migración del archivo SQL y ejecutar:

**Archivos en**: `supabase/migrations/`

Ejecutar en este orden:

```
1. 20260606030635_dbd62f11-feaf-4afc-b1e1-d1bea6b4cf7b.sql
2. 20260606030648_123d4fc6-1a1f-41b1-bc44-55f139800e10.sql
3. 20260606030739_d48ed78d-9216-45de-99d3-eaa483f056b8.sql
4. 20260612033431_335901bb-a347-4e80-80a3-c66549eae4de.sql
5. 20260612033625_06e39d8e-2d8f-4c4b-a9a8-ec978a952a0e.sql
6. 20260613055350_aa71486c-31a9-4264-b9c7-6ee500d671cb.sql
7. 20260831_add_reviews_reports_security.sql
```

### 2.3 Verificar que RLS está ENABLED

Ir a **Database > Tables** y verificar que cada tabla tiene:

```
🔒 Row Level Security (RLS) is on
```

Tablas que DEBEN tener RLS:

- [ ] profiles
- [ ] categorias
- [ ] productos
- [ ] transacciones
- [ ] chats
- [ ] mensajes
- [ ] user_roles
- [ ] reseñas_vendedores
- [ ] reportes

---

## ✅ PASO 3: Crear Usuarios de Test (10 mins)

### 3.1 Ir a Authentication > Users

Click en **"Add user"** cuatro veces:

**Usuario 1 - Admin**

```
Email: admin-test@staging.local
Password: Admin@Staging2026!
```

**Usuario 2 - Usuario Normal**

```
Email: user-test@staging.local
Password: User@Staging2026!
```

**Usuario 3 - Usuario 2**

```
Email: user2-test@staging.local
Password: User2@Staging2026!
```

**Usuario 4 - Usuario Bloqueado**

```
Email: blocked-test@staging.local
Password: Blocked@Staging2026!
```

### 3.2 Asignar Roles en Database

Ir a **SQL Editor** y ejecutar:

```sql
-- Asignar admin
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'
FROM auth.users
WHERE email = 'admin-test@staging.local'
ON CONFLICT DO NOTHING;

-- Asignar usuarios normales
INSERT INTO user_roles (user_id, role)
SELECT id, 'user'
FROM auth.users
WHERE email IN ('user-test@staging.local', 'user2-test@staging.local', 'blocked-test@staging.local')
ON CONFLICT DO NOTHING;

-- Bloquear el usuario 4
UPDATE profiles
SET is_blocked = true, motivo_bloqueo = 'Test user - bloqueado para testing'
WHERE id = (SELECT id FROM auth.users WHERE email = 'blocked-test@staging.local');
```

### 3.3 Verificar Profiles

Ejecutar en SQL Editor:

```sql
SELECT id, email, is_blocked, created_at FROM profiles ORDER BY created_at DESC LIMIT 4;
```

Debe mostrar 4 registros con emails de test.

---

## ✅ PASO 4: Configurar Variables de Entorno (10 mins)

### 4.1 Para desarrollo local + E2E tests

Crear archivo: `.env.local` (NO commitearlo)

```bash
# Supabase Staging
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (SECRETO)

# Test credentials (para E2E)
TEST_ADMIN_EMAIL=admin-test@staging.local
TEST_ADMIN_PASSWORD=Admin@Staging2026!
TEST_USER_EMAIL=user-test@staging.local
TEST_USER_PASSWORD=User@Staging2026!
TEST_BLOCKED_EMAIL=blocked-test@staging.local
TEST_BLOCKED_PASSWORD=Blocked@Staging2026!
```

### 4.2 Agregar a .gitignore

```bash
echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "Add .env.local to gitignore"
```

---

## ✅ PASO 5: Configurar E2E Tests Locales (15 mins)

### 5.1 Actualizar playwright.config.ts

Cambiar `baseURL` de localhost a staging Supabase URL:

```typescript
const config: PlaywrightTestConfig = {
  testDir: "./e2e/tests",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
  use: {
    baseURL: "http://localhost:5173", // Para dev local
    // baseURL: 'https://staging-url.vercel.app', // Para Vercel staging (después)
  },
};
```

### 5.2 Actualizar e2e/helpers/auth.ts

El archivo ya tiene test credentials, pero verificar que coincidan:

```typescript
export const TEST_USERS = {
  admin: {
    email: "admin-test@staging.local",
    password: "Admin@Staging2026!",
  },
  user: {
    email: "user-test@staging.local",
    password: "User@Staging2026!",
  },
  user2: {
    email: "user2-test@staging.local",
    password: "User2@Staging2026!",
  },
  blocked: {
    email: "blocked-test@staging.local",
    password: "Blocked@Staging2026!",
  },
};
```

### 5.3 Verificar que tests tienen .skip() removido

En `e2e/tests/comprehensive.spec.ts`, los tests que requieren auth tienen `.skip`:

```typescript
test.skip('User login', async ({ page }) => { ... });
test.skip('Logout flow', async ({ page }) => { ... });
```

Estos deben correr en staging, así que necesitamos actualizarlos cuando todo esté conectado.

---

## ✅ PASO 6: Desplegar a Vercel Staging (20 mins)

### 6.1 Crear nuevo proyecto en Vercel

1. Ir a https://vercel.com/dashboard
2. Click **Add New Project**
3. Importar el repositorio de GitHub
4. **Project Name**: `winfast-staging`
5. **Framework**: Vite
6. **Root Directory**: `./`

### 6.2 Agregar Environment Variables

En Vercel → Settings → Environment Variables:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ... (SECRETO - Production only)
```

**IMPORTANTE**:

- SUPABASE_SERVICE_ROLE_KEY SOLO debe estar en **Production**
- Para Preview/Staging, dejar vacío o usar solo las keys públicas

### 6.3 Deploy

Click **Deploy** - Vercel hará el build automáticamente.

Esperar a que termine (5-10 mins).

### 6.4 Obtener URL de Staging

Una vez desplegado:

- Copiar URL: `https://winfast-staging-xxx.vercel.app`
- Guardar como `STAGING_URL`

---

## ✅ PASO 7: Ejecutar E2E Tests (30 mins)

### 7.1 Con dev server local

```bash
# Terminal 1
npm run dev

# Terminal 2
npm run test:e2e
```

### 7.2 Visualizar tests

```bash
npm run test:e2e:ui
# Abre interfaz visual en http://localhost:3000
```

### 7.3 Debug mode

```bash
npm run test:e2e:debug
# Abre navegador con Playwright Inspector
```

### 7.4 Tests esperados

**Deben PASAR (7 tests):**

- ✅ Homepage loads successfully
- ✅ Navigation links work
- ✅ Auth page is visible
- ✅ Admin redirect works
- ✅ No console errors
- ✅ Secrets not exposed

**Actualmente SKIPPED (13 tests):**

- ⏭️ User login
- ⏭️ User logout
- ⏭️ Admin login
- ⏭️ Normal user cannot access admin
- ⏭️ Admin can modify users
- ⏭️ IDOR prevention (users)
- ⏭️ IDOR prevention (products)
- ⏭️ User cannot edit other's products
- ⏭️ Blocked user logout
- ⏭️ Blocked user cannot create product
- ⏭️ Admin can block users
- ⏭️ Rate limiting works
- ⏭️ Session persistence

Una vez todo conectado, cambiar `.skip` a tests reales.

---

## ✅ PASO 8: Validar Flujos Críticos (45 mins)

### 8.1 Bloqueo de Usuarios

```
1. Login como admin-test@staging.local
2. Ir a Admin Panel > Usuarios
3. Bloquear user-test@staging.local
4. Login como user-test@staging.local (debe fallar o hacer logout)
5. VERIFICAR: Usuario no puede actuar
```

### 8.2 IDOR Prevention

```
1. Login como user-test@staging.local
2. Copiar URL de producto: /producto/xxxxx
3. Logout y login como user2-test@staging.local
4. Intentar acceder a /producto/xxxxx del otro usuario
5. VERIFICAR: No puede ver ni editar (403 o redirect)
```

### 8.3 Admin Only Access

```
1. Login como user-test@staging.local
2. Intentar acceder a /admin
3. VERIFICAR: Redirect a home, no puede entrar
```

### 8.4 Rate Limiting

```
1. Con script, enviar 150 requests a /api/productos en 5 segundos
2. VERIFICAR: Error 429 Too Many Requests después de X requests
```

---

## 📝 Checklist Final

- [ ] Supabase staging creado
- [ ] Migraciones ejecutadas (7 archivos)
- [ ] RLS verificado en 9 tablas
- [ ] 4 usuarios de test creados
- [ ] Admin asignado correctamente
- [ ] Usuario bloqueado en BD
- [ ] Variables de entorno en .env.local
- [ ] E2E config actualizada
- [ ] Vercel staging deployado
- [ ] URL staging obtenida
- [ ] npm run dev funciona con Supabase staging
- [ ] npm run test:e2e pasa todos los tests principales
- [ ] Flujos críticos validados manualmente
- [ ] Logs verificados (sin errores)
- [ ] Ready para producción

---

## 🔗 Links Útiles

- Supabase Dashboard: https://supabase.com/dashboard
- Vercel Dashboard: https://vercel.com/dashboard
- GitHub Repo: https://github.com/gemaverdugam06-sys/WINFAST
- Playwright Docs: https://playwright.dev/docs/intro

---

## ⚠️ Troubleshooting

### Error: "Column 'is_blocked' not found"

**Causa**: Migraciones no ejecutadas
**Fix**: Ejecutar `20260831_add_user_blocking.sql` en SQL Editor

### Error: "RLS violation"

**Causa**: RLS no está enabled en tabla
**Fix**: Ir a Database > Tables > [tabla] > Enable RLS

### Tests fallan con "Connection refused"

**Causa**: Supabase credentials no configuradas
**Fix**: Verificar VITE_SUPABASE_URL en .env.local

### npm run dev falla

**Causa**: Variables de entorno no cargadas
**Fix**: Crear .env.local con credenciales correctas

---

**Status**: 🟢 Ready para setup
**Próxima revisión**: Después de completar todos los pasos
