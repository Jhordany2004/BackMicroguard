const MetodoPago = require('../models/payment.model');
const Tienda = require('../models/store.model');

const listarMetodoPago = async (req, res) => {
    try {
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const metodoActivo = await MetodoPago.find({ Tienda: tienda._id});
        if (!metodoActivo.length) {
            return res.status(404).json({ message: "No hay metodos de pago activos" });
        }
        res.json(metodoActivo);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener metodos de pago" });
    }
};

const obtenerMetodoPago = async (req, res) => {
    try {
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const metodoActivo = await MetodoPago.find({ Tienda: tienda._id, estado: true });
        if (!metodoActivo.length) {
            return res.status(404).json({ message: "No hay metodos de pago activo o registre uno" });
        }
        res.json(metodoActivo);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener metodos de pago" });
    }
};

module.exports = {
    listarMetodoPago,
    obtenerMetodoPago
};