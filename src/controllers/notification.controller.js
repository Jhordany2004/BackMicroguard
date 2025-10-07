const Store = require("../models/store.model");
const { notificarLotesCriticos } = require("../services/notification.service");

const enviarNotificaciones = async (req, res) => {
    try {
        // Buscar la tienda asociada al usuario autenticado
        const tienda = await Store.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ 
                success: false,
                message: "Tienda no encontrada para el usuario" 
            });
        }

        // Llama al servicio de notificaciones con el ID de la tienda
        const resultado = await notificarLotesCriticos(tienda._id);

        if (resultado.lotesNotificados.length > 0) {
            res.json({
                success: true,
                message: "Notificaciones enviadas correctamente",
                data: {
                    lotesNotificados: resultado.lotesNotificados,
                    totalLotes: resultado.lotesNotificados.length,
                    estadisticas: resultado.estadisticas
                }
            });
        } else {
            res.json({ 
                success: true,
                message: "No hay lotes críticos para notificar",
                data: {
                    lotesNotificados: [],
                    totalLotes: 0
                }
            });
        }
    } catch (error) {
        console.error('Error en enviarNotificaciones:', error);
        res.status(500).json({ 
            success: false,
            message: "Error al enviar notificaciones",
            error: error.message 
        });
    }
};

module.exports = { enviarNotificaciones };