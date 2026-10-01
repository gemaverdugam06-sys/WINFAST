# 📋 TEMPLATE VERCEL - COPIA Y PEGA

> **Instrucciones**: Reemplaza `CAMBIAR_AQUI` con tus valores reales de Supabase  
> Solo la información entre [ ]

---

## 🔑 VALORES A OBTENER DE SUPABASE

### Abre Supabase Dashboard:

https://supabase.com/dashboard → Tu proyecto → Settings → API

Copia EXACTAMENTE estos valores:

```
Project URL:          https://XXXXXXXXX.supabase.co
Anon public key:      eyJhbGc...xxxxxxx
Service role secret:  eyJhbGc...yyyyyyy
```

---

## ✅ VARIABLES PARA VERCEL

**Ir a**: https://vercel.com/dashboard → winfast-staging → Settings → Environment Variables

**Agregar EXACTAMENTE estas 5 variables** (reemplaza CAMBIAR_AQUI con tus valores):

---

### VARIABLE 1

```
Name:           VITE_SUPABASE_URL
Value:          https://XXXXXXXXX.supabase.co
Environments:   ✓ Production  ✓ Preview
```

---

### VARIABLE 2

```
Name:           VITE_SUPABASE_PUBLISHABLE_KEY
Value:          eyJhbGc...xxxxxxx
Environments:   ✓ Production  ✓ Preview
```

---

### VARIABLE 3

```
Name:           VITE_SUPABASE_ANON_KEY
Value:          eyJhbGc...xxxxxxx
Environments:   ✓ Production  ✓ Preview
```

_(NOTA: VITE_SUPABASE_ANON_KEY es IGUAL a VITE_SUPABASE_PUBLISHABLE_KEY - mismo valor)_

---

### VARIABLE 4

```
Name:           SUPABASE_URL
Value:          https://XXXXXXXXX.supabase.co
Environments:   ✓ Production (SOLO Production, NO Preview)
```

_(NOTA: SUPABASE_URL es IGUAL a VITE_SUPABASE_URL)_

---

### VARIABLE 5

```
Name:           SUPABASE_SERVICE_ROLE_KEY
Value:          eyJhbGc...yyyyyyy
Environments:   ✓ Production (SOLO Production, NO Preview)
```

---

## 📝 EJEMPLO COMPLETO (Con Valores Ficticios)

```
VARIABLE 1:
Name:       VITE_SUPABASE_URL
Value:      https://abcdefgh123.supabase.co
Envs:       Production + Preview

VARIABLE 2:
Name:       VITE_SUPABASE_PUBLISHABLE_KEY
Value:      eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoMTIzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Njc0NTU5NDUsImV4cCI6MTk5MzAzMTk0NX0.xxxxx
Envs:       Production + Preview

VARIABLE 3:
Name:       VITE_SUPABASE_ANON_KEY
Value:      eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoMTIzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Njc0NTU5NDUsImV4cCI6MTk5MzAzMTk0NX0.xxxxx
Envs:       Production + Preview

VARIABLE 4:
Name:       SUPABASE_URL
Value:      https://abcdefgh123.supabase.co
Envs:       Production ONLY (NO Preview)

VARIABLE 5:
Name:       SUPABASE_SERVICE_ROLE_KEY
Value:      eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoMTIzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY2NzQ1NTk0NSwiZXhwIjoxOTkzMDMxOTQ1fQ.yyyyy
Envs:       Production ONLY (NO Preview)
```

---

## ⚠️ IMPORTANTE - DIFERENCIAS

| Variable                      | Valor                           | Dónde            | Ambientes            |
| ----------------------------- | ------------------------------- | ---------------- | -------------------- |
| VITE_SUPABASE_URL             | Project URL de Supabase         | Public (browser) | Production + Preview |
| VITE_SUPABASE_ANON_KEY        | Anon Key de Supabase            | Public (browser) | Production + Preview |
| VITE_SUPABASE_PUBLISHABLE_KEY | Anon Key de Supabase (IGUAL)    | Public (browser) | Production + Preview |
| SUPABASE_URL                  | Project URL de Supabase (IGUAL) | Private (server) | Production ONLY      |
| SUPABASE_SERVICE_ROLE_KEY     | Service Role Key de Supabase    | Private (server) | Production ONLY      |

---

## 🚀 DESPUÉS DE AGREGAR TODAS LAS VARIABLES

1. **Verifica que todas las 5 existen** en Vercel Settings > Environment Variables
2. **Haz Redeploy**:
   - Click en **Deployments**
   - Click en el último deployment
   - Click en **"..."** (tres puntos)
   - Click en **"Redeploy"**
   - Espera a que diga ✅ **Ready**

3. **Prueba login**:
   - Abre tu URL staging: https://winfast-staging-xxxxx.vercel.app
   - Ir a `/auth`
   - Login con: user-test@staging.local / User@Staging2026!

---

## 📋 CHECKLIST FINAL

```
[ ] Abierto https://supabase.com/dashboard
[ ] Copiado Project URL
[ ] Copiado Anon Key
[ ] Copiado Service Role Key
[ ] Abierto https://vercel.com/dashboard
[ ] En winfast-staging > Settings > Environment Variables
[ ] Agregada VITE_SUPABASE_URL (Production + Preview)
[ ] Agregada VITE_SUPABASE_PUBLISHABLE_KEY (Production + Preview)
[ ] Agregada VITE_SUPABASE_ANON_KEY (Production + Preview)
[ ] Agregada SUPABASE_URL (Production ONLY)
[ ] Agregada SUPABASE_SERVICE_ROLE_KEY (Production ONLY)
[ ] Hecho Redeploy
[ ] Esperado a que termine (✅ Ready)
[ ] Probado login en staging URL
```

---

**Listo. Copia este template y reemplaza con tus valores reales de Supabase.**
