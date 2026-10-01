# 🎯 PLAN EJECUCIÓN STAGING - Guía Paso a Paso

> **Objetivo**: Desplegar WinFast a staging, validar, y preparar para producción  
> **Timeline Total**: 3-4 horas  
> **Fecha**: 2026-09-01  
> **Responsable**: Gema Verduga

---

## 📋 Sección 1: Credenciales y URLs de Staging (Para Completar)

Mientras ejecutas los pasos, completa esta sección con los valores reales:

### 1.1 Supabase Staging

```
PROYECTO SUPABASE
  Nombre:                winfast-staging
  Dashboard:             https://supabase.com/dashboard

  URL:                   https://xxxxx.supabase.co
  Anon Key:              eyJ...
  Service Role Key:      eyJ...

USUARIOS DE TEST CREADOS
  ✅ admin-test@staging.local / Admin@Staging2026!
  ✅ user-test@staging.local / User@Staging2026!
  ✅ user2-test@staging.local / User2@Staging2026!
  ✅ blocked-test@staging.local / Blocked@Staging2026!
```

### 1.2 Vercel Staging

```
PROYECTO VERCEL
  Nombre:                winfast-staging
  Dashboard:             https://vercel.com/dashboard
  URL:                   https://winfast-staging-xxxxx.vercel.app

ENVIRONMENT VARIABLES AGREGADAS
  ✅ VITE_SUPABASE_URL
  ✅ VITE_SUPABASE_PUBLISHABLE_KEY
  ✅ VITE_SUPABASE_ANON_KEY
  ✅ SUPABASE_URL
  ✅ SUPABASE_SERVICE_ROLE_KEY (Production only)
```

### 1.3 Local Environment

```
ARCHIVO: .env.local (NO committearlo)
  Ruta:                  c:\Users\Gema\Documents\WinFast\.env.local
  Contenido:             Variables Supabase staging
```

---

## 🚀 Sección 2: Ejecución Paso a Paso

### PASO 1: Preparar Supabase Staging (30 mins)

**Referencia**: `STAGING_SETUP.md` - Secciones 1-3

**Checklist**:

```
[ ] 1.1 Crear proyecto Supabase: winfast-staging
[ ] 1.2 Obtener credenciales (Project URL, anon key, service role key)
[ ] 1.3 Ejecutar 7 migraciones SQL en orden
[ ] 1.4 Verificar RLS habilitado en 9 tablas
[ ] 1.5 Crear 4 usuarios de test
[ ] 1.6 Asignar roles en database
[ ] 1.7 Bloquear usuario-test
```

**Si falla algo**:

- Error "Column not found" → No ejecutaste migraciones
- Error "RLS violation" → RLS no está enabled (ir a Database > Tables)
- Login falla → Usuarios no creados en Supabase Auth

**Documenta**:

```
SUPABASE_URL = ____________________________________
VITE_SUPABASE_ANON_KEY = __________________________
SUPABASE_SERVICE_ROLE_KEY = ________________________
```

---

### PASO 2: Configurar Variables Locales (5 mins)

**En tu máquina local**:

```bash
cd c:\Users\Gema\Documents\WinFast

# Crear archivo .env.local
notepad .env.local
```

**Contenido** (reemplazar con valores del Paso 1):

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Guardar**: Ctrl+S, cerrar

**Verificar que no se commitea**:

```bash
git status
# NO debe mostrar .env.local
```

---

### PASO 3: Ejecutar Aplicación en Dev Local (10 mins)

**Terminal 1 - Servidor Dev**:

```bash
cd c:\Users\Gema\Documents\WinFast
npm run dev
```

**Esperado**:

```
VITE v7.3.5 ready in 123 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

**Verifica**:

- ✅ Abre http://localhost:5173 en navegador
- ✅ Página carga sin errores
- ✅ Puedes ir a `/auth`
- ✅ F12 console sin errores rojos

**Si hay error**:

- "Cannot find module" → `npm install`
- "Connection refused" → `.env.local` variables incorrectas
- "RLS violation" → Migraciones no ejecutadas

---

### PASO 4: Probar Login Local (10 mins)

**En navegador** (http://localhost:5173):

```
1. Click en "Inicia sesión" o ir a /auth
2. Ingresa:
   Email: user-test@staging.local
   Password: User@Staging2026!
