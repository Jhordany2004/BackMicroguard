const { query } = require("../config/database");

const SALE_SELECT = `
    SELECT
        v.id,
        v.cliente_id,
        cl.nombres AS cliente_nombres,
        cl.apellidos AS cliente_apellidos,
        cl.razon_social AS cliente_razon_social,
        cl.documento AS cliente_documento,
        v.metodo_pago_id,
        mp.nombre AS metodo_pago_nombre,
        v.precio_total,
        v.tipo_comprobante,
        v.serie,
        v.correlativo,
        v.estado,
        v.fecha_registro,
        v.fecha_modificacion
    FROM ventas v
    LEFT JOIN clientes cl ON cl.id = v.cliente_id
    INNER JOIN metodos_pago mp ON mp.id = v.metodo_pago_id
`;

const findCustomer = async (client, clienteId, tiendaId) => {
    if (!clienteId) return null;

    const result = await client.query(
        `SELECT id, nombres, apellidos, razon_social, documento
         FROM clientes
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1`,
        [clienteId, tiendaId]
    );

    return result.rows[0] || null;
};

const findPaymentMethod = async (client, metodoPagoId, tiendaId) => {
    const result = await client.query(
        `SELECT id, nombre
         FROM metodos_pago
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1`,
        [metodoPagoId, tiendaId]
    );

    return result.rows[0] || null;
};

const findLotForSale = async (client, loteId, tiendaId) => {
    const result = await client.query(
        `SELECT
            l.id,
            l.producto_id,
            l.stock_actual,
            p.nombre AS producto_nombre,
            p.cod_barras,
            p.medida,
            p.precio_venta
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

const createSale = async (client, data) => {
    const result = await client.query(
        `INSERT INTO ventas (
            tienda_id,
            usuario_id,
            cliente_id,
            metodo_pago_id,
            tipo_comprobante,
            serie,
            correlativo,
            precio_total
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
            data.tiendaId,
            data.usuarioId,
            data.clienteId,
            data.metodoPagoId,
            data.tipoComprobante,
            data.serie,
            data.correlativo,
            data.precioTotal
        ]
    );

    return result.rows[0];
};

const createSaleDetail = async (client, saleId, detail) => {
    await client.query(
        `INSERT INTO detalle_ventas (
            venta_id,
            lote_id,
            producto_id,
            cantidad,
            precio_unitario,
            precio_total,
            prod_nombre,
            prod_medida,
            prod_cod_barras
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            saleId,
            detail.loteId,
            detail.productoId,
            detail.cantidad,
            detail.precioUnitario,
            detail.precioTotal,
            detail.prodNombre,
            detail.prodMedida,
            detail.prodCodBarras
        ]
    );
};

const findSaleByIdAndStore = async (saleId, tiendaId) => {
    const result = await query(
        `${SALE_SELECT}
         WHERE v.id = $1 AND v.tienda_id = $2
         LIMIT 1`,
        [saleId, tiendaId]
    );

    return result.rows[0] || null;
};

const findSaleDetails = async (saleId) => {
    const result = await query(
        `SELECT
            dv.id,
            dv.lote_id,
            dv.producto_id,
            dv.prod_nombre,
            dv.prod_medida,
            dv.prod_cod_barras,
            dv.cantidad,
            dv.precio_unitario,
            dv.precio_total,
            dv.fecha_registro
         FROM detalle_ventas dv
         WHERE dv.venta_id = $1
         ORDER BY dv.id ASC`,
        [saleId]
    );

    return result.rows;
};

const findAllByStore = async (tiendaId) => {
    const result = await query(
        `${SALE_SELECT}
         WHERE v.tienda_id = $1
         ORDER BY v.fecha_registro DESC
         LIMIT 100`,
        [tiendaId]
    );

    return result.rows;
};

const updateStatus = async ({ id, tiendaId, estado }) => {
    const result = await query(
        `UPDATE ventas
         SET estado = $1,
             fecha_modificacion = NOW()
         WHERE id = $2 AND tienda_id = $3
         RETURNING id`,
        [estado, id, tiendaId]
    );

    return result.rows[0] || null;
};

module.exports = {
    findCustomer,
    findPaymentMethod,
    findLotForSale,
    decreaseLotStock,
    createSale,
    createSaleDetail,
    findSaleByIdAndStore,
    findSaleDetails,
    findAllByStore,
    updateStatus
};
