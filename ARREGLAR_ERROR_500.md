# 🔧 ARREGLAR ERROR 500 - Variables en Vercel

> **Situación**: Tienes variables en Vercel pero error 500 en signup  
> **Causa**: Las variables NO están correctas O Vercel no se re-deployó después

---

## ✅ PASO 1: Verificar Variables en Vercel

### 1.1 Abre Vercel Dashboard

1. Ir a: https://vercel.com/dashboard
2. Buscar proyecto: **winfast-staging**
3. Click en el proyecto
4. Click en **Settings** (arriba a la derecha)
5. En el menú izquierdo: Click en **Environment Variables**

### 1.2 Verifica que EXISTEN estas variables exactamente:

```
Nombre de Variable                 Valor debe empezar con
────────────────────────────────────────────────────────────
VITE_SUPABASE_URL                  https://
VITE_SUPABASE_PUBLISHABLE_KEY      eyJ
VITE_SUPABASE_ANON_KEY             eyJ
SUPABASE_URL                       https://
SUPABASE_SERVICE_ROLE_KEY          eyJ
```

**IMPORTANTE**: Verifica que:

- ✅ El nombre de variable es EXACTO (no hay espacios, mayúsculas correctas)
- ✅ El valor NO está vacío
- ✅ El valor comienza con lo correcto (https:// o eyJ)

### 1.3 Si falta alguna variable

1. Click en **"Add New..."**
2. En **"Name"**: escribe exacto `VITE_SUPABASE_URL`
3. En **"Value"**: pega tu URL de Supabase
4. En **"Environments"**: selecciona **Production** y **Preview**
5. Click **"Save"**

---

## ✅ PASO 2: Obtener Credenciales de Supabase

### 2.1 Abre Supabase Dashboard

1. Ir a: https://supabase.com/dashboard
2. Click en tu proyecto: **winfast-staging**
3. En la izquierda, click en **Settings**
4. Luego click en **API**

### 2.2 Copia EXACTAMENTE estos valores:

**En Supabase > Settings > API, verás:**

```
Project URL:  https://xxxxx.supabase.co  ← Copiar COMPLETO
Anon public key:  eyJ... ← Copiar COMPLETO
Service role key:  eyJ... ← Copiar COMPLETO (SECRETO)
```

**Pegalo en Vercel:**

- VITE_SUPABASE_URL = `https://xxxxx.supabase.co`
- VITE_SUPABASE_ANON_KEY = `eyJ...` (el anon key)
- VITE_SUPABASE_PUBLISHABLE_KEY = `eyJ...` (el anon key, MISMO que anterior)
- SUPABASE_URL = `https://xxxxx.supabase.co` (MISMO que VITE_SUPABASE_URL)
- SUPABASE_SERVICE_ROLE_KEY = `eyJ...` (el service role key)

---

## ✅ PASO 3: RE-DEPLOY en Vercel (CRÍTICO)

### 3.1 Las variables SOLO aplican después de un nuevo deploy

1. En Vercel Dashboard (winfast-staging)
2. Click en **Deployments** (arriba)
3. Busca el último deployment (probablemente dice "Ready")
4. Click en el **botón "..."** al lado derecho
5. Click en **"Redeploy"**
6. Espera a que termine (~5-10 minutos)
7. Debe cambiar a ✅ **"Ready"**

**Verifica que terminó:**

- Estado: ✅ Ready
- Tiempo: ~3-10 minutos

---

## ✅ PASO 4: Verifica que Supabase Existe y Tiene Usuarios

### 4.1 En Supabase Dashboard

1. Ir a https://supabase.com/dashboard
2. ¿Ves tu proyecto `winfast-staging`?
   - [ ] Si es ROJO = No existe o está deshabilitado
   - [ ] Si es VERDE = Existe y está activo

**Si está ROJO:**

```
Necesitas crear Supabase proyecto
1. Click "New Project"
2. Name: winfast-staging
3. Password: guardar
4. Region: elige la más cercana
5. Click "Create"
6. Esperar 5-10 minutos
```

### 4.2 Verifica que tiene USUARIOS

1. En Supabase > Authentication > Users
2. ¿Ves estos usuarios?
   - [ ] admin-test@staging.local
   - [ ] user-test@staging.local
   - [ ] user2-test@staging.local
   - [ ] blocked-test@staging.local

**Si NO ve usuarios:**

```
1. Click "Add user" en Supabase
2. Email: user-test@staging.local
3. Password: User@Staging2026!
4. Click "Add user"
5. Repetir para otros 3
```

---

## ✅ PASO 5: Probar el Login en Vercel

### 5.1 En tu Vercel staging URL

1. Abre: https://winfast-staging-xxxxx.vercel.app (reemplaza xxxxx con tu URL real)
2. Ir a `/auth`
3. Intenta login con:
   ```
   Email: user-test@staging.local
   Password: User@Staging2026!
   ```
4. Click "Iniciar sesión"

### 5.2 Qué esperar

**Si FUNCIONA:**

- ✅ Te redirige a home
- ✅ Ves tu email en esquina superior derecha
- ✅ Puedes navegar la app

**Si FALLA con error:**

- Ve a F12 (Developer Console)
- Tab: **Console**
- Busca mensaje rojo de error
- Copia el error exacto

---

## 🔍 Checklist Rápido (Hazlo YA)

```
[ ] 1. Abierto Vercel Settings > Environment Variables
[ ] 2. Verificado que existen las 5 variables
[ ] 3. Copiado Project URL de Supabase
[ ] 4. Copiado Anon Key de Supabase
[ ] 5. Copiado Service Role Key de Supabase
[ ] 6. Pegadas en Vercel (TODAS 5)
[ ] 7. Hecho Redeploy en Vercel
[ ] 8. Esperado a que Redeploy termine (✅ Ready)
[ ] 9. Verificado que Supabase existe (status VERDE)
[ ] 10. Verificado que usuarios existen en Supabase
[ ] 11. Abierto Vercel staging URL
[ ] 12. Intentado login con user-test@staging.local
```

---

## ⚡ Comando Rápido si Quieres

Si necesitas verificar que las variables llegaron a Vercel, en la URL staging:

1. Abre: https://winfast-staging-xxxxx.vercel.app
2. F12 (abrir Developer Console)
3. Tab: **Console**
4. Pega esto:

```javascript
console.log("VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
```

5. Presiona Enter

**Debe mostrar:**

```
VITE_SUPABASE_URL: https://xxxxx.supabase.co
```

**Si muestra `undefined`:**

- Las variables NO llegaron
- Volver a agregar en Vercel Settings
- Re-deploy de nuevo

---

## 🆘 Si Aún Falla

**Copia EXACTAMENTE esto que ves en Supabase:**

```
Proyecto Supabase:           winfast-staging ← ¿SÍ o NO?
Project URL:                 https://_______.supabase.co
Anon Key:                    eyJ___...
Service Role Key:            eyJ___...
```

Y dime los valores, vamos a revisar que estén en Vercel correctamente.

---

**Próxima acción: Ejecuta el Checklist arriba y reporta en qué paso te atasca.**
