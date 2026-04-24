const mongoose = require("mongoose");
const Operacion = require("../models/operation.model");
const Tienda = require("../models/store.model");
const LoteProducto = require("../models/batch.model");

const RAZONES_VALIDAS = ["Error logístico", "Producto dañado", "Traspaso", "Otro"];

const registrarOperacion = async (req, res) => {
    try {
        const { razon, descripcion, cantidad, loteId } = req.body;

        // Validaciones
        if (!razon || !cantidad || !loteId) {
            return res.status(400).json({
                success: false,
                message: "Todos los campos son requeridos"
            });
        }
        if (!RAZONES_VALIDAS.includes(razon)) {
            return res.status(400).json({
                success: false,
                message: `Razón inválida. Las válidas son: ${RAZONES_VALIDAS.join(", ")}`
            });
        }
        if (razon === "Otro" && (!descripcion || descripcion.trim() === "")) {
            return res.status(400).json({
                success: false,
                message: "La descripción es requerida cuando la razón es 'Otro'"
            });
        }
        if (cantidad <= 0) {
            return res.status(400).json({
                success: false,
                message: "La cantidad debe ser mayor a 0"
            });
        }

        const tienda = await Tienda.findById(req.idTienda);
        if (!tienda) {
            return res.status(404).json({ success: false, message: "Tienda no encontrada" });
        }

        const lote = await LoteProducto.findById(loteId).populate("Producto");
        if (!lote) {
            return res.status(404).json({ success: false, message: "Lote no encontrado" });
        }
        if (lote.Producto.Tienda.toString() !== tienda._id.toString()) {
            return res.status(403).json({ success: false, message: "El lote no pertenece a esta tienda" });
        }
        if (cantidad > lote.stockActual) {
            return res.status(400).json({
                success: false,
                message: `Stock insuficiente. Solo hay ${lote.stockActual} unidades disponibles`
            });
        }

        const producto = lote.Producto;
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const [operacionCreada] = await Promise.all([
                Operacion.create([{
                    razon,
                    descripcion: razon === "Otro" ? descripcion.trim() : null,
                    cantidad,
                    Tienda: tienda._id,
                    lote: {
                        loteId: lote._id,
                        producto: {
                            productoId: producto._id,
                            nombre: producto.nombre,
                            medida: producto.medida,
                            codigoInterno: producto.codigoInterno,
                            codigoBarras: producto.codigoBarras || null
                        }
                    }
                }], { session }),

                LoteProducto.findByIdAndUpdate(
                    loteId,
                    { $inc: { stockActual: -cantidad } },
                    { session }
                )
            ]);

            await session.commitTransaction();

            return res.status(201).json({
                success: true,
                message: "Operación registrada correctamente",
                data: {
                    id: operacionCreada._id,
                    razon: operacionCreada.razon,
                    descripcion: operacionCreada.descripcion,
                    cantidad: operacionCreada.cantidad,
                    stockRestante: lote.stockActual - cantidad,
                    producto: {
                        nombre: producto.nombre,
                        codigoInterno: producto.codigoInterno
                    }
                }
            });

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }

    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Error al registrar operación"
        });
    }
};

module.exports = { registrarOperacion };