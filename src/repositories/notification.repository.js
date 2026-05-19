const { query } = require("../config/database");

const findCriticalLotsByStore = async (tiendaId) => {
    const result = await query(
        `WITH config AS (
            SELECT stock_minimo, dias_alerta_vencimiento
            FROM tiendas
            WHERE id = $1 AND estado = TRUE
            LIMIT 1
         )
         SELECT
            l.id AS lote_id,
            l.stock_actual,
            l.fecha_vencimiento,
            p.id AS producto_id,
            p.nombre AS producto_nombre,
            CASE
                WHEN l.stock_actual <= (SELECT stock_minimo FROM config) THEN 'stock'
                WHEN p.perecible = TRUE
                 AND l.fecha_vencimiento IS NOT NULL
                 AND l.fecha_vencimiento::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ((SELECT dias_alerta_vencimiento FROM config)::INT * INTERVAL '1 day'))::date
                    THEN 'vencimiento'
                ELSE NULL
            END AS tipo,
            CASE
                WHEN l.fecha_vencimiento IS NULL THEN NULL
                ELSE (l.fecha_vencimiento::date - CURRENT_DATE)
            END AS dias_restantes
         FROM lotes_producto l
         INNER JOIN productos p ON p.id = l.producto_id
         WHERE p.tienda_id = $1
           AND p.estado = TRUE
           AND l.estado = TRUE
           AND l.stock_actual > 0
           AND (
                l.stock_actual <= (SELECT stock_minimo FROM config)
                OR (
                    p.perecible = TRUE
                    AND l.fecha_vencimiento IS NOT NULL
                    AND l.fecha_vencimiento::date BETWEEN CURRENT_DATE AND (CURRENT_DATE + ((SELECT dias_alerta_vencimiento FROM config)::INT * INTERVAL '1 day'))::date
                )
           )
         ORDER BY tipo ASC, l.fecha_vencimiento ASC NULLS LAST, p.nombre ASC
         LIMIT 100`,
        [tiendaId]
    );

    return result.rows;
};

const findTokensByStore = async (tiendaId) => {
    const result = await query(
        `SELECT tf.token
         FROM tokens_fcm tf
         INNER JOIN usuarios u ON u.id = tf.usuario_id
         WHERE u.tienda_id = $1
           AND u.estado = TRUE`,
        [tiendaId]
    );

    return result.rows;
};

const deleteInvalidTokens = async (tokens) => {
    if (!tokens.length) return;

    await query(
        `DELETE FROM tokens_fcm
         WHERE token = ANY($1::TEXT[])`,
        [tokens]
    );
};

module.exports = {
    findCriticalLotsByStore,
    findTokensByStore,
    deleteInvalidTokens
};
