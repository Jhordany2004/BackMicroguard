const admin = require("../config/firebase");
const notificationRepository = require("../repositories/notification.repository");

const obtenerLotesCriticos = async (tiendaId) => {
    const lots = await notificationRepository.findCriticalLotsByStore(tiendaId);

    return lots.map((lote) => ({
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
    const tokens = await notificationRepository.findTokensByStore(tiendaId);

    return tokens.map((row) => row.token).filter(Boolean);
};

const eliminarTokensInvalidos = async (tokensInvalidos) => {
    await notificationRepository.deleteInvalidTokens(tokensInvalidos);
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
