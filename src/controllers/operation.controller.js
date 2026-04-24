const Operacion = require("../models/operation.model");
const Tienda = require("../models/store.model");
const LoteProducto = require("../models/batch.model");

const RAZONES_VALIDAS = ["Error logístico", "Producto dañado", "Traspaso", "Otro"];

const registrarOperacion = async (req, res) => {
    try {
        const { razon, descripcion, cantidad, loteId } = req.body;        

        // Validaciones
        if (!razon || !descripcion || !cantidad || !loteId) {
            return res.status(400).json({ success: false, message: "Todos los campos son requeridos" });
        }
        if (!RAZONES_VALIDAS.includes(razon)) {
            return res.status(400).json({ 
                success: false,
                message: `Razón inválida. Las válidas son: ${RAZONES_VALIDAS.join(", ")}` 
            });
        }
        if (cantidad <= 0) {
            return res.status(400).json({ success: false,message: "La cantidad debe ser mayor a 0" });
        }

        const tienda = await Tienda.findById({idTienda});
        if (!tienda) {
            return res.status(404).json({ success: false, message: "Tienda no encontrada" });
        }

        const lote = await LoteProducto.findById(loteId).populate("Producto");
        if (!lote) {
            return res.status(404).json({ success: false, message: "Lote no encontrado" });
        }

        // Validar que el lote pertenece a la tienda
        if (lote.Producto.Tienda.toString() !== tienda._id.toString()) {
            return res.status(403).json({ success: false,message: "El lote no pertenece a esta tienda" });
        }

        // Validar stock suficiente
        if (cantidad > lote.stockActual) {
            return res.status(400).json({ 
                success: false,
                message: `Stock insuficiente. Solo hay ${lote.stockActual} unidades disponibles` 
            });
        }

        const producto = lote.Producto;

        // Registrar operación y descontar stock en paralelo
        const [nuevaOperacion] = await Promise.all([
            Operacion.create({
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
                        codigoInterno: producto.codigoInterno,
                        codigoBarras: producto.codigoBarras || null
                    }
                }
            }),
            LoteProducto.findByIdAndUpdate(loteId, {
                $inc: { stockActual: -cantidad }
            })
        ]);

        return res.status(201).json({
            success: true,
            message: "Operación registrada correctamente",
            data: {
                id: nuevaOperacion._id,
                razon: nuevaOperacion.razon,
                descripcion: nuevaOperacion.descripcion,
                cantidad: nuevaOperacion.cantidad,
                stockRestante: lote.stockActual - cantidad,
                producto: {
                    nombre: producto.nombre,
                    codigoInterno: producto.codigoInterno
                }
            }
        });

    } catch (error) {
        return res.status(500).json({ message: error.message || "Error al registrar operación" });
    }
};

module.exports = { registrarOperacion };