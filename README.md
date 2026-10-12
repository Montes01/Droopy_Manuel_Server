# Droopy Manuel — API

Backend de la fundación Droopy Manuel: manada, tienda solidaria, noticias,
pedidos, donaciones y panel de administración. Express 5 + TypeScript +
PostgreSQL con Drizzle ORM.

## Requisitos

- Node.js 20 o superior (se usa `--env-file`, nativo desde Node 20)
- pnpm
- Docker (para la base de datos)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env    # ajusta DATABASE_URL si hace falta
pnpm db:up              # levanta PostgreSQL en el puerto 2121
pnpm db:migrate         # crea las tablas
pnpm db:seed            # carga el contenido actual
pnpm dev                # compila y arranca en http://localhost:3100
```

Comprueba que está vivo (la respuesta incluye el estado de la base):

```bash
curl http://localhost:3100/api/health
# {"status":"ok","database":"ok","uptime":1}
```

### Primer usuario del panel

```bash
node --env-file=.env dist/scripts/create-admin.js \
  admin@droopymanuel.co "una-contraseña-larga" "Tu nombre" admin
```

La contraseña debe tener al menos 12 caracteres. El script es idempotente:
si el correo ya existe, actualiza la contraseña y el rol.

### Scripts

| Script | Qué hace |
| --- | --- |
| `pnpm dev` | Compila una vez y arranca el servidor |
| `pnpm dev:watch` | Recompila al guardar (deja el server aparte) |
| `pnpm build` | Compila TypeScript a `dist/` |
| `pnpm start` | Ejecuta `dist/index.js` |
| `pnpm typecheck` | Revisa tipos sin emitir |
| `pnpm db:up` / `db:down` | Levanta / apaga el contenedor de PostgreSQL |
| `pnpm db:generate` | Genera una migración a partir del esquema |
| `pnpm db:migrate` | Aplica las migraciones pendientes |
| `pnpm db:seed` | Carga el contenido (idempotente) |
| `pnpm db:reset` | Borra pedidos y vuelve a sembrar (para pruebas) |
| `pnpm db:studio` | Explorador visual de la base |
| `pnpm test` | Todo: build, reset y las 6 suites (220 comprobaciones) |
| `pnpm test:db` | Base de datos: stock, transacciones, auth (22) |
| `pnpm test:admin` | Panel: permisos, roles, auditoría (43) |
| `pnpm test:admin:content` | Panel: noticias y contenido del sitio (36) |
| `pnpm test:api` | API en proceso (44) |
| `pnpm test:integration` | Contrato front ↔ back (53) |
| `pnpm test:http` | HTTP contra un server ya corriendo (22) |
| `pnpm clean` | Borra `dist/` y `test-build/` |

`pnpm test:http` espera un servidor levantado (por defecto usa el puerto 3100):

```bash
pnpm dev &                      # o déjalo en otra terminal
node tests/e2e-http.mjs 3100
```

Si el puerto lo ocupa un proceso viejo, la prueba lo detecta y te dice qué
hacer en vez de fallar con 404 confusos.

> **Las pruebas crean pedidos reales**, así que descuentan stock. Por eso
> `pnpm test` ejecuta `db:reset` primero. Si corres una suite suelta dos veces
> seguidas y ves fallos de stock, es esto: ejecuta `pnpm db:reset`.

## Estructura

```
src/
  types.ts            Tipos de dominio (contrato con el frontend)
  db/
    index.ts          Conexión a PostgreSQL (Drizzle)
    schema/           Esquema: 17 tablas y 10 enums
    seed.ts           Carga el contenido desde src/data/*.ts
  repositories/       Lectura y escritura contra la base
    mappers.ts        Fila de base → tipo de dominio
    validation.ts     Reglas compartidas de validación
    dogs.ts  shop.ts  news.ts  site.ts  orders.ts        (lectura)
    dogs-write.ts  shop-write.ts  news-write.ts  site-write.ts  (escritura)
  auth/
    crypto.ts         bcrypt y tokens de sesión
    users.ts          Cuentas, sesiones, auditoría
    middleware.ts     requireAdmin
  routes/
    dogs.ts  shop.ts  news.ts  orders.ts  site.ts  auth.ts  helpers.ts
    admin/            Endpoints de escritura del panel
  scripts/
    create-admin.ts   Crea la primera cuenta del panel
  data/               Datos semilla (fuente del seed)
  app.ts              Monta la app (CORS, JSON, 404, errores)
  index.ts            Arranca el servidor
drizzle/              Migraciones SQL versionadas
tests/
  db.mjs              Stock, transacciones, concurrencia, auth
  admin.mjs           Permisos, roles, auditoría (manada y tienda)
  admin-content.mjs   Permisos de noticias y contenido del sitio
  smoke.mjs           Pruebas de la API
  integration.mjs     Pruebas front ↔ back
  e2e-http.mjs        HTTP contra un server real
  reset-db.mjs        Restaura el catálogo entre corridas
```

## Base de datos

PostgreSQL 17 en un contenedor propio (puerto **2121**, para no chocar con el
PostgreSQL nativo de Windows en 5432 ni con otros proyectos de la máquina).

```bash
pnpm db:up        # docker compose up -d
pnpm db:migrate   # aplica drizzle/*.sql
pnpm db:seed      # carga el contenido
```

Decisiones que conviene conocer:

- **Los pedidos guardan copia** del nombre y del precio de cada línea, y **no
  tienen clave foránea al producto**. Un pedido es un documento histórico: si
  mañana cambias el precio de una camiseta o la borras, el pedido no debe
  cambiar.
- **El stock se descuenta con una condición atómica** (`stock >= cantidad`),
  dentro de una transacción. Dos compras simultáneas de la última unidad no
  pueden pasar las dos; hay una prueba que lo verifica.
- **Las sesiones se guardan hasheadas** y viven en la base, así que cerrar
  sesión o revocar a alguien es inmediato (a diferencia de un JWT).
- **Los valores de los enums están en español**, igual que el contrato de la
  API. Renombrar uno exige una migración que reescriba los datos.
- **Todo el dinero son centavos enteros**: `4500000` es `$45.000`.

## Endpoints

Todos devuelven JSON. Los errores siguen el formato
`{ "error": "not_found", "message": "..." }`.

### Manada

| Método | Ruta | Devuelve |
| --- | --- | --- |
| GET | `/api/dogs` | Toda la manada |
| GET | `/api/dogs/featured` | Destacados |
| GET | `/api/dogs/pack?view=alive\|heaven` | Manada viva o en el cielo |
| GET | `/api/dogs/:slug` | Un perrito |

### Tienda

| Método | Ruta | Devuelve |
| --- | --- | --- |
| GET | `/api/shop/categories` | Categorías |
| GET | `/api/shop/categories/:slug` | Una categoría |
| GET | `/api/shop/items?category=<slug>` | Productos (opcionalmente por categoría) |
| GET | `/api/shop/items/featured` | Productos destacados |
| GET | `/api/shop/items/:slug` | Un producto |
| GET | `/api/shop/shipping` | Opciones de entrega con costos |

### Pedidos

| Método | Ruta | Devuelve |
| --- | --- | --- |
| POST | `/api/orders` | Crea el pedido (201) o 400 si es inválido |
| GET | `/api/orders` | Listado de pedidos (apoyo para desarrollo) |
| GET | `/api/orders/:orderNumber` | Pedido completo con estado |

El servidor **nunca** confía en los montos del cliente: recalcula precios,
envío y totales desde su catálogo, y valida que cada producto y variante
existan y tengan stock.

```bash
curl -X POST http://localhost:3100/api/orders \
  -H 'Content-Type: application/json' \
  -d '{
    "customer": {
      "nombres": "Ana", "apellidos": "Pérez", "pais": "Colombia",
      "direccion": "Calle 1 #2-3", "ciudad": "Bogotá",
      "telefono": "3001234567", "email": "ana@example.com"
    },
    "lines": [{ "slug": "camiseta-solidaria", "variantId": "m", "quantity": 2 }],
    "shipping": "domicilio"
  }'
```

### Noticias

| Método | Ruta | Devuelve |
| --- | --- | --- |
| GET | `/api/news` | Feed completo, más reciente primero |
| GET | `/api/news?offset=&limit=` | Página + `hasMore` (scroll infinito) |
| GET | `/api/news/categories` | Categorías con etiqueta visible |
| GET | `/api/news/:slug` | Una noticia |

### Sitio y donaciones

| Método | Ruta | Devuelve |
| --- | --- | --- |
| GET | `/api/site/content` | Texto "sobre nosotros" + estadísticas |
| GET | `/api/site/contact` | WhatsApp, correo y redes (fuente única del número) |
| GET | `/api/site/stats` | Solo las estadísticas |
| GET | `/api/site/donation-tiers` | Niveles de donación |
| GET | `/api/site/testimonials` | Testimonios |
| GET | `/api/site/donation-targets` | Perritos a los que donar |
| GET | `/api/site/bank-accounts` | Cuentas para transferir |

`GET /` devuelve el índice de rutas, útil para explorar a mano.

### Autenticación del panel

| Método | Ruta | Devuelve |
| --- | --- | --- |
| POST | `/api/auth/login` | Abre sesión (deja cookie `dm_session`) |
| POST | `/api/auth/logout` | Cierra la sesión actual |
| GET | `/api/auth/me` | Quién soy |
| GET | `/api/auth/sessions` | Mis sesiones activas |
| GET | `/api/auth/audit` | Últimos cambios (solo `admin`) |

### Administración (requiere sesión)

| Método | Ruta | Quién | Qué hace |
| --- | --- | --- | --- |
| POST | `/api/admin/dogs` | editor | Crea un perrito |
| PATCH | `/api/admin/dogs/:slug` | editor | Edita campos sueltos |
| PUT | `/api/admin/dogs/order` | editor | Reordena la manada |
| DELETE | `/api/admin/dogs/:slug` | **admin** | Borra un perrito |
| POST | `/api/admin/shop/categories` | editor | Crea una categoría |
| PATCH | `/api/admin/shop/categories/:slug` | editor | Edita una categoría |
| DELETE | `/api/admin/shop/categories/:slug` | **admin** | Borra (falla si tiene productos) |
| POST | `/api/admin/shop/items` | editor | Crea un producto con variantes |
| PATCH | `/api/admin/shop/items/:slug` | editor | Edita un producto |
| PATCH | `/api/admin/shop/items/:slug/stock` | editor | Ajusta stock de una variante |
| DELETE | `/api/admin/shop/items/:slug` | **admin** | Borra un producto |
| POST | `/api/admin/news` | editor | Crea una noticia |
| PATCH | `/api/admin/news/:slug` | editor | Edita una noticia |
| DELETE | `/api/admin/news/:slug` | **admin** | Borra una noticia |
| PUT | `/api/admin/site/settings/:key` | editor | Texto, correo o estadísticas |
| PATCH | `/api/admin/site/contact/:key` | editor | Edita un canal (p. ej. `whatsapp`) |
| POST/PATCH | `/api/admin/site/donation-tiers…` | editor | Niveles de donación |
| POST/PATCH | `/api/admin/site/testimonials…` | editor | Testimonios |
| POST/PATCH | `/api/admin/site/bank-accounts…` | editor | Cuentas bancarias |

Todas las escrituras quedan registradas en `admin_audit_log` con el usuario,
los valores anteriores y los nuevos.

Al editar el canal `whatsapp`, el texto visible (`phoneDisplay`) y el enlace se
recalculan a partir del número: no pueden contradecirse aunque el panel envíe
solo `phoneNumber`.

```bash
# Inicia sesión y guarda la cookie
curl -c cookies.txt -X POST http://localhost:3100/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@droopymanuel.co","password":"tu-contraseña"}'

# Crea un perrito con esa sesión
curl -b cookies.txt -X POST http://localhost:3100/api/admin/dogs \
  -H 'Content-Type: application/json' \
  -d '{"name":"Nuevo","breed":"Mestizo","birthDate":"2024-01-01","isApprox":true,"sex":"macho","size":"mediano","energy":"tranquilo","status":"en-adopcion",'\
'"arrival":"2026-01-01","story":"Llegó hoy."}'
```

Para scripts y CI existe una vía alternativa con `x-admin-token`, comparada
contra `ADMIN_TOKEN` del entorno. Si `ADMIN_TOKEN` no está definida (o tiene
menos de 16 caracteres), esa vía queda deshabilitada: no hay acceso abierto
por olvido.

## Configuración

Copia `.env.example` a `.env` si necesitas cambiar algo:

- `PORT` — puerto (por defecto `3100`)
- `DATABASE_URL` — cadena de conexión a PostgreSQL
- `PUBLIC_ORIGINS` — orígenes permitidos por CORS, separados por coma
- `ADMIN_TOKEN` — opcional, para escritura desde scripts
- `NODE_ENV` — `production` activa la cookie `secure`

> **Nota sobre los puertos.** En Windows es común que el 3000 y el 3001 ya
> estén ocupados por otras herramientas. Por eso la API usa `3100`. La base de
> datos usa `2121` porque el `5432` lo ocupa el PostgreSQL nativo. Si al
> arrancar ves `EADDRINUSE`, cambia el puerto y ajusta el frontend.

## Dinero

Todos los montos son **centavos enteros** de COP: `4500000` es `$45.000`.
Así se suman sin errores de coma flotante. El frontend los formatea con
`formatCOP()`.

## Persistencia

Todo vive en PostgreSQL: catálogo, pedidos, cuentas del panel y auditoría.
Los archivos de `src/data/*.ts` ya **no** son la fuente de verdad en tiempo de
ejecución; se conservan como origen del seed, así que el contenido inicial y
el de la base no pueden divergir mientras se siembren desde ahí.

Para cambiar un dato en producción usa el panel (o `pnpm db:studio`), no el
archivo `.ts`: editar el `.ts` no afecta a la base hasta que vuelvas a sembrar.

## Relación con el frontend

Este repo es la fuente de verdad de los datos y del contrato de tipos
(`src/types.ts`). El frontend (`../Front`) mantiene una copia de esos tipos en
`src/lib/data/types.ts` y consume la API a través de `src/lib/api/*.ts`.

Si cambias un tipo aquí, actualízalo también allí.
