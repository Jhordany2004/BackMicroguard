const { query } = require("../config/database");

const ESTADOS_INVENTARIO = {
    AGOTADO: 1,
    PROXIMO_A_VENCER: 2,
    STOCK_BAJO: 3,
    EXCEDENTE: 4,
    STOCK_OPTIMO: 5
};

const LABELS_ESTADO = {
    1: "Agotado",
    2: "Proximo a Vencer",
    3: "Stock Bajo",
    4: "Excedente",
    5: "Stock Optimo"
};

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";
const convertirNumero = (valor, fallback = null) => {
    if (valor === null || valor === undefined || valor === "") return fallback;

    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : fallback;
};
const convertirBooleanoQuery = (valor) => {
    if (valor === undefined || valor === null || valor === "") return null;
    if (valor === "true" || valor === true) return true;
    if (valor === "false" || valor === false) return false;
    return null;
};
const decimal = (valor) => valor === null || valor === undefined ? null : Number(valor);

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

const obtenerConfiguracionTienda = async (tiendaId) => {
    const result = await query(
        `SELECT stock_minimo, dias_alerta_vencimiento
         FROM tiendas
         WHERE id = $1 AND estado = TRUE
         LIMIT 1`,
        [tiendaId]
    );

    return result.rows[0] || null;
};

const formatearProductoInventario = (producto) => ({
    id: producto.id,
    nombre: producto.nombre,
    imagenUrl: producto.imagen_url || null,
    cantidadMedida: decimal(producto.cantidad_medida),
    medida: producto.medida,
    stockTotal: decimal(producto.stock_total) || 0,
    totalLotes: Number(producto.total_lotes) || 0,
    proximaFechaVencimiento: producto.proxima_fecha_vencimiento,
    estadoInventario: producto.estado_inventario,
    estadoInventarioTexto: LABELS_ESTADO[producto.estado_inventario],
    categoria: {
        id: producto.categoria_id,
        nombre: producto.categoria_nombre
    }
});

const formatearLote = (lote) => ({
    id: lote.id,
    numeroLote: `Lote #${lote.numero_lote}`,
    stockInicial: decimal(lote.stock_inicial),
    stockActual: decimal(lote.stock_actual),
    precioCompra: decimal(lote.precio_compra),
    fechaIngreso: lote.fecha_ingreso,
    fechaVencimiento: lote.fecha_vencimiento,
    estadoLote: lote.estado_lote
});

const construirCteInventario = () => `
    WITH inventario AS (
        SELECT
            p.id,
            p.nombre,
            p.imagen_url,
            p.cantidad_medida,
            p.medida,
            p.precio_venta,
            p.cod_barras,
            p.cod_interno,
            p.perecible,
            p.categoria_id,
            c.nombre AS categoria_nombre,
            p.fecha_registro,
            COALESCE(SUM(l.stock_actual) FILTER (WHERE l.estado = TRUE), 0) AS stock_total,
            COUNT(l.id) FILTER (WHERE l.estado = TRUE) AS total_lotes,
            MIN(l.fecha_vencimiento) FILTER (
                WHERE l.estado = TRUE
                  AND l.fecha_vencimiento IS NOT NULL
                  AND l.stock_actual > 0
            ) AS proxima_fecha_vencimiento,
            COUNT(l.id) FILTER (
                WHERE l.estado = TRUE
                  AND l.stock_actual > 0
                  AND l.fecha_vencimiento IS NOT NULL
                  AND l.fecha_vencimiento::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($2::INT * INTERVAL '1 day'))::date
            ) AS lotes_proximos_vencer
        FROM productos p
        INNER JOIN categorias c ON c.id = p.categoria_id
        LEFT JOIN lotes_producto l ON l.producto_id = p.id
        WHERE p.tienda_id = $1
          AND p.estado = TRUE
        GROUP BY p.id, c.nombre
    ),
    inventario_estado AS (
        SELECT
            *,
            CASE
                WHEN stock_total <= 0 THEN 1
                WHEN lotes_proximos_vencer > 0 THEN 2
                WHEN stock_total <= $3 THEN 3
                WHEN stock_total > ($3 * 2) THEN 4
                ELSE 5
            END AS estado_inventario
        FROM inventario
    )
`;

const obtenerInventarioProductos = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const tienda = await obtenerConfiguracionTienda(req.idTienda);
        if (!tienda) {
            return res.status(404).json({
                success: false,
                message: "Tienda no encontrada"
            });
        }

        const categoriaId = convertirNumero(req.query.idcategoria ?? req.query.categoriaId, null);
        const nombreProducto = normalizarTexto(req.query.nombreProducto ?? req.query.query);
        const estado = convertirNumero(req.query.estado, null);
        const perecible = convertirBooleanoQuery(req.query.perecible);
        const pagina = Math.max(1, convertirNumero(req.query.pagina, 1));
        const limite = Math.min(50, Math.max(1, convertirNumero(req.query.limite, 10)));
        const offset = (pagina - 1) * limite;

        if (estado !== null && !Object.values(ESTADOS_INVENTARIO).includes(estado)) {
            return res.status(400).json({
                success: false,
                message: "Estado invalido. Los valores permitidos son del 1 al 5"
            });
        }

        const filtros = [];
        const valoresBase = [req.idTienda, tienda.dias_alerta_vencimiento, tienda.stock_minimo];

        if (categoriaId) {
            valoresBase.push(categoriaId);
            filtros.push(`categoria_id = $${valoresBase.length}`);
        }

        if (nombreProducto) {
            valoresBase.push(`%${nombreProducto}%`);
            filtros.push(`nombre ILIKE $${valoresBase.length}`);
        }

        if (perecible !== null) {
            valoresBase.push(perecible);
            filtros.push(`perecible = $${valoresBase.length}`);
        }

        if (estado !== null) {
            valoresBase.push(estado);
            filtros.push(`estado_inventario = $${valoresBase.length}`);
        }

        const whereFinal = filtros.length ? `WHERE ${filtros.join(" AND ")}` : "";

        const totalResult = await query(
            `${construirCteInventario()}
             SELECT COUNT(*)::INT AS total
             FROM inventario_estado
             ${whereFinal}`,
            valoresBase
        );

        const valoresListado = [...valoresBase, limite, offset];
        const result = await query(
            `${construirCteInventario()}
             SELECT *
             FROM inventario_estado
             ${whereFinal}
             ORDER BY estado_inventario ASC, fecha_registro DESC
             LIMIT $${valoresListado.length - 1}
             OFFSET $${valoresListado.length}`,
            valoresListado
        );

        const total = totalResult.rows[0]?.total || 0;

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Productos encontrados" : "No se encontraron productos",
            data: {
                productos: result.rows.map(formatearProductoInventario),
                paginacion: {
                    total,
                    pagina,
                    limite,
                    totalPaginas: Math.ceil(total / limite)
                }
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Error al filtrar productos"
        });
    }
};

