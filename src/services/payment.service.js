const paymentRepository = require("../repositories/payment.repository");
const { badRequest, notFound } = require("../utils/AppError");
const { normalizeText } = require("../utils/validators");
const { mapPostgresError } = require("../utils/postgresError");

const formatPaymentMethod = (method) => ({
    id: Number(method.id),
    nombre: method.nombre,
    estado: method.estado,
    fechaRegistro: method.fecha_registro,
    fechaModificacion: method.fecha_modificacion
});

const duplicateMessage = {
    unique: "Ya existe un metodo de pago con ese nombre"
};

const createPaymentMethod = async ({ tiendaId, body }) => {
    const nombre = normalizeText(body.nombre);

    if (!nombre) {
        throw badRequest("El nombre es obligatorio");
    }

    try {
        const method = await paymentRepository.create({ tiendaId, nombre });
        return { metodoPago: formatPaymentMethod(method) };
    } catch (error) {
        mapPostgresError(error, duplicateMessage);
    }
};

const listPaymentMethods = async (tiendaId) => {
    const methods = await paymentRepository.findAllByStore(tiendaId);
    return {
        metodosPago: methods.map(formatPaymentMethod),
        empty: methods.length === 0
    };
};

const listActivePaymentMethods = async (tiendaId) => {
    const methods = await paymentRepository.findActiveByStore(tiendaId);
    return {
        metodosPago: methods.map(formatPaymentMethod),
        empty: methods.length === 0
    };
};

const getPaymentMethod = async ({ id, tiendaId }) => {
    const method = await paymentRepository.findByIdAndStore(id, tiendaId);

    if (!method) {
        throw notFound("Metodo de pago no encontrado");
    }

    return { metodoPago: formatPaymentMethod(method) };
};

const updatePaymentMethod = async ({ id, tiendaId, body }) => {
    const nombre = normalizeText(body.nombre);

    if (!nombre) {
        throw badRequest("El nombre es obligatorio");
    }

    try {
        const method = await paymentRepository.update({ id, tiendaId, nombre });

        if (!method) {
            throw notFound("Metodo de pago no encontrado");
        }

        return { metodoPago: formatPaymentMethod(method) };
    } catch (error) {
        mapPostgresError(error, duplicateMessage);
    }
};

const updatePaymentMethodStatus = async ({ id, tiendaId, estado }) => {
    const current = await paymentRepository.findByIdAndStore(id, tiendaId);

    if (!current) {
        throw notFound("Metodo de pago no encontrado");
    }

    if (current.estado === estado) {
        throw badRequest(`El metodo de pago ya esta ${estado ? "habilitado" : "deshabilitado"}`);
    }

    const method = await paymentRepository.updateStatus({ id, tiendaId, estado });
    return { metodoPago: formatPaymentMethod(method) };
};

module.exports = {
    createPaymentMethod,
    listPaymentMethods,
    listActivePaymentMethods,
    getPaymentMethod,
    updatePaymentMethod,
    updatePaymentMethodStatus
};
