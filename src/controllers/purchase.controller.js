const purchaseService = require("../services/purchase.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { created, success } = require("../utils/handleResponse");
const { requireUserContext, requireStore, toBoolean, toPositiveInteger } = require("../utils/validators");

const registrarCompra = asyncHandler(async (req, res) => {
    const context = requireUserContext(req);
    const data = await purchaseService.createPurchase({
        ...context,
        body: req.body
    });

    return created(res, {
        message: "Compra registrada correctamente",
        data
    });
});

const listarCompras = asyncHandler(async (req, res) => {
    const result = await purchaseService.listPurchases(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay compras registradas" : "Compras obtenidas correctamente",
        data: { compras: result.compras }
    });
});

const buscarCompra = asyncHandler(async (req, res) => {
    const data = await purchaseService.getPurchase({
        id: toPositiveInteger(req.params.id, "ID de compra"),
        tiendaId: requireStore(req)
    });

    return success(res, {
        message: "Compra obtenida correctamente",
        data
    });
});

const cambiarEstadoCompra = asyncHandler(async (req, res) => {
    const estado = toBoolean(req.body.estado);
    const data = await purchaseService.updatePurchaseStatus({
        id: toPositiveInteger(req.params.id, "ID de compra"),
        tiendaId: requireStore(req),
        estado
    });

    return success(res, {
        message: `Compra ${estado ? "habilitada" : "deshabilitada"} correctamente`,
        data
    });
});

module.exports = {
    registrarCompra,
    listarCompras,
    buscarCompra,
    cambiarEstadoCompra
};
