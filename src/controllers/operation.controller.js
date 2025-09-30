const Operacion = require("../models/operation.model");
const Tienda = require("../models/store.model");
const LoteProducto = require("../models/batch.model");

const registrarOperacion = async (req, res) => {
    try {
        const { razon, descripcion, cantidad, LoteProducto: loteId } = req.body;
        const usuario = req.usuarioId;

        if (!razon || !descripcion || !cantidad || !loteId) {
            return res.status(400).json({ message: "Todos los campos son requeridos" });
        }

        const tienda = await Tienda.findOne({ Usuario: usuario });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        const lote = await LoteProducto.findById(loteId);
        if (!lote) {
            return res.status(404).json({ message: "Lote de producto no encontrado" });
        }

        const nuevaOperacion = new Operacion({
            razon,
            descripcion,
            cantidad,
            Tienda: tienda._id,
            LoteProducto: loteId,
            estado: true
        });

        await nuevaOperacion.save();

        res.status(201).json({ message: "Operación registrada correctamente", operacion: nuevaOperacion });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al registrar operación" });
    }
};

module.exports = {
    registrarOperacion
};