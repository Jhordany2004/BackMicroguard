const Venta = require("../models/sales.model");
const LoteProducto = require("../models/batch.model");
const Producto = require("../models/product.model");
const Cliente = require("../models/customer.model");
const MetodoPago = require("../models/payment.model");
const Tienda = require("../models/store.model");
const { handleError } = require("../utils/handleError");

const registrarVenta = async (req, res) => {
    let session = null;

    try {
        const { Cliente: clienteId, MetodoPago: metodoPagoId, detalles, comprobante } = req.body;
        const usuario = req.usuarioId;

        if (!clienteId || !metodoPagoId || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Cliente, método de pago y detalles son requeridos"
            });
        }

        const tienda = await Tienda.findOne({ Usuario: usuario });
        if (!tienda) {
            return res.status(404).json({ success: false, message: "Tienda no encontrada para el usuario" });
        }

        const [cliente, metodoPago] = await Promise.all([
            Cliente.findOne({ _id: clienteId, Tienda: tienda._id, estado: true }),
            MetodoPago.findOne({ _id: metodoPagoId, Tienda: tienda._id })
        ]);

        if (!cliente) {
            return res.status(404).json({ success: false, message: "Cliente no encontrado" });
        }

        if (!metodoPago) {
            return res.status(404).json({ success: false, message: "Método de pago no encontrado" });
        }

        session = await Venta.startSession();
        session.startTransaction();

        let precioTotal = 0;
        const detallesVenta = [];

        for (const [i, detalle] of detalles.entries()) {
            const cantidad = Number(detalle.cantidad);
            const precioUnitario = Number(detalle.precioUnitario);
            const loteId = detalle.lote;

            if (!loteId || !Number.isFinite(cantidad) || cantidad <= 0 || !Number.isFinite(precioUnitario) || precioUnitario <= 0) {
                await session.abortTransaction();
                session.endSession();
                session = null;
                return res.status(400).json({
                    success: false,
                    message: `El detalle #${i + 1} tiene datos inválidos`
                });
            }

            const loteProducto = await LoteProducto.findById(loteId).session(session);
            if (!loteProducto) {
                await session.abortTransaction();
                session.endSession();
                session = null;
                return res.status(404).json({ success: false, message: `Lote no encontrado en el detalle #${i + 1}` });
            }

            const producto = await Producto.findOne({
                _id: loteProducto.Producto,
                Tienda: tienda._id,
                estado: true
            }).session(session);

            if (!producto) {
                await session.abortTransaction();
                session.endSession();
                session = null;
                return res.status(404).json({ success: false, message: `Producto no encontrado para el detalle #${i + 1}` });
            }

            if (loteProducto.stockActual < cantidad) {
                await session.abortTransaction();
                session.endSession();
                session = null;
                return res.status(400).json({ success: false, message: `Stock insuficiente en el lote para el detalle #${i + 1}` });
            }

            await LoteProducto.findByIdAndUpdate(
                loteId,
                { $inc: { stockActual: -cantidad } },
                { session }
            );

            await Producto.findByIdAndUpdate(
                producto._id,
                { $inc: { stockTotal: -cantidad } },
                { session }
            );

            detallesVenta.push({
                lote: loteId,
                cantidad,
                precioUnitario
            });

            precioTotal += cantidad * precioUnitario;
        }

        const ventaData = {
            Tienda: tienda._id,
            Cliente: clienteId,
            MetodoPago: metodoPagoId,
            precioTotal,
            detalles: detallesVenta,
            comprobante: metodoPago.nombre !== "Efectivo" && comprobante ? comprobante : null
        };

        const nuevaVenta = await new Venta(ventaData).save({ session });

        await session.commitTransaction();
        session.endSession();
        session = null;

        return res.status(201).json({
            success: true,
            message: "Venta registrada correctamente",
            venta: nuevaVenta
        });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }

        return handleError(res, error, { message: "Error al registrar venta" });
    }
};

module.exports = {
    registrarVenta
};
