const Operacion = require("../models/operation.model");
const Tienda = require("../models/store.model");
const LoteProducto = require("../models/batch.model");
const Producto = require("../models/product.model");

//Se ejecuta para registrar una operacion de un lote (producto) , para el control del inventario.
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

        const lote = await LoteProducto.findById(loteId).populate('Producto');
        if (!lote) {
            return res.status(404).json({ message: "Lote de producto no encontrado" });
        }

        // Obtener datos del producto para denormalización
        const producto = lote.Producto || {};

        const nuevaOperacion = new Operacion({
            razon,
            descripcion,
            cantidad,
            Tienda: tienda._id,
            lote: {
                loteId: lote._id,
                producto: {
                    productoId: producto._id,
                    nombre: producto.nombre,
                    medida: producto.medida,
                    codigoBarras: producto.codigoBarras
                }
            },
            estado: true
        });

        await nuevaOperacion.save();

        return res.status(201).json({
            success: true,
            message: "Operación registrada correctamente",
            data: nuevaOperacion
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Error al registrar operación" });
    }
};

module.exports = {
    registrarOperacion
};