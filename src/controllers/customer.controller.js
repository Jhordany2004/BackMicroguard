const customerService = require("../services/customer.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { created, success } = require("../utils/handleResponse");
const { requireStore, toBoolean, toPositiveInteger } = require("../utils/validators");

const registrarCliente = asyncHandler(async (req, res) => {
    const data = await customerService.createCustomer({
        tiendaId: requireStore(req),
        body: req.body
    });

    return created(res, {
        message: "Cliente registrado correctamente",
        data
    });
});

const listarCliente = asyncHandler(async (req, res) => {
    const result = await customerService.listCustomers(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay clientes registrados" : "Clientes obtenidos correctamente",
        data: { clientes: result.clientes }
    });
});

const obtenerCliente = asyncHandler(async (req, res) => {
    if (req.params.id) {
        const data = await customerService.getCustomer({
            id: toPositiveInteger(req.params.id, "ID de cliente"),
            tiendaId: requireStore(req)
        });

        return success(res, {
            message: "Cliente obtenido correctamente",
            data
        });
    }

    const result = await customerService.listActiveCustomers(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay clientes activos" : "Clientes activos obtenidos correctamente",
        data: { clientes: result.clientes }
    });
});

const buscarPorDocumentoYNombre = asyncHandler(async (req, res) => {
    const result = await customerService.searchCustomers({
        tiendaId: requireStore(req),
        query: req.query
    });

    return success(res, {
        message: result.empty ? "No hay clientes activos con esos datos" : "Clientes encontrados",
        data: { clientes: result.clientes }
    });
});

const editarCliente = asyncHandler(async (req, res) => {
    const data = await customerService.updateCustomer({
        id: toPositiveInteger(req.params.id, "ID de cliente"),
        tiendaId: requireStore(req),
        body: req.body
    });

    return success(res, {
        message: "Cliente actualizado correctamente",
        data
    });
});

const cambiarEstadoCliente = asyncHandler(async (req, res) => {
    const estado = toBoolean(req.body.estado);
    const data = await customerService.updateCustomerStatus({
        id: toPositiveInteger(req.params.id, "ID de cliente"),
        tiendaId: requireStore(req),
        estado
    });

    return success(res, {
        message: `Cliente ${estado ? "habilitado" : "deshabilitado"} correctamente`,
        data
    });
});

module.exports = {
    registrarCliente,
    obtenerCliente,
    listarCliente,
    cambiarEstadoCliente,
    buscarPorDocumentoYNombre,
    editarCliente
};
