const { notificarLotesCriticos } = require("../services/notification.service");

const enviarNotificaciones = async (req, res) => {
    try {
        if (!req.idTienda) {
            return res.status(403).json({
                success: false,
                message: "Usuario sin tienda asociada"
            });
        }

        const resultado = await notificarLotesCriticos(req.idTienda);
        const totalLotes = resultado.lotesNotificados.length;

        return res.status(200).json({
            success: true,
            message: totalLotes ? "Notificaciones enviadas correctamente" : "No hay lotes criticos para notificar",
            data: {
                lotesNotificados: resultado.lotesNotificados,
                totalLotes,
                estadisticas: resultado.estadisticas
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Error al enviar notificaciones"
        });
    }
};

module.exports = { enviarNotificaciones };