3. Click "Iniciar sesión"
4. ESPERADO: Redirecciona a home, ves sesión activa
```

**Si falla**:

- "Invalid login credentials" → Credenciales incorrectas en Supabase
- "Connection error" → Variables de entorno no configuradas
- "RLS violation" → Migraciones no ejecutadas

**Si funciona**:

- ✅ Verifica que ves tu email en esquina superior derecha
- ✅ Click en perfil, puedes ver información
- ✅ Puedes crear un producto, editar perfil
- ✅ Logout funciona

---

### PASO 5: Ejecutar E2E Tests (20 mins)

**Terminal 2 - E2E Tests**:

```bash
cd c:\Users\Gema\Documents\WinFast
npm run test:e2e
```

**Esperado**:

```
Running 7 tests...
✓ should load homepage
✓ should have proper navigation links
✓ should show auth page
✓ should not show admin panel to unauthenticated
✓ should redirect unauthenticated user
✓ No console errors detected
✓ Secrets not exposed in HTML
```

**Resultado**:

```
7 passed
13 skipped (requieren auth real)
20 total
```

**Si falla algo**:

- Tests timeout → Server no respondió (verificar que `npm run dev` está corriendo)
- "Connection refused" → VITE_SUPABASE_URL incorrecto
- Tests crash → Ver error en terminal 1 y terminal 2

**Herramientas de debug**:

```bash
# Ver interfaz visual
npm run test:e2e:ui

# Ver navegador en tiempo real
npm run test:e2e:headed

# Modo debug interactivo
npm run test:e2e:debug
```

---

### PASO 6: Desplegar a Vercel Staging (25 mins)

**Referencia**: `VERCEL_STAGING_DEPLOYMENT.md`

**Verificar Git**:

```bash
git status
# Debe mostrar: working tree clean
```

**Si hay cambios**:

```bash
git add .
git commit -m "Ready for staging: credenciales en .env.local, no en repo"
git push
```

**En Vercel Dashboard**:

1. **Crear proyecto**:
   - Ir a https://vercel.com/dashboard
   - Click "Add New Project"
   - Seleccionar `WINFAST` repository
   - Name: `winfast-staging`
   - Click "Import"

2. **Agregar Variables de Entorno**:
   - Ir a Settings > Environment Variables
   - Agregar VITE*SUPABASE*\* (Preview + Production)
   - Agregar SUPABASE\_\* (Production only)

3. **Deploy**:
   - Click "Deploy"
   - Esperar ~5-10 minutos
   - Estado cambia a ✅ Ready

4. **Obtener URL**:
   - Copiar: `https://winfast-staging-xxxxx.vercel.app`
   - Guardar en sección 1.2

**Documenta**:

```
VERCEL STAGING URL = https://winfast-staging-________________.vercel.app
```

---

### PASO 7: Validar en Staging URL (15 mins)

**En navegador**:

1. **Acceder a app**:

   ```
   https://winfast-staging-xxxxx.vercel.app
   ```

2. **Verificar que carga**:
   - ✅ Página de inicio visible
   - ✅ F12 console sin errores
   - ✅ Botón de login visible

3. **Probar login**:

   ```
   Email: user-test@staging.local
   Password: User@Staging2026!
   Click "Iniciar sesión"
   ```

4. **Verificar**:
   - ✅ Login exitoso
   - ✅ Ves sesión activa
   - ✅ Puedes navegar
   - ✅ Logout funciona

5. **Probar admin**:

   ```
   Email: admin-test@staging.local
   Password: Admin@Staging2026!
   Click "Iniciar sesión"
   ```

   - ✅ Admin puede entrar
   - ✅ Ver /admin funciona
   - ✅ Ves paneles de moderación

6. **Probar user bloqueado**:

   ```
   Email: blocked-test@staging.local
   Password: Blocked@Staging2026!
   Click "Iniciar sesión"
   ```

   - ⏳ En teoría debería hacer logout automático (requiere validar en código)
   - O dejar pasar y hace logout cuando intenta acceder

**Si algo falla**:

- "Connection error" → Variables en Vercel incorrectas
- "Invalid credentials" → Usuario no existe en Supabase
- "RLS violation" → Migraciones no ejecutadas

---

### PASO 8: Flujos Críticos de Seguridad (45 mins)

**Referencia**: `STAGING_SETUP.md` - Paso 8

#### 8.1 User Blocking Flow

