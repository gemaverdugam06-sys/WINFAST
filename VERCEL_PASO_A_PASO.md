# 🔧 PASO A PASO - AGREGAR VARIABLES EN VERCEL

## PASO 1: Abre Vercel Dashboard

```
https://vercel.com/dashboard
```

---

## PASO 2: Abre tu proyecto winfast-staging

- Busca "winfast-staging" en la lista
- Click en él

---

## PASO 3: Abre Settings

- Arriba a la derecha ves: Home | Settings | Deployments
- Click en **Settings**

---

## PASO 4: Environment Variables

- En el menú izquierdo ves varias opciones
- Busca **Environment Variables**
- Click en él

---

## PASO 5: Add New Variable - PRIMERA VEZ

Click en el botón **"Add New"** (o "+ Add New")

### Aparece un formulario con 3 campos:

**Campo 1 - Name:**
Pega esto:

```
VITE_SUPABASE_URL
```

**Campo 2 - Value:**
Pega esto (REEMPLAZA xxxxx con tu URL de Supabase):

```
https://xxxxx.supabase.co
```

**Campo 3 - Environments:**

- Marca la casilla: ✓ Production
- Marca la casilla: ✓ Preview

Click en el botón **"Save"** (negro, abajo a la derecha)

---

## PASO 6: Add New Variable - SEGUNDA VEZ

Click nuevamente en **"Add New"**

**Campo 1 - Name:**

```
VITE_SUPABASE_PUBLISHABLE_KEY
```

**Campo 2 - Value:**
Pega tu Anon Key de Supabase (el que comienza con eyJ...):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx.xxxxx
```

**Campo 3 - Environments:**

- Marca: ✓ Production
- Marca: ✓ Preview

Click **"Save"**

---

## PASO 7: Add New Variable - TERCERA VEZ

Click en **"Add New"**

**Campo 1 - Name:**

```
VITE_SUPABASE_ANON_KEY
```

**Campo 2 - Value:**
MISMO que paso anterior (Anon Key):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx.xxxxx
```

**Campo 3 - Environments:**

- Marca: ✓ Production
- Marca: ✓ Preview

Click **"Save"**

---

## PASO 8: Add New Variable - CUARTA VEZ

Click en **"Add New"**

**Campo 1 - Name:**

```
SUPABASE_URL
```

**Campo 2 - Value:**
MISMO URL que VITE_SUPABASE_URL:

```
https://xxxxx.supabase.co
```

**Campo 3 - Environments:**

- Marca: ✓ Production
- NO marques Preview (solo Production)

Click **"Save"**

---

## PASO 9: Add New Variable - QUINTA VEZ

Click en **"Add New"**

**Campo 1 - Name:**

```
SUPABASE_SERVICE_ROLE_KEY
```

**Campo 2 - Value:**
Tu Service Role Key de Supabase (diferente del Anon Key):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.yyyyy.yyyyy
```

**Campo 3 - Environments:**

- Marca: ✓ Production
- NO marques Preview (solo Production)

Click **"Save"**

---

## PASO 10: Verifica que las 5 existen

Después de agregar las 5, debes ver una lista con:

```
✓ VITE_SUPABASE_URL
✓ VITE_SUPABASE_PUBLISHABLE_KEY
✓ VITE_SUPABASE_ANON_KEY
✓ SUPABASE_URL
✓ SUPABASE_SERVICE_ROLE_KEY
```

---

## PASO 11: Redeploy

1. Click en **Deployments** (arriba)
2. Busca el último deployment (probablemente el primero de la lista)
3. Click en los **tres puntos (...)** al lado derecho del deployment
4. Click en **"Redeploy"**
5. Espera a que diga ✅ **Ready** (tarda 5-10 minutos)

---

## ¿DÓNDE SACAR LOS VALORES?

Abre Supabase: https://supabase.com/dashboard

- Tu proyecto > Settings > API

Ahí verás:

- **Project URL:** → copiar a xxxxx.supabase.co
- **Anon public key:** → copiar a eyJ...xxxxx
- **Service role secret:** → copiar a eyJ...yyyyy

---

**Si algo no se guarda:**

- Verifica que no hay mensajes de error rojo
- Intenta refrescar la página (F5)
- Vuelve a intentar agregar la variable
