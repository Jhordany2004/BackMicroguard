const { query } = require("../config/database");

const buildInventoryCte = () => `
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

const findStoreConfig = async (tiendaId) => {
    const result = await query(
        `SELECT stock_minimo, dias_alerta_vencimiento
         FROM tiendas
         WHERE id = $1 AND estado = TRUE
         LIMIT 1`,
        [tiendaId]
    );

    return result.rows[0] || null;
};

const searchProducts = async ({ values, filters, limit, offset }) => {
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const totalResult = await query(
        `${buildInventoryCte()}
         SELECT COUNT(*)::INT AS total
         FROM inventario_estado
         ${where}`,
        values
    );

    const listValues = [...values, limit, offset];
    const result = await query(
        `${buildInventoryCte()}
         SELECT *
         FROM inventario_estado
         ${where}
         ORDER BY estado_inventario ASC, fecha_registro DESC
         LIMIT $${listValues.length - 1}
         OFFSET $${listValues.length}`,
        listValues
    );

    return {
        rows: result.rows,
        total: totalResult.rows[0]?.total || 0
    };
};

const findProductInventory = async ({ tiendaId, config, productId }) => {
    const result = await query(
        `${buildInventoryCte()}
         SELECT *
         FROM inventario_estado
         WHERE id = $4
         LIMIT 1`,
        [tiendaId, config.dias_alerta_vencimiento, config.stock_minimo, productId]
    );

    return result.rows[0] || null;
};

const findProductLots = async ({ productId, alertDays, filters, values, estadoLote }) => {
    const lotValues = [...values, alertDays];
    const result = await query(
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
                     AND fecha_vencimiento::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ($${lotValues.length}::INT * INTERVAL '1 day'))::date
                        THEN 'Por vencer pronto'
                    ELSE 'En buen estado'
                END AS estado_lote
            FROM lotes_producto
            WHERE ${filters.join(" AND ")}
         ) lotes
         ${estadoLote ? "WHERE estado_lote = $" + (lotValues.length + 1) : ""}
         ORDER BY fecha_ingreso ASC, id ASC`,
        estadoLote ? [...lotValues, estadoLote] : lotValues
    );

    return result.rows;
};

const findAvailableStates = async ({ tiendaId, config }) => {
    const result = await query(
        `${buildInventoryCte()}
         SELECT DISTINCT estado_inventario
         FROM inventario_estado
         ORDER BY estado_inventario ASC`,
        [tiendaId, config.dias_alerta_vencimiento, config.stock_minimo]
    );

    return result.rows;
};

const findProductState = async ({ tiendaId, config, productId }) => {
    const result = await query(
        `${buildInventoryCte()}
         SELECT id, estado_inventario
         FROM inventario_estado
         WHERE id = $4
         LIMIT 1`,
        [tiendaId, config.dias_alerta_vencimiento, config.stock_minimo, productId]
    );

    return result.rows[0] || null;
};

module.exports = {
    findStoreConfig,
    searchProducts,
    findProductInventory,
    findProductLots,
    findAvailableStates,
    findProductState
};
