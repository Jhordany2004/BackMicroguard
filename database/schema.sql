-- Estructura inicial PostgreSQL - Sistema de inventario Microguard

-- =========================
-- Tiendas y usuarios
-- =========================

CREATE TABLE tiendas (
    id BIGSERIAL PRIMARY KEY,
    ruc VARCHAR(11) NOT NULL UNIQUE,
    nombre VARCHAR(160) NOT NULL,
    razon_social VARCHAR(255) NOT NULL UNIQUE,
    stock_minimo NUMERIC(12,2) NOT NULL DEFAULT 20,
    dias_alerta_vencimiento INTEGER NOT NULL DEFAULT 7,
    tipo_moneda VARCHAR(3) NOT NULL DEFAULT 'PEN',    
    captura_qr TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    CHECK (tipo_moneda IN ('PEN', 'USD'))
);

CREATE TABLE usuarios (
    id BIGSERIAL PRIMARY KEY,
    tienda_id BIGINT REFERENCES tiendas(id) ON DELETE RESTRICT,
    firebase_uid VARCHAR(255) NOT NULL UNIQUE,
    nombres VARCHAR(120) NOT NULL,
    apellidos VARCHAR(120) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    celular VARCHAR(15),
    rol VARCHAR(20) NOT NULL DEFAULT 'empleado',
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    CHECK (rol IN ('admin', 'empleado'))
);

CREATE TABLE tokens_fcm (
    id BIGSERIAL PRIMARY KEY,
    usuario_id BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    UNIQUE (usuario_id, token)
);

-- =========================
-- Mantenimientos
-- =========================

CREATE TABLE categorias (
    id BIGSERIAL PRIMARY KEY,
    tienda_id BIGINT NOT NULL REFERENCES tiendas(id),
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    UNIQUE (tienda_id, nombre)
);

CREATE TABLE clientes (
    id BIGSERIAL PRIMARY KEY,
    tienda_id BIGINT NOT NULL REFERENCES tiendas(id),
    documento VARCHAR(20) NOT NULL,
    nombre VARCHAR(120) NOT NULL,
    apellido VARCHAR(120) NOT NULL,
    telefono VARCHAR(15),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    UNIQUE (tienda_id, documento),
    UNIQUE (tienda_id, nombre, apellido)
);

CREATE TABLE proveedores (
    id BIGSERIAL PRIMARY KEY,
    tienda_id BIGINT NOT NULL REFERENCES tiendas(id),
    tipo_proveedor VARCHAR(20) NOT NULL,
    documento VARCHAR(20) NOT NULL,
    razon_social VARCHAR(255) NOT NULL,
    telefono VARCHAR(15),
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    CHECK (tipo_proveedor IN ('Natural', 'Empresa')),
    UNIQUE (tienda_id, documento),
    UNIQUE (tienda_id, razon_social)
);

CREATE TABLE metodos_pago (
    id BIGSERIAL PRIMARY KEY,
    tienda_id BIGINT NOT NULL REFERENCES tiendas(id),
    nombre VARCHAR(80) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    UNIQUE (tienda_id, nombre)
);

-- =========================
-- Productos e inventario
-- =========================

CREATE TABLE productos (
    id BIGSERIAL PRIMARY KEY,
    tienda_id BIGINT NOT NULL REFERENCES tiendas(id),
    categoria_id BIGINT NOT NULL REFERENCES categorias(id) ON DELETE RESTRICT,
    nombre VARCHAR(180) NOT NULL,
    cod_barras VARCHAR(80),
    cod_interno VARCHAR(80) NOT NULL,
    imagen_url TEXT,
    cantidad_medida NUMERIC(12,2),
    medida VARCHAR(10),
    precio_venta NUMERIC(12,2) NOT NULL,
    perecible BOOLEAN NOT NULL DEFAULT FALSE,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    CHECK (precio_venta >= 0),
    CHECK (medida IS NULL OR medida IN ('lt', 'ml', 'g', 'kg', 'kl')),
    CHECK (
        (cantidad_medida IS NULL AND medida IS NULL)
        OR
        (cantidad_medida IS NOT NULL AND cantidad_medida > 0 AND medida IS NOT NULL)
    ),
    UNIQUE (tienda_id, cod_interno),
    UNIQUE (tienda_id, cod_barras)
);

CREATE TABLE lotes_producto (
    id BIGSERIAL PRIMARY KEY,
    producto_id BIGINT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    stock_inicial NUMERIC(12,2) NOT NULL,
    stock_actual NUMERIC(12,2) NOT NULL,
    precio_compra NUMERIC(12,2) NOT NULL,
    fecha_ingreso TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_vencimiento TIMESTAMP ,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    CHECK (stock_inicial >= 0),
    CHECK (stock_actual >= 0),
    CHECK (precio_compra >= 0)
);

