const { query } = require("../config/database");

const LIMITE_MINIMO = 1;
const LIMITE_MAXIMO = 20;
const MEDIDAS_PERMITIDAS = ["lt", "ml", "g", "kg", "kl"];

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";
const normalizarCodigo = (valor) => {
    const texto = normalizarTexto(valor);
    return texto ? texto.toUpperCase() : "";
};
const normalizarNumero = (valor, fallback = null) => {
    if (valor === null || valor === undefined || valor === "") return fallback;

    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : fallback;
};
const normalizarBooleano = (valor, fallback = false) => {
    if (typeof valor === "boolean") return valor;
    return fallback;
};
const formatearDecimal = (valor) => valor === null || valor === undefined ? null : Number(valor);

const formatearProducto = (producto) => ({
    id: producto.id,
    nombre: producto.nombre,
    codBarras: producto.cod_barras || null,
    codInterno: producto.cod_interno,
    imagenUrl: producto.imagen_url || null,
    cantidadMedida: formatearDecimal(producto.cantidad_medida),
    medida: producto.medida,
    precioVenta: formatearDecimal(producto.precio_venta),
    perecible: producto.perecible,
    estado: producto.estado,
    categoria: producto.categoria_id
        ? {
            id: producto.categoria_id,
            nombre: producto.categoria_nombre || null
        }
        : null,
    fechaRegistro: producto.fecha_registro,
    fechaModificacion: producto.fecha_modificacion
});

const responderError = (res, error, mensaje) => {
    if (error?.code === "23505") {
        return res.status(409).json({
            success: false,
            message: "Ya existe un producto con ese codigo interno o codigo de barras"
        });
    }

    if (error?.code === "23503") {
        return res.status(400).json({
            success: false,
            message: "La categoria enviada no existe"
        });
    }

    if (error?.code === "23514") {
        return res.status(400).json({
            success: false,
            message: "Los datos del producto no cumplen las reglas de la base de datos"
        });
    }

    return res.status(500).json({
        success: false,
        message: error.message || mensaje
    });
};

const validarId = (id, res, entidad = "producto") => {
    const numero = Number(id);

    if (!Number.isInteger(numero) || numero <= 0) {
        res.status(400).json({
            success: false,
            message: `ID de ${entidad} invalido`
        });
        return null;
    }

    return numero;
};

const validarTienda = (req, res) => {
    if (!req.idTienda) {
        res.status(403).json({
            success: false,
            message: "Usuario sin tienda asociada"
        });
        return false;
    }

    return true;
};

const obtenerProductoBaseQuery = () => `
    SELECT
        p.id,
        p.nombre,
        p.cod_barras,
        p.cod_interno,
        p.imagen_url,
        p.cantidad_medida,
        p.medida,
        p.precio_venta,
        p.perecible,
        p.estado,
        p.categoria_id,
        c.nombre AS categoria_nombre,
        p.fecha_registro,
        p.fecha_modificacion
    FROM productos p
    INNER JOIN categorias c ON c.id = p.categoria_id
`;

const validarCategoria = async (categoriaId, tiendaId) => {
    const result = await query(
        `SELECT id
         FROM categorias
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1`,
        [categoriaId, tiendaId]
    );

    return result.rows.length > 0;
};

const construirDatosProducto = (body, datosActuales = {}) => {
    const categoriaId = body.categoriaId ?? body.categoria_id ?? datosActuales.categoria_id;
    const nombre = normalizarTexto(body.nombre ?? datosActuales.nombre);
    const codBarras = normalizarTexto(body.codBarras ?? body.cod_barras ?? datosActuales.cod_barras);
    const codInterno = normalizarCodigo(body.codInterno ?? body.cod_interno ?? datosActuales.cod_interno);
    const imagenUrl = normalizarTexto(body.imagenUrl ?? body.imagen_url ?? datosActuales.imagen_url);
    const cantidadMedida = normalizarNumero(
        body.cantidadMedida ?? body.cantidad_medida ?? datosActuales.cantidad_medida,
        null
    );
    const medida = normalizarTexto(body.medida ?? datosActuales.medida).toLowerCase();
    const precioVenta = normalizarNumero(body.precioVenta ?? body.precio_venta ?? datosActuales.precio_venta, null);
    const perecible = normalizarBooleano(body.perecible ?? datosActuales.perecible, false);

    return {
        categoriaId: Number(categoriaId),
        nombre,
        codBarras: codBarras || null,
        codInterno,
        imagenUrl: imagenUrl || null,
        cantidadMedida,
        medida: medida || null,
        precioVenta,
        perecible
    };
};

