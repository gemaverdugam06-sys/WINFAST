# 🚀 Guía Vercel Staging Deployment

> **Objetivo**: Desplegar WinFast a Vercel environment de staging  
> **Tiempo estimado**: 20 minutos de configuración + 10 minutos de build

---

## ✅ PASO 1: Preparar Repositorio (5 mins)

### 1.1 Verificar que todo está commiteado

```bash
cd c:\Users\Gema\Documents\WinFast
git status
```

Debe mostrar:

```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

Si hay cambios:

```bash
git add .
git commit -m "Ready for staging deployment"
git push
```

### 1.2 Verificar que vercel.json está correcto

El archivo ya existe con:

- ✅ CSP headers configurados
- ✅ X-Frame-Options: DENY
- ✅ Build command correcto
- ✅ Output directory correcto

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist/client"
}
```

---

## ✅ PASO 2: Crear Proyecto en Vercel (10 mins)

### 2.1 Ir a Vercel Dashboard

1. Abrir https://vercel.com/dashboard
2. Click en **"Add New..."** → **"Project"**

### 2.2 Importar Repositorio

1. Seleccionar **GitHub** como fuente
2. Buscar: `gemaverdugam06-sys/WINFAST`
3. Click **"Import"**

### 2.3 Configurar Proyecto

En la pantalla de importación:

**Project Name**: `winfast-staging`

**Framework**: Vite (auto-detectado)

**Root Directory**: `./` (default)

**Build Command**: `npm run build` (auto-detectado)

**Output Directory**: `dist/client` (auto-detectado)

**Environment Variables**: Dejar vacío por ahora (agregar en siguiente paso)

---

## ✅ PASO 3: Agregar Environment Variables (5 mins)

### 3.1 Después de crear proyecto, ir a Settings

En Vercel dashboard del proyecto → **Settings** → **Environment Variables**

### 3.2 Agregar variables PÚBLICAS (para browser)

```
Variable Name: VITE_SUPABASE_URL
Value: https://xxxxx.supabase.co
Environments: Preview, Production
```

```
Variable Name: VITE_SUPABASE_PUBLISHABLE_KEY
Value: eyJ... (clave pública)
Environments: Preview, Production
```

```
Variable Name: VITE_SUPABASE_ANON_KEY
Value: eyJ... (clave anon)
Environments: Preview, Production
```

### 3.3 Agregar variables PRIVADAS (solo server)

```
Variable Name: SUPABASE_URL
Value: https://xxxxx.supabase.co
Environments: Production Only
```

```
Variable Name: SUPABASE_SERVICE_ROLE_KEY
Value: eyJ... (service role key - MÁS SECRETO)
Environments: Production Only
```

**⚠️ IMPORTANTE:**

- Variables públicas (VITE\_\*) pueden estar en Preview
- Variables privadas (SUPABASE_SERVICE_ROLE_KEY) SOLO en Production
- Para staging, usar Preview deployment sin service role

### 3.4 Guardar cambios

Click **"Save"**

---

## ✅ PASO 4: Trigger Deploy

### 4.1 En Deployments tab

Click **"Deploy"** o esperar a que auto-deploy por push en main

Vercel ejecutará:

```
npm install
npm run build
Deploying dist/client
```

### 4.2 Monitorear progreso

- Vercel mostrará logs de build en tiempo real
- Esperar a que termine (~2-3 minutos)
- Estado cambiará a ✅ Ready cuando termine

### 4.3 Obtener URL

Una vez deployado:

- **Preview URL**: https://winfast-staging-xxx.vercel.app
- **Commit URL**: https://winfast-staging-xxx.vercel.app?vercel_url=...

Copiar URL principal: `https://winfast-staging-xxx.vercel.app`

---

## ✅ PASO 5: Verificar Deploy (5 mins)

### 5.1 Acceder a la app

1. Abrir URL: https://winfast-staging-xxx.vercel.app
2. Esperar a que cargue completamente
3. Verificar que ve la página de inicio

### 5.2 Verificar que conecta a Supabase

```javascript
// En browser console (F12):
console.log(localStorage.getItem("sb-xxxxx-auth-token"));
// Debe mostrar null (no loggeado todavía)
```

### 5.3 Probar login

1. Ir a `/auth`
2. Ingresar credenciales de test user
3. Verificar que login funciona

### 5.4 Monitorear logs

En Vercel → **Logs** → **Function Logs** y **Runtime Logs**

Debe estar limpio de errores.

---

## 📝 Checklist Deployment

- [ ] Repo limpio (git status clean)
- [ ] Proyecto Vercel creado: `winfast-staging`
- [ ] Variables públicas agregadas (VITE*SUPABASE*\*)
- [ ] Variables privadas agregadas (SUPABASE_SERVICE_ROLE_KEY)
- [ ] Deploy completado exitosamente
- [ ] Homepage carga en staging URL
- [ ] No hay errores en función logs
- [ ] Login funciona con test credentials
- [ ] Supabase staging conectado correctamente

---

## 🔗 URLs Importantes

```
Dashboard: https://vercel.com/dashboard
Project: https://vercel.com/gemaverdugam06-sys/winfast-staging
Settings: https://vercel.com/gemaverdugam06-sys/winfast-staging/settings

Staging App: https://winfast-staging-xxx.vercel.app
Staging Auth: https://winfast-staging-xxx.vercel.app/auth
Staging Admin: https://winfast-staging-xxx.vercel.app/admin
```

---

## ⚠️ Troubleshooting

### Build failed: "Cannot find module"

**Causa**: Dependencies no instaladas
**Fix**:

```bash
npm install
npm run build
git push
```

### Build failed: "TypeScript error"

**Causa**: Errores de compilación
**Fix**:

```bash
npm run build
# Ver error
npm run lint
# Arreglar
git add .
git commit -m "Fix build errors"
git push
```

### Environment variables not working

**Causa**: Variables no guardadas o nombre incorrecto
**Fix**:

1. Ir a Vercel Settings > Environment Variables
2. Verificar que están ahí y nombradas correctamente
3. Re-deploy: En Deployments, click en último deploy > "Redeploy"

### Login fails with "Connection refused"

**Causa**: Supabase staging credentials incorrectas
**Fix**:

1. Verificar que VITE_SUPABASE_URL es correcto
2. Verificar que anon key es válida
3. Ir a Supabase dashboard > Copy URLs > Verify

### Blank page or 404

**Causa**: Output directory incorrecto
**Fix**:

1. Ir a Vercel Settings > Build & Development Settings
2. Verificar que "Output Directory" es `dist/client`
3. Re-deploy

---

## Próximos Pasos

1. ✅ Deploy exitoso
2. → Configurar E2E tests con staging URL
3. → Ejecutar E2E tests
4. → Validar flujos críticos
5. → Documentar resultados
6. → Decidir GO/NO-GO a producción

---

**Status**: 🟢 Ready para deploy
**Última actualización**: 2026-09-01