```
1. Login como admin-test@staging.local
2. Ir a /admin/usuarios o panel admin
3. Buscar blocked-test@staging.local
4. Click "Desbloquear" (si está bloqueado ya)
5. Luego click "Bloquear" con motivo "Test blocking"
6. Verificar que aparece "Bloqueado" en tabla
7. Logout
8. Login como blocked-test@staging.local
9. RESULTADO ESPERADO:
   - Logout automático (si está implementado)
   - O acceso denegado si intenta actuar
```

**Documentar**:

```
User Blocking: ✅ Funciona / ⚠️ Parcialmente / ❌ No funciona
Detalles: _____________________________________________
```

#### 8.2 IDOR Prevention

```
1. Login como user-test@staging.local
2. Ir a /mis-publicaciones
3. Si no tiene productos, crear uno (ir a /publicar)
4. Copiar URL del producto: /producto/XXXXX
5. Logout
6. Login como user2-test@staging.local
7. Intentar acceder a /producto/XXXXX del otro usuario
8. RESULTADO ESPERADO:
   - Redirect a home (no autorizado)
   - O error 403 Forbidden
   - NO debe poder ver ni editar el producto
```

**Documentar**:

```
IDOR Prevention: ✅ Funciona / ⚠️ Parcialmente / ❌ No funciona
Detalles: _____________________________________________
```

#### 8.3 Admin Access Control

```
1. Login como user-test@staging.local (usuario normal)
2. Intentar acceder a /admin
3. RESULTADO ESPERADO:
   - Redirect a home
   - NO debe poder entrar
4. Logout
5. Login como admin-test@staging.local
6. Acceder a /admin
7. RESULTADO ESPERADO:
   - Entra al panel admin
   - Ve 5 tabs de moderación
```

**Documentar**:

```
Admin Access: ✅ Funciona / ⚠️ Parcialmente / ❌ No funciona
Detalles: _____________________________________________
```

#### 8.4 Rate Limiting

```
Con script Python o curl:
1. Enviar 150 requests a https://winfast-staging-xxxxx.vercel.app/api/productos
2. En cortos intervalos (10 segundos)
3. RESULTADO ESPERADO:
   - Primeros 100 requests: 200 OK
   - Después: 429 Too Many Requests
   - Después de esperar 1 min: De nuevo 200 OK
```

**Script bash/PowerShell**:

```powershell
$url = "https://winfast-staging-xxxxx.vercel.app/api/productos"
for ($i = 1; $i -le 150; $i++) {
  Write-Host "Request $i"
  Invoke-WebRequest -Uri $url -TimeoutSec 5 -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 50
}
```

**Documentar**:

```
Rate Limiting: ✅ Funciona / ⚠️ Parcialmente / ❌ No funciona
Detalles: _____________________________________________
```

---

## 📊 Sección 3: Resultados de Validación

**Después de completar todos los pasos, documentar**:

### 3.1 Pruebas Técnicas

```
ITEM                          RESULTADO        PROBLEMAS (si los hay)
────────────────────────────────────────────────────────────────
npm run build                 ✅ Exitoso       _______________
npm audit --omit=dev          ✅ 0 vulns       _______________
npm run test:e2e              ✅ 7 pasan       _______________
E2E total                      ✅ 20/20         _______________
Local login/logout            ✅ Funciona      _______________
Staging login/logout          ✅ Funciona      _______________
Admin access                  ✅ Funciona      _______________
```

### 3.2 Flujos de Seguridad

```
FLUJO                         ESTADO          NOTAS
────────────────────────────────────────────────────────────────
User Blocking                 ✅ ✔️ / ⚠️ / ❌  _______________
IDOR Prevention               ✅ ✔️ / ⚠️ / ❌  _______________
Admin Only Access             ✅ ✔️ / ⚠️ / ❌  _______________
Rate Limiting                 ✅ ✔️ / ⚠️ / ❌  _______________
Session Persistence          ✅ ✔️ / ⚠️ / ❌  _______________
RLS Policies                  ✅ ✔️ / ⚠️ / ❌  _______________
```

### 3.3 Veredicto Final