const validarDatosProducto = async (res, datos, tiendaId) => {
    if (!Number.isInteger(datos.categoriaId) || datos.categoriaId <= 0) {
        res.status(400).json({
            success: false,
            message: "La categoria es obligatoria"
        });
        return false;
    }

    if (!datos.nombre || !datos.codInterno || datos.precioVenta === null) {
        res.status(400).json({
            success: false,
            message: "Nombre, codigo interno y precio de venta son obligatorios"
        });
        return false;
    }

    if (datos.precioVenta < 0) {
        res.status(400).json({
            success: false,
            message: "El precio de venta no puede ser negativo"
        });
        return false;
    }

    const tieneCantidad = datos.cantidadMedida !== null;
    const tieneMedida = Boolean(datos.medida);

    if (tieneCantidad !== tieneMedida) {
        res.status(400).json({
            success: false,
            message: "Debe enviar cantidad de medida y medida juntas, o dejar ambas vacias"
        });
        return false;
    }

    if (datos.cantidadMedida !== null && datos.cantidadMedida <= 0) {
        res.status(400).json({
            success: false,
            message: "La cantidad de medida debe ser mayor a cero"
        });
        return false;
    }

    if (datos.medida && !MEDIDAS_PERMITIDAS.includes(datos.medida)) {
        res.status(400).json({
            success: false,
            message: "La medida debe ser lt, ml, g, kg o kl"
        });
        return false;
    }

    const categoriaExiste = await validarCategoria(datos.categoriaId, tiendaId);
    if (!categoriaExiste) {
        res.status(404).json({
            success: false,
            message: "Categoria no encontrada o inactiva"
        });
        return false;
    }

    return true;
};

const obtenerLimite = (valor, fallback = 10) => {
    return Math.min(
        LIMITE_MAXIMO,
        Math.max(LIMITE_MINIMO, normalizarNumero(valor, fallback))
    );
};

