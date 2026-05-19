const { query } = require("../config/database");

const PURCHASE_SELECT = `
    SELECT
        c.id,
        c.proveedor_id,
        p.razon_social AS proveedor_razon_social,
        c.precio_total,
        c.estado,
        c.fecha_registro,
        c.fecha_modificacion
    FROM compras c
    INNER JOIN proveedores p ON p.id = c.proveedor_id
`;

const findSupplier = async (client, proveedorId, tiendaId) => {
    const result = await client.query(
        `SELECT id, razon_social
         FROM proveedores
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1`,
        [proveedorId, tiendaId]
    );

    return result.rows[0] || null;
};

const categoryExists = async (client, categoriaId, tiendaId) => {
    const result = await client.query(
        `SELECT id
         FROM categorias
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1`,
        [categoriaId, tiendaId]
    );

    return result.rows.length > 0;
};

const findProductById = async (client, productoId, tiendaId) => {
    const result = await client.query(
        `SELECT *
         FROM productos
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1
         FOR UPDATE`,
        [productoId, tiendaId]
    );

    return result.rows[0] || null;
};

const findProductByBarcode = async (client, tiendaId, codBarras) => {
    const result = await client.query(
        `SELECT *
         FROM productos
         WHERE tienda_id = $1 AND cod_barras = $2 AND estado = TRUE
         LIMIT 1
         FOR UPDATE`,
        [tiendaId, codBarras]
    );

    return result.rows[0] || null;
};

const findProductByPresentation = async (client, tiendaId, detail) => {
    const result = await client.query(
        `SELECT *
         FROM productos
         WHERE tienda_id = $1
           AND nombre = $2
           AND categoria_id = $3
           AND cantidad_medida IS NOT DISTINCT FROM $4
           AND medida IS NOT DISTINCT FROM $5
           AND estado = TRUE
         LIMIT 1
         FOR UPDATE`,
        [tiendaId, detail.nombre, detail.categoriaId, detail.cantidadMedida, detail.medida]
    );

    return result.rows[0] || null;
};

const createProduct = async (client, detail, tiendaId, generatedCode) => {
    const result = await client.query(
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
         RETURNING *`,
        [
            tiendaId,
            detail.categoriaId,
            detail.nombre,
            detail.codBarras,
            detail.codInterno || generatedCode,
            detail.imagenUrl,
            detail.cantidadMedida,
            detail.medida,
            detail.precioVentaUnidad,
            detail.perecible
        ]
    );

    return result.rows[0];
};

const updateProduct = async (client, product, detail) => {
    const result = await client.query(
        `UPDATE productos
         SET precio_venta = $1,
             perecible = $2,
             cod_barras = COALESCE(cod_barras, $3),
             imagen_url = COALESCE(imagen_url, $4),
             fecha_modificacion = NOW()
         WHERE id = $5
         RETURNING *`,
        [
            detail.precioVentaUnidad,
            detail.perecible,
            detail.codBarras,
            detail.imagenUrl,
            product.id
        ]
    );

    return result.rows[0];
};

const createLot = async (client, detail, productId) => {
    const result = await client.query(
        `INSERT INTO lotes_producto (
            producto_id,
            stock_inicial,
            stock_actual,
            precio_compra,
            fecha_ingreso,
            fecha_vencimiento
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
            productId,
            detail.cantidadComprada,
            detail.cantidadComprada,
            detail.precioCompraUnidad,
            detail.fechaIngreso,
            detail.fechaVencimiento
        ]
    );

    return result.rows[0];
};

const createPurchase = async (client, data) => {
    const result = await client.query(
        `INSERT INTO compras (tienda_id, proveedor_id, usuario_id, precio_total)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [data.tiendaId, data.proveedorId, data.usuarioId, data.precioTotal]
    );

    return result.rows[0];
};

const createPurchaseDetail = async (client, purchaseId, detail) => {
    await client.query(
        `INSERT INTO detalle_compras (
            compra_id,
            lote_id,
            producto_id,
            cantidad_comprada,
            precio_unitario,
            precio_total,
            prod_nombre,
            prod_medida,
            prod_cod_barras
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
            purchaseId,
            detail.loteId,
            detail.productoId,
            detail.cantidadComprada,
            detail.precioUnitario,
            detail.precioTotal,
            detail.prodNombre,
            detail.prodMedida,
            detail.prodCodBarras
        ]
    );
};

const findPurchaseByIdAndStore = async (purchaseId, tiendaId) => {
    const result = await query(
        `${PURCHASE_SELECT}
         WHERE c.id = $1 AND c.tienda_id = $2
         LIMIT 1`,
        [purchaseId, tiendaId]
    );

    return result.rows[0] || null;
};

const findPurchaseDetails = async (purchaseId) => {
    const result = await query(
        `SELECT
            id,
            lote_id,
            producto_id,
            cantidad_comprada,
            precio_unitario,
            precio_total,
            prod_nombre,
            prod_medida,
            prod_cod_barras,
            fecha_registro
         FROM detalle_compras
         WHERE compra_id = $1
         ORDER BY id ASC`,
        [purchaseId]
    );

    return result.rows;
};

const findAllByStore = async (tiendaId) => {
    const result = await query(
        `${PURCHASE_SELECT}
         WHERE c.tienda_id = $1
         ORDER BY c.fecha_registro DESC
         LIMIT 100`,
        [tiendaId]
    );

    return result.rows;
};

const updateStatus = async ({ id, tiendaId, estado }) => {
    const result = await query(
        `UPDATE compras
         SET estado = $1,
             fecha_modificacion = NOW()
         WHERE id = $2 AND tienda_id = $3
         RETURNING id`,
        [estado, id, tiendaId]
    );

    return result.rows[0] || null;
};

module.exports = {
    findSupplier,
    categoryExists,
    findProductById,
    findProductByBarcode,
    findProductByPresentation,
    createProduct,
    updateProduct,
    createLot,
    createPurchase,
    createPurchaseDetail,
    findPurchaseByIdAndStore,
    findPurchaseDetails,
    findAllByStore,
    updateStatus
};