const obtenerDetalleProducto = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const tienda = await obtenerConfiguracionTienda(req.idTienda);
        if (!tienda) {
            return res.status(404).json({
                success: false,
                message: "Tienda no encontrada"
            });
        }

        const estadoLote = normalizarTexto(req.query.estadoLote);
        const fechaDesde = normalizarTexto(req.query.fechaDesde);
        const fechaHasta = normalizarTexto(req.query.fechaHasta);

        const productoResult = await query(
            `${construirCteInventario()}
             SELECT *
             FROM inventario_estado
             WHERE id = $4
             LIMIT 1`,
            [req.idTienda, tienda.dias_alerta_vencimiento, tienda.stock_minimo, id]
        );

        if (!productoResult.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        const filtros = ["producto_id = $1", "estado = TRUE"];
        const valores = [id];

        if (fechaDesde) {
            valores.push(fechaDesde);
            filtros.push(`fecha_vencimiento::date >= $${valores.length}::date`);
        }

        if (fechaHasta) {
            valores.push(fechaHasta);
            filtros.push(`fecha_vencimiento::date <= $${valores.length}::date`);
        }

        const valoresLotes = [...valores, tienda.dias_alerta_vencimiento];
        const lotesResult = await query(
            `SELECT *
             FROM (
                SELECT
                    id,
                    ROW_NUMBER() OVER (ORDER BY fecha_ingreso ASC, id ASC) AS numero_lote,
                    stock_inicial,
                    stock_actual,
                    precio_compra,
                    fecha_ingreso,
                    fecha_vencimiento,
                    CASE
                        WHEN stock_actual <= 0 THEN 'Agotado'
                        WHEN fecha_vencimiento IS NOT NULL
                         AND stock_actual > 0
                         AND fecha_vencimiento::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($${valoresLotes.length}::INT * INTERVAL '1 day'))::date
                            THEN 'Por vencer pronto'
                        ELSE 'En buen estado'
                    END AS estado_lote
                FROM lotes_producto
                WHERE ${filtros.join(" AND ")}
             ) lotes
             ${estadoLote ? "WHERE estado_lote = $" + (valoresLotes.length + 1) : ""}
             ORDER BY fecha_ingreso ASC, id ASC`,
            estadoLote ? [...valoresLotes, estadoLote] : valoresLotes
        );

        const producto = productoResult.rows[0];

        return res.status(200).json({
            success: true,
            message: "Producto encontrado",
            data: {
                producto: {
                    ...formatearProductoInventario(producto),
                    precioVenta: decimal(producto.precio_venta),
                    codBarras: producto.cod_barras || null,
                    codInterno: producto.cod_interno,
                    perecible: producto.perecible,
                    lotes: lotesResult.rows.map(formatearLote)
                }
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Error al obtener detalle del producto"
        });
    }
};

const obtenerEstadosDisponibles = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const tienda = await obtenerConfiguracionTienda(req.idTienda);
        if (!tienda) {
            return res.status(404).json({
                success: false,
                message: "Tienda no encontrada"
            });
        }

        const result = await query(
            `${construirCteInventario()}
             SELECT DISTINCT estado_inventario
             FROM inventario_estado
             ORDER BY estado_inventario ASC`,
            [req.idTienda, tienda.dias_alerta_vencimiento, tienda.stock_minimo]
        );

        return res.status(200).json({
            success: true,
            message: "Estados disponibles",
            data: {
                estados: result.rows.map((row) => ({
                    valor: row.estado_inventario,
                    label: LABELS_ESTADO[row.estado_inventario]
                }))
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Error al obtener estados disponibles"
        });
    }
};

const obtenerEstadoProducto = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const tienda = await obtenerConfiguracionTienda(req.idTienda);
        if (!tienda) {
            return res.status(404).json({
                success: false,
                message: "Tienda no encontrada"
            });
        }

        const result = await query(
            `${construirCteInventario()}
             SELECT id, estado_inventario
             FROM inventario_estado
             WHERE id = $4
             LIMIT 1`,
            [req.idTienda, tienda.dias_alerta_vencimiento, tienda.stock_minimo, id]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Producto no encontrado"
            });
        }

        const estado = result.rows[0].estado_inventario;

        return res.status(200).json({
            success: true,
            message: "Estado del producto obtenido correctamente",
            data: {
                estado: {
                    valor: estado,
                    label: LABELS_ESTADO[estado]
                }
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Error al obtener estado del producto"
        });
    }
};

module.exports = {
    obtenerInventarioProductos,
    obtenerDetalleProducto,
    obtenerEstadoProducto,
    obtenerEstadosDisponibles
};
