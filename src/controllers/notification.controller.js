const { notificarLotesCriticos } = require("../services/notification.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { success } = require("../utils/handleResponse");
const { requireStore } = require("../utils/validators");

const enviarNotificaciones = asyncHandler(async (req, res) => {
    const resultado = await notificarLotesCriticos(requireStore(req));
    const totalLotes = resultado.lotesNotificados.length;

    return success(res, {
        message: totalLotes ? "Notificaciones enviadas correctamente" : "No hay lotes criticos para notificar",
        data: {
            lotesNotificados: resultado.lotesNotificados,
            totalLotes,
            estadisticas: resultado.estadisticas
        }
    });
});

module.exports = { enviarNotificaciones };
