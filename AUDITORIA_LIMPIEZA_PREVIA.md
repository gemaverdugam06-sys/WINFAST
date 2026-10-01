# Auditoria previa de limpieza WinFast

Fecha: 2026-09-02
Alcance: inspeccion estatica local. No se borraron archivos, no se ejecuto SQL destructivo y no se modifico Storage.

## Estado de partida

El working tree ya contenia cambios antes de esta auditoria. Se preservan sin atribuirlos a esta limpieza:

- Modificaciones en `package.json`, `package-lock.json`, `src/components/admin/AdminPanel.tsx`, `src/routes/index.tsx`, `src/routes/categoria.$id.tsx` y `src/routes/producto.$id.tsx`.
- Eliminaciones en `src/components/ui/alert-dialog.tsx`, `aspect-ratio.tsx`, `breadcrumb.tsx`, `collapsible.tsx`, `context-menu.tsx`, `hover-card.tsx`, `navigation-menu.tsx`, `radio-group.tsx`, `resizable.tsx`, `scroll-area.tsx`, `toggle-group.tsx` y `src/lib/config.server.ts`.
- Migracion nueva sin seguimiento previo: `supabase/migrations/20260902090000_product_moderation_visibility.sql`.

Estas eliminaciones tienen cero referencias textuales directas en `src`, pero no se consideran eliminaciones realizadas por esta auditoria. Deben revisarse en un cambio separado, incluyendo historial Git y una compilacion limpia.

## Inventario

- Raiz: configuraciones de Vite, TypeScript, Tailwind, ESLint, Prettier, Playwright, Vercel, Bun y variables de entorno; `package.json`/`package-lock.json`; documentacion de staging, Vercel, testing y errores.
- Aplicacion: `src/router.tsx`, `src/routeTree.gen.ts`, `src/server.ts`, `src/start.ts`, `src/styles.css`.
- Rutas: 18 archivos de ruta, incluyendo raiz, autentificacion, marketplace, publicaciones, perfil, chats, administracion, promociones, resenas y paginas legales. `routeTree.gen.ts` importa las rutas.
- Componentes: 6 componentes de dominio (`CategoryNav`, `Footer`, `Header`, `Logo`, `ProductCard`, `ReportDialog`), `OtpInput`, `AdminPanel` y 30 componentes UI presentes despues de las eliminaciones previas.
- Hooks: `use-mobile.tsx` y `use-unread.ts`.
- Utilidades/lib: autenticacion, autorizacion, i18n, Ecuador, promociones, rate limit, reporting, errores, seguridad de contenido, Storage, WhatsApp y utilidades generales.
- Supabase: clientes browser/server, middleware/attacher de auth, tipos generados y 14 migraciones. No se borran tablas, RLS, auth, Storage ni migraciones.
- Assets: `public/favicon.svg` y `public/favicon.ico`; no hay imagenes adicionales versionadas.
- Tests/scripts: `e2e/helpers/auth.ts`, `e2e/tests/comprehensive.spec.ts`, configuracion Playwright y scripts npm de desarrollo, build, lint, formato y E2E.

## Referencias y rutas

- El grafo de TanStack Router se encuentra en `src/routeTree.gen.ts`; las rutas de negocio estan importadas y registradas.
- `src/router.tsx` consume `routeTree`; `src/server.ts` usa carga dinamica del entry de TanStack Start y `api/index.js` carga dinamicamente `dist/server/server.js`. No se puede declarar muerto ningun entry sin romper despliegue.
- Se detectaron referencias a Supabase Auth, Realtime, Storage y `import.meta.env`; se conservan clientes, middleware, Storage y configuracion.
- Las migraciones contienen politicas sobre `storage.objects`, realtime, RLS, `has_role`, `user_roles` y funciones/triggers de negocio. No se hizo limpieza SQL automatica.

## Duplicados

No se encontraron carpetas o archivos paralelos llamados `products`, `productos`, `category`, `categories` o `categorias`. `categorias` aparece como relacion de datos Supabase, no como modulo duplicado. Los nombres de producto/productos pertenecen al dominio y requieren una auditoria semantica adicional antes de fusionarlos.

## Candidatos

### No autorizados para borrar ahora

- Archivos UI eliminados previamente: referencias directas cero, pero el cambio es preexistente y no se verifico aqui su historial, generacion ni estado del indice.
- `src/lib/config.server.ts`: referencia textual cero en `src`, pero es una utilidad server-side potencialmente consumida por configuracion o despliegue; requiere revisar historial y build de produccion.
- Documentacion de staging/Vercel: posible redundancia de contenido, pero no es codigo muerto y puede ser necesaria para operacion.
- `favicon.svg`/`favicon.ico`: ambos pueden ser consumidos por navegador, manifest o plataforma; no se elimina ninguno sin inspeccionar HTML generado y despliegue.
- Dependencias sin import directo: la prueba textual no basta para plugins, CLI, peer dependencies, Tailwind, Vite, Playwright o carga dinamica. No se elimina ninguna en esta fase.

### Resultado de referencias

No hay un archivo nuevo que cumpla simultaneamente cero referencias, cero carga dinamica, cero uso de configuracion, cero uso de Vite/Supabase/Storage/entorno y riesgo funcional aceptable. Por la regla de oro, la lista de archivos eliminados por esta limpieza es vacia.

## Validacion actual

- `npm run lint`: falla con 500 errores y 16 avisos. La mayor parte son reglas Prettier por finales CRLF y hay errores existentes de `any`, bloques vacios y dependencias de hooks; no se uso autofix para evitar reformatear cambios ajenos.
- `npm run build`: se inicio durante la auditoria, pero el resultado completo no quedo disponible en la salida capturada. Debe repetirse despues de resolver o aislar los cambios preexistentes.
- Login, registro, marketplace, publicacion, admin, chats, RLS, `has_role` y `user_roles`: no pueden confirmarse estaticamente como funcionales; requieren Supabase staging y pruebas E2E/manuales.
- Storage y variables de Vercel: no se consultaron servicios remotos ni se borraron secretos. El listado de objetos y variables debe hacerse en el proyecto remoto correspondiente.

## Reporte previo y siguiente decision

No se ejecuta ninguna eliminacion automatica. La recomendacion conservadora es cerrar primero el cambio local preexistente, repetir `npm install`, `npm run build`, `npm run lint` y E2E, y solo despues revisar individualmente los 12 archivos ya eliminados y las dependencias que fueron retiradas. La limpieza adicional queda en cero archivos eliminados, cero archivos fusionados y cero dependencias eliminadas por esta auditoria.