```
TESTING COMPLETADO

Funcionalidades confirmadas:        ___/7
Flujos de seguridad confirmados:    ___/6
Problemas encontrados:              ___

VEREDICTO:
[ ] 🟢 GO PRODUCTION - Todo funciona, listo para producción
[ ] 🟡 GO STAGING CON FIXES - Algunos problemas, requieren arreglos
[ ] 🔴 NO GO - Problemas críticos de seguridad, NO puede ir a prod

Observaciones:
_________________________________________________________________
_________________________________________________________________
```

---

## 🔗 Sección 4: Referencias Rápidas

### Links

```
GitHub Repo:        https://github.com/gemaverdugam06-sys/WINFAST
Supabase Dashboard: https://supabase.com/dashboard
Vercel Dashboard:   https://vercel.com/dashboard
Local Dev:          http://localhost:5173
```

### Credenciales Staging (Guardar en lugar seguro)

```
Supabase Staging Credentials:
  Project URL: https://xxxxx.supabase.co
  Anon Key: eyJ...
  Service Role Key: eyJ...

Test Users:
  admin-test@staging.local / Admin@Staging2026!
  user-test@staging.local / User@Staging2026!
  user2-test@staging.local / User2@Staging2026!
  blocked-test@staging.local / Blocked@Staging2026!

Vercel Staging:
  URL: https://winfast-staging-xxxxx.vercel.app
  Project: https://vercel.com/gemaverdugam06-sys/winfast-staging
```

### Comandos Útiles

```bash
# Dev local
npm run dev

# Tests E2E
npm run test:e2e
npm run test:e2e:ui        # Interfaz visual
npm run test:e2e:headed    # Ver navegador
npm run test:e2e:debug     # Modo debug

# Build
npm run build

# Verificaciones
npm audit --omit=dev
npm run lint

# Git
git status
git add .
git commit -m "mensaje"
git push
```

---

## ⏱️ Timeline de Ejecución

```
FASE                               TIEMPO    TOTAL ACUMULADO
──────────────────────────────────────────────────────────────
Supabase Setup                     30 mins   30 mins
Variables Locales                  5 mins    35 mins
Dev Local                          10 mins   45 mins
Login Test                         10 mins   55 mins
E2E Tests                          20 mins   75 mins
Vercel Deployment                  25 mins   100 mins
Staging Validation                 15 mins   115 mins
Security Flows                     45 mins   160 mins
Documentación de Resultados        15 mins   175 mins
──────────────────────────────────────────────────────────────
TOTAL                              160 mins  ~2.7 horas
```

---

## ✅ Checklist Final Completo

```
PREPARACIÓN
  [ ] Supabase staging creado
  [ ] Migraciones ejecutadas
  [ ] Usuarios de test creados
  [ ] Roles asignados
  [ ] .env.local configurado

DESARROLLO LOCAL
  [ ] npm run dev funciona
  [ ] Login funciona
  [ ] Logout funciona
  [ ] E2E tests pasan (7/7)

VERCEL STAGING
  [ ] Proyecto creado
  [ ] Variables de entorno agregadas
  [ ] Deploy completado exitosamente
  [ ] URL obtenida

VALIDACIÓN
  [ ] Homepage carga en staging
  [ ] Login/logout en staging funciona
  [ ] Admin access funciona
  [ ] User blocking funciona
  [ ] IDOR prevention funciona
  [ ] Rate limiting funciona
  [ ] RLS policies funcionan

DOCUMENTACIÓN
  [ ] Resultados completados
  [ ] Problemas documentados
  [ ] Veredicto final completado
  [ ] Credenciales guardadas

DECISIÓN GO/NO-GO
  [ ] Veredicto: 🟢 / 🟡 / 🔴
  [ ] Observaciones documentadas
  [ ] Next steps definidos
```

---

## 📞 Soporte

**Si falta algo**:

- Ver `STAGING_SETUP.md` para Supabase
- Ver `TESTING_QUICK_START.md` para tests
- Ver `VERCEL_STAGING_DEPLOYMENT.md` para Vercel

**Errores comunes**:

- Migraciones no ejecutadas → Ver "Troubleshooting" en STAGING_SETUP.md
- Variables incorrectas → Verificar en Vercel Settings > Environment Variables
- Tests fallan → Verificar que `npm run dev` está corriendo en Terminal 1

---

**ESTADO ACTUAL**: 🟢 Documentación lista para ejecución  
**PRÓXIMO PASO**: Ejecutar Paso 1 (Preparar Supabase Staging)  
**ESTIMADO**: 3-4 horas totales
