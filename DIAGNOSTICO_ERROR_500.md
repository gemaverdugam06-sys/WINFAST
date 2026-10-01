# 🔧 CHECKLIST DE DIAGNÓSTICO - Error 500 en Supabase

> **Problema**: Error 500 al crear usuario en Vercel  
> **Causa probable**: Credenciales de Supabase no configuradas correctamente

---

## ✅ PASO 1: Verificar que Supabase Staging Existe

### 1.1 ¿Creaste Supabase proyecto?

**En https://supabase.com/dashboard:**

- [ ] ¿Ves proyecto `winfast-staging`?
- [ ] ¿El proyecto está activo (verde)?

**Si NO está creado:**

```
1. Ir a https://supabase.com/dashboard
2. Click "New Project"
3. Name: winfast-staging
4. Database Password: guardar en lugar seguro
5. Region: más cercana
6. Click "Create"
7. Esperar 5-10 minutos
```

**Si SÍ existe:**

- [ ] Copiar Project URL: `https://xxxxx.supabase.co`
- [ ] Ir a Settings > API
- [ ] Copiar **anon public key** (comienza con `eyJ...`)
- [ ] Copiar **service_role key** (más secreto)

---

## ✅ PASO 2: Verificar que Migraciones se Ejecutaron

### 2.1 ¿Ejecutaste las 7 migraciones?

**En Supabase > SQL Editor:**

- [ ] ¿Ves las tablas en la izquierda?
  - [ ] profiles
  - [ ] productos
  - [ ] categorias
  - [ ] transacciones
  - [ ] chats
  - [ ] mensajes
  - [ ] user_roles

**Si NO ves las tablas:**

```
1. Ir a Supabase > SQL Editor
2. Click "New Query"
3. Copiar CADA migración de: supabase/migrations/
4. Ejecutar en ORDEN:
   - 20260606030635_dbd62f11-feaf-4afc-b1e1-d1bea6b4cf7b.sql
   - 20260606030648_123d4fc6-1a1f-41b1-bc44-55f139800e10.sql
   - ... (7 archivos totales)
5. Presionar Ctrl+Enter para ejecutar
6. Ver mensaje: "Success"
```

**Si SÍ ves las tablas:**

- [ ] Verificar que `profiles` tiene columnas: `id`, `email`, `is_blocked`, `motivo_bloqueo`

---

## ✅ PASO 3: Verificar Variables de Entorno en Vercel

### 3.1 ¿Agregaste variables en Vercel?

**En Vercel Dashboard:**

1. Ir a: https://vercel.com/gemaverdugam06-sys/winfast-staging
2. Click en **Settings** → **Environment Variables**
3. Verificar que TODAS estas variables existen:

```
[ ] VITE_SUPABASE_URL               (tu URL de Supabase)
[ ] VITE_SUPABASE_PUBLISHABLE_KEY   (anon key)
[ ] VITE_SUPABASE_ANON_KEY          (anon key - IGUAL a anterior)
[ ] SUPABASE_URL                    (tu URL de Supabase)
[ ] SUPABASE_SERVICE_ROLE_KEY       (service role key)
```

**Si faltan variables:**

1. Click "Add New"
2. Variable Name: `VITE_SUPABASE_URL`
3. Value: `https://xxxxx.supabase.co`
4. Environments: **Production** + **Preview**
5. Click "Save"
6. Repetir para cada variable

**IMPORTANTE**:

- VITE\_\* deben estar en **Production** y **Preview**
- SUPABASE_SERVICE_ROLE_KEY debe estar SOLO en **Production**

### 3.2 ¿Re-deployaste después de agregar variables?

- [ ] Ir a **Deployments**
- [ ] Buscar el último deploy
- [ ] Click en el botón **"..."**
- [ ] Click **"Redeploy"**
- [ ] Esperar a que termine (~5-10 minutos)
- [ ] Estado debe ser ✅ **Ready**

---

## ✅ PASO 4: Verificar que Vercel tiene las Variables

### 4.1 Verificar variables en Vercel

**En navegador, en tu staging URL:**

```
https://winfast-staging-xxxxx.vercel.app
```

1. Abre **F12** (Developer Console)
2. Click en **Console** (pestaña)
3. Escribe:

```javascript
console.log(window.__VITE_SUPABASE_URL__);
```

**Si muestra `undefined`:**

- Variables NO están en Vercel
- Volver a Paso 3 y verificar que se agregaron correctamente

**Si muestra una URL:**

- Variables SÍ llegaron a Vercel
- Proceder a Paso 5

---

## ✅ PASO 5: Verificar que RLS está Habilitado

### 5.1 En Supabase Dashboard

