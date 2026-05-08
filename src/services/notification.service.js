const admin = require("../config/firebase");
const { query } = require("../config/database");

const obtenerLotesCriticos = async (tiendaId) => {
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

    return result.rows.map((lote) => ({
        tipo: lote.tipo,
        producto: lote.producto_nombre,
        productoId: lote.producto_id,
        loteId: lote.lote_id,
        stock: Number(lote.stock_actual),
        fechaVencimiento: lote.fecha_vencimiento,
        diasRestantes: lote.dias_restantes === null ? null : Number(lote.dias_restantes)
    }));
};

const obtenerTokensTienda = async (tiendaId) => {
    const result = await query(
        `SELECT tf.token
         FROM tokens_fcm tf
         INNER JOIN usuarios u ON u.id = tf.usuario_id
         WHERE u.tienda_id = $1
           AND u.estado = TRUE`,
        [tiendaId]
    );

    return result.rows.map((row) => row.token).filter(Boolean);
};

const eliminarTokensInvalidos = async (tokensInvalidos) => {
    if (!tokensInvalidos.length) return;

    await query(
        `DELETE FROM tokens_fcm
         WHERE token = ANY($1::TEXT[])`,
        [tokensInvalidos]
    );
};

const construirPayload = (lote, tiendaId, tokens) => ({
    notification: {
        title: lote.tipo === "stock"
            ? `Stock bajo: ${lote.producto}`
            : `Proximo a vencer: ${lote.producto}`,
        body: lote.tipo === "stock"
            ? `Stock actual: ${lote.stock}`
            : `Dias restantes: ${lote.diasRestantes}`
    },
    data: {
        tipo: lote.tipo,
        loteId: String(lote.loteId),
        productoId: String(lote.productoId),
        tiendaId: String(tiendaId)
    },
    tokens
});

const notificarLotesCriticos = async (tiendaId) => {
    const lotesNotificar = await obtenerLotesCriticos(tiendaId);

    if (!lotesNotificar.length) {
        return {
            lotesNotificados: [],
            tokensEnviados: [],
            estadisticas: {
                totalEnviados: 0,
                totalFallidos: 0,
                tokensInvalidos: 0
            }
        };
    }

    const tokens = await obtenerTokensTienda(tiendaId);

    if (!tokens.length) {
        return {
            lotesNotificados: lotesNotificar,
            tokensEnviados: [],
            estadisticas: {
                totalEnviados: 0,
                totalFallidos: 0,
                tokensInvalidos: 0
            }
        };
    }

    let totalEnviados = 0;
    let totalFallidos = 0;
    const tokensInvalidos = new Set();

    for (const lote of lotesNotificar) {
        try {
            const response = await admin.messaging().sendEachForMulticast(
                construirPayload(lote, tiendaId, tokens)
            );

            totalEnviados += response.successCount;
            totalFallidos += response.failureCount;

            response.responses.forEach((item, index) => {
                if (!item.success) {
                    const errorCode = item.error?.code;
                    if (
                        errorCode === "messaging/invalid-registration-token" ||
                        errorCode === "messaging/registration-token-not-registered"
                    ) {
                        tokensInvalidos.add(tokens[index]);
                    }
                }
            });
        } catch (_error) {
            totalFallidos += tokens.length;
        }
    }

    await eliminarTokensInvalidos([...tokensInvalidos]);

    return {
        lotesNotificados: lotesNotificar,
        tokensEnviados: tokens,
        estadisticas: {
            totalEnviados,
            totalFallidos,
            tokensInvalidos: tokensInvalidos.size
        }
    };
};

module.exports = {
    notificarLotesCriticos
};