const registrarProducto = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const datos = construirDatosProducto(req.body);
        const esValido = await validarDatosProducto(res, datos, req.idTienda);
        if (!esValido) return;

        const result = await query(
            `INSERT INTO productos (
                tienda_id,
                categoria_id,
                nombre,
                cod_barras,
                cod_interno,
                imagen_url,
                cantidad_medida,
                medida,
                precio_venta,
                perecible
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [
                req.idTienda,
                datos.categoriaId,
                datos.nombre,
                datos.codBarras,
                datos.codInterno,
                datos.imagenUrl,
                datos.cantidadMedida,
                datos.medida,
                datos.precioVenta,
                datos.perecible
            ]
        );

        const producto = await obtenerProductoPorId(result.rows[0].id, req.idTienda);

        return res.status(201).json({
            success: true,
            message: "Producto registrado correctamente",
            data: { producto: formatearProducto(producto) }
        });
    } catch (error) {
        return responderError(res, error, "Error al registrar producto");
    }
};

const obtenerProductoPorId = async (id, tiendaId) => {
    const result = await query(
        `${obtenerProductoBaseQuery()}
         WHERE p.id = $1 AND p.tienda_id = $2
         LIMIT 1`,
        [id, tiendaId]
    );

    return result.rows[0] || null;
};

const listarProductos = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const result = await query(
            `${obtenerProductoBaseQuery()}
             WHERE p.tienda_id = $1
             ORDER BY p.fecha_registro DESC
             LIMIT 100`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Productos obtenidos correctamente" : "No hay productos registrados",
            data: { productos: result.rows.map(formatearProducto) }
        });
    } catch (error) {
        return responderError(res, error, "Error al listar productos");
    }
};

const listarProductosActivos = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const result = await query(
            `${obtenerProductoBaseQuery()}
             WHERE p.tienda_id = $1 AND p.estado = TRUE
             ORDER BY p.nombre ASC
             LIMIT 100`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Productos activos obtenidos correctamente" : "No hay productos activos",
            data: { productos: result.rows.map(formatearProducto) }
        });
    } catch (error) {
        return responderError(res, error, "Error al obtener productos activos");
    }
};

const buscarProductoPorId = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const producto = await obtenerProductoPorId(id, req.idTienda);

        if (!producto) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Producto obtenido correctamente",
            data: { producto: formatearProducto(producto) }
        });
    } catch (error) {
        return responderError(res, error, "Error al buscar producto");
    }
};

const obtenerSugerencias = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const textoBusqueda = normalizarTexto(req.query.query);
        const categoriaId = normalizarNumero(req.query.categoria, null);
        const limit = obtenerLimite(req.query.limit, 5);

        if (!textoBusqueda || textoBusqueda.length < 2) {
            return res.status(400).json({
                success: false,
                message: "La consulta debe tener al menos 2 caracteres"
            });
        }

        const filtros = ["p.tienda_id = $1", "p.estado = TRUE"];
        const valores = [req.idTienda];

        if (categoriaId) {
            valores.push(categoriaId);
            filtros.push(`p.categoria_id = $${valores.length}`);
        }

        valores.push(`${textoBusqueda}%`);
        filtros.push(`(p.nombre ILIKE $${valores.length} OR p.cod_barras ILIKE $${valores.length} OR p.cod_interno ILIKE $${valores.length})`);

        valores.push(limit);

        const result = await query(
            `${obtenerProductoBaseQuery()}
             WHERE ${filtros.join(" AND ")}
             ORDER BY p.nombre ASC
             LIMIT $${valores.length}`,
            valores
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Productos sugeridos" : "No hay productos sugeridos",
            data: {
                productos: result.rows.map((producto) => ({
                    ...formatearProducto(producto),
                    exacto: producto.nombre.toLowerCase() === textoBusqueda.toLowerCase()
                }))
            }
        });
    } catch (error) {
        return responderError(res, error, "Error al obtener sugerencias");
    }
};

const buscarProductos = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const textoBusqueda = normalizarTexto(req.query.query);
        const categoriaId = normalizarNumero(req.query.categoria, null);
        const limit = obtenerLimite(req.query.limit, 10);
        const page = Math.max(1, normalizarNumero(req.query.page, 1));
        const offset = (page - 1) * limit;

        const filtros = ["p.tienda_id = $1", "p.estado = TRUE"];
        const valores = [req.idTienda];

        if (categoriaId) {
            valores.push(categoriaId);
            filtros.push(`p.categoria_id = $${valores.length}`);
        }

        if (textoBusqueda) {
            valores.push(`%${textoBusqueda}%`);
            filtros.push(`(p.nombre ILIKE $${valores.length} OR p.cod_barras ILIKE $${valores.length} OR p.cod_interno ILIKE $${valores.length})`);
        }

        const countResult = await query(
            `SELECT COUNT(*)::INT AS total
             FROM productos p
             WHERE ${filtros.join(" AND ")}`,
            valores
        );

        const valoresListado = [...valores, limit, offset];
        const result = await query(
            `${obtenerProductoBaseQuery()}
             WHERE ${filtros.join(" AND ")}
             ORDER BY p.nombre ASC
             LIMIT $${valoresListado.length - 1}
             OFFSET $${valoresListado.length}`,
            valoresListado
        );

        const total = countResult.rows[0]?.total || 0;

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Productos encontrados" : "No se encontraron productos",
            data: {
                productos: result.rows.map(formatearProducto),
                paginacion: {
                    pagina: page,
                    limite: limit,
                    total,
                    totalPaginas: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        return responderError(res, error, "Error al buscar productos");
    }
};

const obtenerProductoPorCodigo = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const codigo = normalizarTexto(req.params.codigo || req.query.codigo);
        const codigoInterno = normalizarCodigo(codigo);

        if (!codigo) {
            return res.status(400).json({
                success: false,
                message: "El codigo es obligatorio"
            });
        }

        const result = await query(
            `${obtenerProductoBaseQuery()}
             WHERE p.tienda_id = $1
               AND p.estado = TRUE
               AND (p.cod_barras = $2 OR p.cod_interno = $3)
             LIMIT 1`,
            [req.idTienda, codigo, codigoInterno]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "No existe un producto con ese codigo"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Producto encontrado",
            data: { producto: formatearProducto(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al buscar producto por codigo");
    }
};

const editarProducto = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const actual = await query(
            `SELECT id, categoria_id, nombre, cod_barras, cod_interno, imagen_url, cantidad_medida, medida, precio_venta, perecible
             FROM productos
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!actual.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        const datos = construirDatosProducto(req.body, actual.rows[0]);
        const esValido = await validarDatosProducto(res, datos, req.idTienda);
        if (!esValido) return;

        await query(
            `UPDATE productos
             SET categoria_id = $1,
                 nombre = $2,
                 cod_barras = $3,
                 cod_interno = $4,
                 imagen_url = $5,
                 cantidad_medida = $6,
                 medida = $7,
                 precio_venta = $8,
                 perecible = $9,
                 fecha_modificacion = NOW()
             WHERE id = $10 AND tienda_id = $11`,
            [
                datos.categoriaId,
                datos.nombre,
                datos.codBarras,
                datos.codInterno,
                datos.imagenUrl,
                datos.cantidadMedida,
                datos.medida,
                datos.precioVenta,
                datos.perecible,
                id,
                req.idTienda
            ]
        );

        const producto = await obtenerProductoPorId(id, req.idTienda);

        return res.status(200).json({
            success: true,
            message: "Producto actualizado correctamente",
            data: { producto: formatearProducto(producto) }
        });
    } catch (error) {
        return responderError(res, error, "Error al editar producto");
    }
};

const cambiarEstadoProducto = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const { estado } = req.body;

        if (typeof estado !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Debe enviar el campo estado como booleano"
            });
        }

        const actual = await query(
            `SELECT id, estado
             FROM productos
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!actual.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        if (actual.rows[0].estado === estado) {
            return res.status(400).json({
                success: false,
                message: `El producto ya esta ${estado ? "habilitado" : "deshabilitado"}`
            });
        }

        await query(
            `UPDATE productos
             SET estado = $1,
                 fecha_modificacion = NOW()
             WHERE id = $2 AND tienda_id = $3`,
            [estado, id, req.idTienda]
        );

        const producto = await obtenerProductoPorId(id, req.idTienda);

        return res.status(200).json({
            success: true,
            message: `Producto ${estado ? "habilitado" : "deshabilitado"} correctamente`,
            data: { producto: formatearProducto(producto) }
        });
    } catch (error) {
        return responderError(res, error, "Error al cambiar estado del producto");
    }
};

module.exports = {
    registrarProducto,
    listarProductos,
    listarProductosActivos,
    buscarProductoPorId,
    obtenerSugerencias,
    buscarProductos,
    obtenerProductoPorCodigo,
    editarProducto,
    cambiarEstadoProducto
};
