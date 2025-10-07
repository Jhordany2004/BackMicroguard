const Venta = require("../models/sales.model");
const LoteProducto = require("../models/batch.model");
const Producto = require("../models/product.model");
const Cliente = require("../models/customer.model");
const MetodoPago = require("../models/payment.model");
const Tienda = require("../models/store.model");

const registrarVenta = async (req, res) => {
    try {
        const { Cliente: clienteId, MetodoPago: metodoPagoId, detalles, comprobante } = req.body;
        const usuario = req.usuarioId;

        if (!clienteId || !metodoPagoId || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({ message: "Cliente, método de pago y detalles son requeridos" });
        }

        const tienda = await Tienda.findOne({ Usuario: usuario });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        // Obtener el método de pago para validar el tipo
        const metodoPago = await MetodoPago.findById(metodoPagoId);
        if (!metodoPago) {
            return res.status(404).json({ message: "Método de pago no encontrado" });
        }

        let precioTotal = 0;
        let detallesVenta = [];

        for (const [i, detalle] of detalles.entries()) {
            const { lote, cantidad, precioUnitario } = detalle;

            const loteProducto = await LoteProducto.findById(lote);
            if (!loteProducto) {
                return res.status(404).json({ message: `Lote no encontrado en el detalle #${i + 1}` });
            }
            if (loteProducto.stockActual < cantidad) {
                return res.status(400).json({ message: `Stock insuficiente en el lote para el detalle #${i + 1}` });
            }

            await LoteProducto.findByIdAndUpdate(
                lote,
                { $inc: { stockActual: -cantidad } }
            );

            await Producto.findByIdAndUpdate(
                producto,
                { $inc: { stockTotal: -cantidad } }
            );

            detallesVenta.push({
                lote,
                cantidad,
                precioUnitario,
                estado: true
            });

            precioTotal += cantidad * precioUnitario;
        }        
        let ventaData = {
            Tienda: tienda._id,
            Cliente: clienteId,
            MetodoPago: metodoPagoId,
            precioTotal,
            detalles: detallesVenta
        };

        if (metodoPago.nombre !== "Efectivo" && comprobante) {
            ventaData.comprobante = comprobante; // imagen
        } else {
            ventaData.comprobante = null; 
        }

        const nuevaVenta = new Venta(ventaData);

        await nuevaVenta.save();

        res.status(201).json({ message: "Venta registrada correctamente", venta: nuevaVenta });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al registrar venta" });
    }
};

module.exports = {
    registrarVenta
};