1. Ir a **Database** → **Tables**
2. Para CADA tabla, verificar:
   ```
   🔒 Row Level Security is on
   ```

**Si no dice "on":**

1. Click en tabla
2. Click en el tab **RLS**
3. Click en el botón **Enable RLS**
4. Click **Confirm**

**Tablas que DEBEN tener RLS:**

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

## ✅ PASO 6: Crear Usuarios de Test en Supabase

### 6.1 ¿Creaste los 4 usuarios de test?

**En Supabase > Authentication > Users:**

- [ ] admin-test@staging.local
- [ ] user-test@staging.local
- [ ] user2-test@staging.local
- [ ] blocked-test@staging.local

**Si NO existen:**

1. Ir a https://supabase.com/dashboard
2. Proyecto: `winfast-staging`
3. Click en **Authentication** (izquierda)
4. Click en **Users** (izquierda)
5. Click **"Add user"**
6. Email: `admin-test@staging.local`
7. Password: `Admin@Staging2026!`
8. Click **"Add user"**
9. Repetir para los otros 3 usuarios

**Si SÍ existen:**

- [ ] Proceder a siguiente paso

---

## ✅ PASO 7: Probar Connection a Supabase Localmente

### 7.1 Crear .env.local

**En tu carpeta de proyecto:**

```
c:\Users\Gema\Documents\WinFast\.env.local
```

**Contenido:**

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJ...
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

Reemplazar `xxxxx` con tus valores reales de Supabase.

### 7.2 Probar localmente

```bash
cd c:\Users\Gema\Documents\WinFast
npm run dev
```

**En navegador:**

- Abre http://localhost:5173
- Ir a `/auth`
- Intenta login con:
  ```
  Email: user-test@staging.local
  Password: User@Staging2026!
  ```

**Si funciona en local:**

- Variables Supabase están correctas
- El problema es que Vercel no las tiene

**Si NO funciona en local:**

- Variables .env.local están mal
- Revisar que copiaste correctamente desde Supabase

---

## 🔍 DIAGNÓSTICO FINAL

**Completa esta tabla:**

| Verificación              | Resultado | Acción                         |
| ------------------------- | --------- | ------------------------------ |
| Supabase staging existe   | ✅ / ❌   | Si ❌ → Crear proyecto         |
| Migraciones ejecutadas    | ✅ / ❌   | Si ❌ → Ejecutar 7 migraciones |
| Tablas visibles           | ✅ / ❌   | Si ❌ → Migraciones fallaron   |
| RLS habilitado (9 tablas) | ✅ / ❌   | Si ❌ → Habilitar en Supabase  |
| Usuarios de test creados  | ✅ / ❌   | Si ❌ → Crear usuarios         |
| Variables en Vercel       | ✅ / ❌   | Si ❌ → Agregar en Settings    |
| Vercel re-deployado       | ✅ / ❌   | Si ❌ → Hacer redeploy         |
| .env.local configurado    | ✅ / ❌   | Si ❌ → Crear archivo          |
| Login funciona localmente | ✅ / ❌   | Si ❌ → Verificar credenciales |

---

## 📞 Si Todo falla

**Reinicio completo (5 minutos):**

1. **Eliminar y recrear Supabase:**

   ```
   En Supabase Dashboard > Project Settings > Danger Zone
   Click "Delete project"
   Crear nuevo: winfast-staging
   Ejecutar TODAS las migraciones de nuevo
   ```

2. **Recrear Vercel deployment:**

   ```
   En Vercel > Settings > Danger Zone
   Click "Delete Project"
   Crear nuevo: winfast-staging
   Import WINFAST repo de GitHub
   Agregar variables de entorno
   Deploy
   ```

3. **Verificar Git está limpio:**

   ```bash
   cd c:\Users\Gema\Documents\WinFast
   git status
   # Debe mostrar: working tree clean
   ```

4. **Crear .env.local local:**
   ```
   Archivo: c:\Users\Gema\Documents\WinFast\.env.local
   Contenido: Variables de Supabase
   ```

---

## ✅ Orden Correcto de Pasos

```
1. Crear Supabase staging
   ↓
2. Ejecutar 7 migraciones
   ↓
3. Crear 4 usuarios de test
   ↓
4. Habilitar RLS en 9 tablas
   ↓
5. Copiar credenciales
   ↓
6. Crear .env.local (local)
   ↓
7. Crear variables en Vercel
   ↓
8. Re-deploy en Vercel
   ↓
9. Probar login en Vercel URL
```

---

**Próxima acción**: Responde cuál de estos pasos ya completaste, y cuál falta.

Así sabremos exactamente dónde está el problema.
