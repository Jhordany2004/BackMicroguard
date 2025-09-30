const MetodoPago = require('../models/payment.model');
const Tienda = require('../models/store.model');

const registrarMetodoPago = async (req, res) => {
    try {
        const { nombre} = req.body;
        const usuario = req.usuarioId;      

        if (!nombre) {
        return res
            .status(400)
            .json({ message: "El campo de nombre es obligatorios" });
        }

        const tienda = await Tienda.findOne({ Usuario: usuario });
            if (!tienda) {
                return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        const existe = await MetodoPago.findOne({ "nombre": nombre });
        if (existe) {
            return res
            .status(409)
            .json({ message: "Ya existe un metodo de pago con ese nombre" });
        }          

        const metodoPago = new MetodoPago({        
        nombre,
        Tienda: tienda._id        
        });
        await metodoPago.save();

        res.status(201).json({
        message: "Metodo de pago registrado exitosamente",
        nombre,
        Tienda: tienda._id        
        });
    } catch (error) {
        const errorMessage = error.message || "Error al registrar el metodo de pago";
        console.log("Error Back-End:", errorMessage);
        res.status(500).json({ message: errorMessage });
    }
};

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
    registrarMetodoPago,
    listarMetodoPago,
    obtenerMetodoPago
};