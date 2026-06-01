# MicroGuard Backend

API REST para **MicroGuard**, sistema orientado a la gestion de tiendas, inventario, compras, ventas, clientes, proveedores y notificaciones de stock o vencimiento.

El backend esta desarrollado con Node.js, Express y PostgreSQL. Usa Firebase Admin para validar usuarios autenticados desde Firebase, registra tokens FCM para notificaciones push y ejecuta una tarea programada diaria para alertar sobre lotes criticos.

## Tecnologias

- Node.js
- Express 5
- PostgreSQL
- Firebase Admin SDK
- Firebase Cloud Messaging
- Zod
- dotenv
- cors
- node-cron
- node-fetch

## Arquitectura

El proyecto sigue una organizacion por capas para separar rutas, controladores, reglas de negocio, acceso a datos y validaciones.

```txt
Backend/
|-- app.js
|-- package.json
|-- database/
|   `-- schema.sql
`-- src/
    |-- config/
    |-- controllers/
    |-- jobs/
    |-- middlewares/
    |-- repositories/
    |-- routes/
    |-- services/
    |-- utils/
    `-- validators/
```

Flujo principal:

```txt
Routes -> Middlewares -> Controllers -> Services -> Repositories -> PostgreSQL
```

## Modulos Principales

- **Usuarios y tiendas**: registro inicial, login, cierre de sesion y validacion de RUC disponible.
- **Categorias**: registro, listado, busqueda, edicion y cambio de estado.
- **Clientes**: gestion de clientes generales, naturales y empresas.
- **Proveedores**: gestion de proveedores naturales o empresas.
- **Metodos de pago**: administracion de medios de pago por tienda.
- **Productos**: registro, busqueda, sugerencias, codigos internos, codigos de barras y estado.
- **Compras**: registro de compras y detalle de lotes ingresados.
- **Ventas**: registro de ventas, detalle de productos vendidos y comprobantes.
- **Inventario**: consulta de stock, lotes, estados y detalle por producto.
- **Operaciones de inventario**: ajustes por error logistico, producto danado, traspaso u otros motivos.
- **Notificaciones**: envio de alertas push y cron diario de lotes criticos.
- **Servicios externos**: consulta de RUC y DNI.

## Requisitos

- Node.js 18 o superior recomendado.
- PostgreSQL instalado o una base de datos PostgreSQL remota.
- Proyecto de Firebase con credenciales de servicio.
- Token para consulta de DNI en API Peru, si se usara el endpoint de DNI.

## Instalacion

```bash
npm install
```

## Configuracion

Crea un archivo `.env` en la raiz del proyecto. Puedes conectarte a PostgreSQL usando `DATABASE_URL` o variables separadas.

```env
PORT=8080
NODE_ENV=development

# Opcion 1: conexion completa
DATABASE_URL=postgresql://usuario:password@localhost:5432/microguard
PGSSL=false

# Opcion 2: conexion por partes
PGHOST=localhost
PGPORT=5432
PGDATABASE=microguard
PGUSER=postgres
PGPASSWORD=postgres

# Firebase Admin
FIREBASE_CREDENTIALS_PATH=./src/config/firebase-service-account.json
# o FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# Consulta DNI
API_KEY_DNI=tu_token
```

> Nota: `.env` y `src/config/firebase-service-account.json` estan ignorados por Git porque contienen informacion sensible.

## Base de Datos

El esquema inicial esta en:

```txt
database/schema.sql
```

Incluye las tablas principales:

- tiendas
- usuarios
- tokens_fcm
- categorias
- clientes
- proveedores
- metodos_pago
- productos
- lotes_producto
- compras y detalle_compras
- ventas y detalle_ventas
- operaciones_inventario

Para preparar la base de datos, crea una base PostgreSQL y ejecuta el contenido de `database/schema.sql`.

## Ejecucion

Modo desarrollo con recarga automatica de Node:

```bash
npm run dev
```

Modo produccion:

```bash
npm start
```

Por defecto el servidor levanta en:

```txt
http://localhost:8080
```

## Scripts Disponibles

```bash
npm run dev
npm start
npm test
```

Actualmente `npm test` no tiene pruebas configuradas.

## Endpoints Principales

Rutas publicas:

```http
POST /usuario/completarRegistro
GET  /usuario/verificarRucDisponible
POST /usuario/login
GET  /servicio/ruc/:ruc
GET  /servicio/dni/:dni
```

Rutas protegidas con token Firebase en el header `Authorization: Bearer <token>`:

```http
POST /usuario/cerrarSesion

GET    /categoria
GET    /categoria/activos
GET    /categoria/inactivos
GET    /categoria/:id
POST   /categoria
PUT    /categoria/:id
PATCH  /categoria/:id/estado

GET    /proveedor
GET    /proveedor/activos
GET    /proveedor/buscar
GET    /proveedor/:id
POST   /proveedor
PUT    /proveedor/:id
PATCH  /proveedor/:id/estado

GET    /cliente
GET    /cliente/activos
GET    /cliente/buscar
GET    /cliente/:id
POST   /cliente
PUT    /cliente/:id
PATCH  /cliente/:id/estado

GET    /metodopago
GET    /metodopago/activos
GET    /metodopago/:id
POST   /metodopago
PUT    /metodopago/:id
PATCH  /metodopago/:id/estado

GET    /producto
GET    /producto/activos
GET    /producto/sugerencias
GET    /producto/buscar
GET    /producto/codigo/:codigo
GET    /producto/:id
POST   /producto
PUT    /producto/:id
PATCH  /producto/:id/estado

GET    /compra
GET    /compra/:id
POST   /compra
PATCH  /compra/:id/estado

GET    /venta
GET    /venta/:id
POST   /venta
PATCH  /venta/:id/estado

GET    /inventario
GET    /inventario/producto/:id
GET    /inventario/estados
GET    /inventario/estados/:id

GET    /operacion
POST   /operacion

POST   /notificacion/enviar
```

## Autenticacion

Las rutas protegidas usan Firebase Authentication. El backend valida el ID token con Firebase Admin y luego busca el usuario en la tabla `usuarios` mediante `firebase_uid`.

Si el usuario no existe, esta inhabilitado o el token no es valido, la API responde con errores `401` o `403`.

## Notificaciones

El proyecto incluye:

- Registro de tokens FCM por usuario.
- Envio de notificaciones push.
- Cron diario a las **6:00 AM** en zona horaria `America/Lima`.
- Revision de tiendas activas para alertas relacionadas con lotes criticos.

## Validaciones y Errores

- Las entradas se validan con Zod desde `src/validators`.
- Los errores se centralizan con middlewares y utilidades en `src/utils`.
- Las respuestas mantienen una estructura consistente con `success`, `message` y datos cuando corresponde.

## Estado del Proyecto

Proyecto en desarrollo como parte de la tesis. El backend ya cuenta con modulos funcionales para inventario, compras, ventas, administracion de entidades y notificaciones.

Pendientes sugeridos:

- Documentacion Swagger/OpenAPI.
- Pruebas automatizadas.
- Dockerizacion.
- Logs avanzados.
- Pipeline CI/CD.

## Autor

Desarrollado por **Jhordany Torres**.
