const { query } = require("../config/database");

const OPERATION_SELECT = `
    SELECT
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
`;

const findLotForOperation = async (client, loteId, tiendaId) => {
    const result = await client.query(
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
        [loteId, tiendaId]
    );

    return result.rows[0] || null;
};

const decreaseLotStock = async (client, loteId, cantidad) => {
    await client.query(
        `UPDATE lotes_producto
         SET stock_actual = stock_actual - $1,
             fecha_modificacion = NOW()
         WHERE id = $2`,
        [cantidad, loteId]
    );
};

const create = async (client, { tiendaId, usuarioId, lote, razon, descripcion, cantidad }) => {
    const result = await client.query(
        `INSERT INTO operaciones_inventario (
            tienda_id,
            usuario_id,
            lote_id,
            producto_id,
            razon,
            descripcion,
            cantidad
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [
            tiendaId,
            usuarioId,
            lote.id,
            lote.producto_id,
            razon,
            razon === "Otro" ? descripcion : null,
            cantidad
        ]
    );

    return result.rows[0];
};

const findByIdAndStore = async (operationId, tiendaId) => {
    const result = await query(
        `${OPERATION_SELECT}
         WHERE oi.id = $1 AND oi.tienda_id = $2
         LIMIT 1`,
        [operationId, tiendaId]
    );

    return result.rows[0] || null;
};

const findAllByStore = async (tiendaId) => {
    const result = await query(
        `${OPERATION_SELECT}
         WHERE oi.tienda_id = $1
         ORDER BY oi.fecha_registro DESC
         LIMIT 100`,
        [tiendaId]
    );

    return result.rows;
};

module.exports = {
    findLotForOperation,
    decreaseLotStock,
    create,
    findByIdAndStore,
    findAllByStore
};
