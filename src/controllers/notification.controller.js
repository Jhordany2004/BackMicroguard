const Store = require("../models/store.model");
const { notificarLotesCriticos } = require("../services/notification.service");

const enviarNotificaciones = async (req, res) => {
    try {
        // Buscar la tienda asociada al usuario autenticado
        const tienda = await Store.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        // Llama al servicio de notificaciones con el ID de la tienda
        await notificarLotesCriticos(tienda._id);

        res.json({ message: "Notificaciones enviadas" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { enviarNotificaciones };