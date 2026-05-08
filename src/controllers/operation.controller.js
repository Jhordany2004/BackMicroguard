const { pool, query } = require("../config/database");

const RAZONES_VALIDAS = ["Error logistico", "Producto danado", "Traspaso", "Otro"];

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";
const convertirNumero = (valor) => {
    if (valor === null || valor === undefined || valor === "") return null;

    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
};
const decimal = (valor) => valor === null || valor === undefined ? null : Number(valor);

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

const formatearOperacion = (operacion) => ({
    id: operacion.id,
    razon: operacion.razon,
    descripcion: operacion.descripcion || null,
    cantidad: decimal(operacion.cantidad),
    loteId: operacion.lote_id,
    producto: {
        id: operacion.producto_id,
        nombre: operacion.producto_nombre,
        codInterno: operacion.cod_interno,
        codBarras: operacion.cod_barras
    },
    estado: operacion.estado,
    fechaRegistro: operacion.fecha_registro,
    fechaModificacion: operacion.fecha_modificacion
});

const obtenerOperacion = async (operacionId, tiendaId) => {
    const result = await query(
        `SELECT
            oi.id,
            oi.razon,
            oi.descripcion,
            oi.cantidad,
            oi.lote_id,
            oi.producto_id,
            p.nombre AS producto_nombre,
            p.cod_interno,
            p.cod_barras,
            oi.estado,
            oi.fecha_registro,
            oi.fecha_modificacion
         FROM operaciones_inventario oi
         INNER JOIN productos p ON p.id = oi.producto_id
         WHERE oi.id = $1 AND oi.tienda_id = $2
         LIMIT 1`,
        [operacionId, tiendaId]
    );

    return result.rows[0] || null;
};

const registrarOperacion = async (req, res) => {
    const client = await pool.connect();

    try {
        if (!validarTienda(req, res)) return;

        const razon = normalizarTexto(req.body.razon);
        const descripcion = normalizarTexto(req.body.descripcion);
        const cantidad = convertirNumero(req.body.cantidad);
        const loteId = convertirNumero(req.body.loteId ?? req.body.lote_id);

        if (!razon || !cantidad || !loteId) {
            return res.status(400).json({
                success: false,
                message: "Razon, cantidad y lote son obligatorios"
            });
        }

        if (!RAZONES_VALIDAS.includes(razon)) {
            return res.status(400).json({
                success: false,
                message: `Razon invalida. Las validas son: ${RAZONES_VALIDAS.join(", ")}`
            });
        }

        if (razon === "Otro" && !descripcion) {
            return res.status(400).json({
                success: false,
                message: "La descripcion es obligatoria cuando la razon es Otro"
            });
        }

        if (cantidad <= 0) {
            return res.status(400).json({
                success: false,
                message: "La cantidad debe ser mayor a cero"
            });
        }

        await client.query("BEGIN");

        const loteResult = await client.query(
            `SELECT
                l.id,
                l.producto_id,
                l.stock_actual,
                p.nombre AS producto_nombre,
                p.cod_interno,
                p.cod_barras
             FROM lotes_producto l
             INNER JOIN productos p ON p.id = l.producto_id
             WHERE l.id = $1
               AND p.tienda_id = $2
               AND l.estado = TRUE
               AND p.estado = TRUE
             LIMIT 1
             FOR UPDATE OF l`,
            [loteId, req.idTienda]
        );

        if (!loteResult.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Lote no encontrado"
            });
        }

        const lote = loteResult.rows[0];

        if (Number(lote.stock_actual) < cantidad) {
            await client.query("ROLLBACK");
            return res.status(400).json({
                success: false,
                message: `Stock insuficiente. Stock actual: ${Number(lote.stock_actual)}`
            });
        }

        await client.query(
            `UPDATE lotes_producto
             SET stock_actual = stock_actual - $1,
                 fecha_modificacion = NOW()
             WHERE id = $2`,
            [cantidad, lote.id]
        );

        const operacionResult = await client.query(
            `INSERT INTO operaciones_inventario (
                tienda_id,
                lote_id,
                producto_id,
                razon,
                descripcion,
                cantidad
             )
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id`,
            [
                req.idTienda,
                lote.id,
                lote.producto_id,
                razon,
                razon === "Otro" ? descripcion : null,
                cantidad
            ]
        );

        await client.query("COMMIT");

        const operacion = await obtenerOperacion(operacionResult.rows[0].id, req.idTienda);

        return res.status(201).json({
            success: true,
            message: "Operacion registrada correctamente",
            data: {
                operacion: formatearOperacion(operacion),
                stockRestante: Number(lote.stock_actual) - cantidad
            }
        });
    } catch (error) {
        await client.query("ROLLBACK");
        return res.status(500).json({
            success: false,
            message: error.message || "Error al registrar operacion"
        });
    } finally {
        client.release();
    }
};

const listarOperaciones = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const result = await query(
            `SELECT
                oi.id,
                oi.razon,
                oi.descripcion,
                oi.cantidad,
                oi.lote_id,
                oi.producto_id,
                p.nombre AS producto_nombre,
                p.cod_interno,
                p.cod_barras,
                oi.estado,
                oi.fecha_registro,
                oi.fecha_modificacion
             FROM operaciones_inventario oi
             INNER JOIN productos p ON p.id = oi.producto_id
             WHERE oi.tienda_id = $1
             ORDER BY oi.fecha_registro DESC
             LIMIT 100`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Operaciones obtenidas correctamente" : "No hay operaciones registradas",
            data: { operaciones: result.rows.map(formatearOperacion) }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Error al listar operaciones"
        });
    }
};

module.exports = {
    registrarOperacion,
    listarOperaciones
};
