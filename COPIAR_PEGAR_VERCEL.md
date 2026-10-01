# 📋 COPIA Y PEGA DIRECTO EN VERCEL

**En Vercel → winfast-staging → Settings → Environment Variables**

Click en "Add New" y copia esto (una variable por vez):

---

## VARIABLE 1 - Copiar y pegar:

```
Nombre: VITE_SUPABASE_URL
Valor: https://XXXXXXXXX.supabase.co
Seleccionar: Production ✓  Preview ✓
Click: Save
```

---

## VARIABLE 2 - Copiar y pegar:

```
Nombre: VITE_SUPABASE_PUBLISHABLE_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.CAMBIAR_AQUI.CAMBIAR_AQUI
Seleccionar: Production ✓  Preview ✓
Click: Save
```

---

## VARIABLE 3 - Copiar y pegar:

```
Nombre: VITE_SUPABASE_ANON_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.CAMBIAR_AQUI.CAMBIAR_AQUI
Seleccionar: Production ✓  Preview ✓
Click: Save
```

_(NOTA: Es el MISMO valor que VARIABLE 2)_

---

## VARIABLE 4 - Copiar y pegar:

```
Nombre: SUPABASE_URL
Valor: https://XXXXXXXXX.supabase.co
Seleccionar: Production ✓  SOLO Production (NO Preview)
Click: Save
```

_(NOTA: Es el MISMO URL que VARIABLE 1)_

---

## VARIABLE 5 - Copiar y pegar:

```
Nombre: SUPABASE_SERVICE_ROLE_KEY
Valor: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.CAMBIAR_AQUI.CAMBIAR_AQUI
Seleccionar: Production ✓  SOLO Production (NO Preview)
Click: Save
```

---

## ¿DÓNDE ENCONTRAR TUS VALORES?

Abre: https://supabase.com/dashboard

1. Entra a tu proyecto
2. Abajo a la izquierda: Click en **Settings** (⚙️)
3. Click en **API**

Ahí verás:

```
📌 Project URL:           https://XXXXXXXXX.supabase.co
   Copiar este valor a → VARIABLE 1 y VARIABLE 4

📌 Anon public key:       eyJhbGc... (es un texto largo)
   Copiar este valor a → VARIABLE 2 y VARIABLE 3

📌 Service role secret:   eyJhbGc... (es otro texto largo, diferente)
   Copiar este valor a → VARIABLE 5
```

---

## RESUMEN RÁPIDO:

| Variable                      | Copiar De               | Pegar En |
| ----------------------------- | ----------------------- | -------- |
| VITE_SUPABASE_URL             | Project URL             | Vercel   |
| VITE_SUPABASE_PUBLISHABLE_KEY | Anon public key         | Vercel   |
| VITE_SUPABASE_ANON_KEY        | Anon public key (IGUAL) | Vercel   |
| SUPABASE_URL                  | Project URL (IGUAL)     | Vercel   |
| SUPABASE_SERVICE_ROLE_KEY     | Service role secret     | Vercel   |

---

## DESPUÉS DE AGREGAR LAS 5:

1. Ir a **Deployments**
2. Click en el último deployment
3. Click en **...** (tres puntos)
4. Click **Redeploy**
5. Esperar a que diga ✅ **Ready** (5-10 mins)
6. Probar login en tu URL staging

---

**Ya está. Solo reemplaza XXXXXXXXX y CAMBIAR_AQUI con tus valores de Supabase.**
