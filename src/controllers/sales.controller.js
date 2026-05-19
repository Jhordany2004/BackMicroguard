const salesService = require("../services/sales.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { created, success } = require("../utils/handleResponse");
const { requireUserContext, requireStore, toBoolean, toPositiveInteger } = require("../utils/validators");

const registrarVenta = asyncHandler(async (req, res) => {
    const context = requireUserContext(req);
    const data = await salesService.createSale({
        ...context,
        body: req.body
    });

    return created(res, {
        message: "Venta registrada correctamente",
        data
    });
});

const listarVentas = asyncHandler(async (req, res) => {
    const result = await salesService.listSales(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay ventas registradas" : "Ventas obtenidas correctamente",
        data: { ventas: result.ventas }
    });
});

const buscarVenta = asyncHandler(async (req, res) => {
    const data = await salesService.getSale({
        id: toPositiveInteger(req.params.id, "ID de venta"),
        tiendaId: requireStore(req)
    });

    return success(res, {
        message: "Venta obtenida correctamente",
        data
    });
});

const cambiarEstadoVenta = asyncHandler(async (req, res) => {
    const estado = toBoolean(req.body.estado);
    const data = await salesService.updateSaleStatus({
        id: toPositiveInteger(req.params.id, "ID de venta"),
        tiendaId: requireStore(req),
        estado
    });

    return success(res, {
        message: `Venta ${estado ? "habilitada" : "deshabilitada"} correctamente`,
        data
    });
});

module.exports = {
    registrarVenta,
    listarVentas,
    buscarVenta,
    cambiarEstadoVenta
};
