const paymentService = require("../services/payment.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { created, success } = require("../utils/handleResponse");
const { requireStore, toBoolean, toPositiveInteger } = require("../utils/validators");

const registrarMetodoPago = asyncHandler(async (req, res) => {
    const data = await paymentService.createPaymentMethod({
        tiendaId: requireStore(req),
        body: req.body
    });

    return created(res, {
        message: "Metodo de pago registrado correctamente",
        data
    });
});

const listarMetodoPago = asyncHandler(async (req, res) => {
    const result = await paymentService.listPaymentMethods(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay metodos de pago registrados" : "Metodos de pago obtenidos correctamente",
        data: { metodosPago: result.metodosPago }
    });
});

const obtenerMetodoPago = asyncHandler(async (req, res) => {
    const result = await paymentService.listActivePaymentMethods(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay metodos de pago activos" : "Metodos de pago activos obtenidos correctamente",
        data: { metodosPago: result.metodosPago }
    });
});

const buscarMetodoPago = asyncHandler(async (req, res) => {
    const data = await paymentService.getPaymentMethod({
        id: toPositiveInteger(req.params.id, "ID de metodo de pago"),
        tiendaId: requireStore(req)
    });

    return success(res, {
        message: "Metodo de pago obtenido correctamente",
        data
    });
});

const editarMetodoPago = asyncHandler(async (req, res) => {
    const data = await paymentService.updatePaymentMethod({
        id: toPositiveInteger(req.params.id, "ID de metodo de pago"),
        tiendaId: requireStore(req),
        body: req.body
    });

    return success(res, {
        message: "Metodo de pago actualizado correctamente",
        data
    });
});

const cambiarEstadoMetodoPago = asyncHandler(async (req, res) => {
    const estado = toBoolean(req.body.estado);
    const data = await paymentService.updatePaymentMethodStatus({
        id: toPositiveInteger(req.params.id, "ID de metodo de pago"),
        tiendaId: requireStore(req),
        estado
    });

    return success(res, {
        message: `Metodo de pago ${estado ? "habilitado" : "deshabilitado"} correctamente`,
        data
    });
});

module.exports = {
    registrarMetodoPago,
    listarMetodoPago,
    obtenerMetodoPago,
    buscarMetodoPago,
    editarMetodoPago,
    cambiarEstadoMetodoPago
};