-- =========================
-- Compras
-- =========================

CREATE TABLE compras (
    id BIGSERIAL PRIMARY KEY,
    tienda_id BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE RESTRICT,
    proveedor_id BIGINT NOT NULL REFERENCES proveedores(id),
    precio_total NUMERIC(12,2) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    CHECK (precio_total >= 0)
);

CREATE TABLE detalle_compras (
    id BIGSERIAL PRIMARY KEY,
    compra_id BIGINT NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
    lote_id BIGINT NOT NULL REFERENCES lotes_producto(id),
    producto_id BIGINT NOT NULL REFERENCES productos(id),
    cantidad_comprada NUMERIC(12,2) NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    precio_total NUMERIC(12,2) NOT NULL,
    prod_nombre VARCHAR(180) NOT NULL,
    prod_medida VARCHAR(10),
    prod_cod_barras VARCHAR(80),
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    CHECK (cantidad_comprada > 0),
    CHECK (precio_unitario >= 0),
    CHECK (precio_total >= 0)
);

-- =========================
-- Ventas
-- =========================

CREATE TABLE ventas (
    id BIGSERIAL PRIMARY KEY,
    tienda_id BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE RESTRICT,
    cliente_id BIGINT REFERENCES clientes(id),
    metodo_pago_id BIGINT NOT NULL REFERENCES metodos_pago(id),
    precio_total NUMERIC(12,2) NOT NULL,
    comprobante TEXT,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    CHECK (precio_total >= 0)
);

CREATE TABLE detalle_ventas (
    id BIGSERIAL PRIMARY KEY,
    venta_id BIGINT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    lote_id BIGINT NOT NULL REFERENCES lotes_producto(id),
    producto_id BIGINT NOT NULL REFERENCES productos(id),
    cantidad NUMERIC(12,2) NOT NULL,
    precio_unitario NUMERIC(12,2) NOT NULL,
    precio_total NUMERIC(12,2) NOT NULL,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    CHECK (cantidad > 0),
    CHECK (precio_unitario >= 0),
    CHECK (precio_total >= 0)
);

-- =========================
-- Operaciones de inventario
-- =========================

CREATE TABLE operaciones_inventario (
    id BIGSERIAL PRIMARY KEY,
    tienda_id BIGINT NOT NULL REFERENCES tiendas(id) ON DELETE RESTRICT,
    lote_id BIGINT NOT NULL REFERENCES lotes_producto(id),
    producto_id BIGINT NOT NULL REFERENCES productos(id),
    razon VARCHAR(40) NOT NULL,
    descripcion TEXT,
    cantidad NUMERIC(12,2) NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_registro TIMESTAMP NOT NULL DEFAULT NOW(),
    fecha_modificacion TIMESTAMP,
    CHECK (razon IN ('Error logistico', 'Producto danado', 'Traspaso', 'Otro')),
    CHECK (cantidad > 0)
);

-- =========================
-- Indices basicos
-- =========================

CREATE INDEX idx_categorias_tienda_estado ON categorias (tienda_id, estado);
CREATE INDEX idx_clientes_tienda_estado ON clientes (tienda_id, estado);
CREATE INDEX idx_proveedores_tienda_estado ON proveedores (tienda_id, estado);
CREATE INDEX idx_metodos_pago_tienda_estado ON metodos_pago (tienda_id, estado);
CREATE INDEX idx_productos_tienda_estado ON productos (tienda_id, estado);
CREATE INDEX idx_productos_categoria ON productos (categoria_id);
CREATE INDEX idx_lotes_producto_estado ON lotes_producto (producto_id, estado);
CREATE INDEX idx_lotes_vencimiento ON lotes_producto (fecha_vencimiento);
CREATE INDEX idx_compras_tienda_fecha ON compras (tienda_id, fecha_registro);
CREATE INDEX idx_ventas_tienda_fecha ON ventas (tienda_id, fecha_registro);
CREATE INDEX idx_operaciones_tienda_fecha ON operaciones_inventario (tienda_id, fecha_registro);

-- Indices para inventario y notificaciones
CREATE INDEX idx_productos_tienda_perecible ON productos (tienda_id, estado, perecible);
CREATE INDEX idx_lotes_estado_vencimiento ON lotes_producto (estado, fecha_vencimiento);
CREATE INDEX idx_lotes_producto_stock ON lotes_producto (producto_id, estado, stock_actual);
CREATE INDEX idx_tokens_usuario ON tokens_fcm(usuario_id);
CREATE INDEX idx_productos_stock_critico ON productos (tienda_id, estado);

--By: Jhordany Torres - 2024-06-20